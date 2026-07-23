-- supabase/migrations/20260720121100_invite_email_binding.sql
--
-- Security hardening (review docs/review/04-biztonsag.md, finding F4):
-- previously a team invite was a pure bearer token - anyone who obtained
-- the link could join with the invite's role, and the token leaked through
-- URLs / browser history without being bound to an intended addressee.
--
-- This migration binds each invite to an email address. The redemption RPC
-- now rejects a caller whose authenticated email does not match the invite's
-- invited_email (case-insensitively). The column is NULLABLE on purpose:
-- existing pending invites created before this change have no email and must
-- keep working as bearer invites (backward compat). New invites always carry
-- an email - this is enforced in the UI, not by a NOT NULL constraint, to
-- avoid breaking old rows.

ALTER TABLE public.team_invites
  ADD COLUMN invited_email TEXT;

-- Redemption RPC: same validation as before (exists / not used / not
-- expired), plus a new check that binds the invite to invited_email. The
-- caller's email is read from auth.users inside the function (SECURITY
-- DEFINER can read the auth schema; search_path stays public and auth.users
-- is schema-qualified). Signature is unchanged, so CREATE OR REPLACE is safe;
-- the RETURNS TABLE column names (out_team_id/out_role/out_team_name) are
-- preserved exactly to keep sidestepping the 42702 ambiguity bug documented
-- in 20260720120700.
CREATE OR REPLACE FUNCTION public.redeem_team_invite(p_token text)
RETURNS TABLE(out_team_id uuid, out_role text, out_team_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.team_invites%ROWTYPE;
  v_caller_email text;
BEGIN
  SELECT * INTO v_invite FROM public.team_invites WHERE token = p_token FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_invite' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'invite_already_used' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired' USING ERRCODE = 'P0001';
  END IF;

  -- Email binding: if the invite targets a specific address, the caller's
  -- authenticated email must match it (case-insensitively). NULL invited_email
  -- means a legacy bearer invite - no email restriction.
  IF v_invite.invited_email IS NOT NULL THEN
    SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();
    IF v_caller_email IS NULL OR lower(v_caller_email) <> lower(v_invite.invited_email) THEN
      RAISE EXCEPTION 'invite_wrong_email' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_invite.team_id, auth.uid(), v_invite.role)
  ON CONFLICT (team_id, user_id) DO NOTHING;

  UPDATE public.team_invites
  SET used_at = now(), used_by = auth.uid()
  WHERE id = v_invite.id;

  RETURN QUERY SELECT v_invite.team_id, v_invite.role, t.name FROM public.teams t WHERE t.id = v_invite.team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_team_invite(text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_team_invite(text) TO authenticated;

-- Read-only lookup used by JoinTeam.jsx to render the confirm screen. Extend
-- the RETURNS TABLE with invited_email so the confirm screen can show for whom
-- the invite is intended (and give early client-side feedback on a mismatch).
-- CREATE OR REPLACE cannot change an existing function's OUT/return signature,
-- so the function must be dropped first, then recreated. A dropped function
-- also loses its grants, so REVOKE/GRANT are re-issued below.
DROP FUNCTION IF EXISTS public.get_invite_by_token(text);

CREATE FUNCTION public.get_invite_by_token(p_token text)
RETURNS TABLE(
  invite_id uuid,
  team_id uuid,
  role text,
  expires_at timestamptz,
  used_at timestamptz,
  team_name text,
  invited_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ti.id, ti.team_id, ti.role, ti.expires_at, ti.used_at, t.name, ti.invited_email
  FROM public.team_invites ti
  JOIN public.teams t ON t.id = ti.team_id
  WHERE ti.token = p_token;
$$;

REVOKE ALL ON FUNCTION public.get_invite_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO authenticated;
