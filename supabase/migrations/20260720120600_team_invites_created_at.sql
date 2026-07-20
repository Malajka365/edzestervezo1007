-- supabase/migrations/20260720120600_team_invites_created_at.sql
-- Task 9's TeamMembersPanel.jsx queries and orders by team_invites.created_at,
-- but Task 1's schema migration never added this column. Found during live
-- end-to-end regression testing (PostgREST error 42703: column does not exist).

ALTER TABLE public.team_invites
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
