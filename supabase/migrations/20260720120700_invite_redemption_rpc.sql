-- supabase/migrations/20260720120700_invite_redemption_rpc.sql
--
-- Critical bug fix (live E2E testing): team_invites' only SELECT-capable
-- policy is "owner can manage team_invites" (owner-only), so an invited,
-- not-yet-member user cannot look up their own invite by token, and
-- team_members has no non-owner INSERT policy at all, so even the join
-- insert would be rejected by RLS. A blanket "any authenticated user can
-- SELECT team_invites" policy is NOT an acceptable fix: RLS predicates
-- cannot see the client's .eq('token', ...) filter as a gate, so such a
-- policy would let any logged-in user list every pending invite's secret
-- token/team_id/role. Instead, follow the existing SECURITY DEFINER
-- pattern (see public.has_team_access / public.is_team_member) with two
-- narrow, single-row-by-token functions.

-- Read-only lookup used by JoinTeam.jsx to render the confirm screen
-- without consuming the invite. Only ever returns the single row matching
-- the token argument - never a general "list invites" capability.
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token text)
RETURNS TABLE(
  invite_id uuid,
  team_id uuid,
  role text,
  expires_at timestamptz,
  used_at timestamptz,
  team_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ti.id, ti.team_id, ti.role, ti.expires_at, ti.used_at, t.name
  FROM public.team_invites ti
  JOIN public.teams t ON t.id = ti.team_id
  WHERE ti.token = p_token;
$$;

REVOKE ALL ON FUNCTION public.get_invite_by_token(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO authenticated;

-- Redeems an invite: validates it (exists / not used / not expired),
-- inserts the caller into team_members with the invite's role, and marks
-- the invite used - all server-side, so RLS never needs to trust the
-- client. Distinct exceptions let JoinTeam.jsx show the right message.
-- NOTE: the RETURNS TABLE columns are intentionally NOT named team_id/role
-- (matching the underlying table columns) - PL/pgSQL treats RETURNS TABLE
-- entries as OUT parameters/variables in scope for the whole function body,
-- and a bare column list like "ON CONFLICT (team_id, user_id)" below is
-- resolved against both the table column and the identically-named
-- PL/pgSQL variable, raising "column reference is ambiguous" (SQLSTATE
-- 42702). Distinct out_* names sidestep the collision entirely.
DROP FUNCTION IF EXISTS public.redeem_team_invite(text);

CREATE OR REPLACE FUNCTION public.redeem_team_invite(p_token text)
RETURNS TABLE(out_team_id uuid, out_role text, out_team_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.team_invites%ROWTYPE;
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
