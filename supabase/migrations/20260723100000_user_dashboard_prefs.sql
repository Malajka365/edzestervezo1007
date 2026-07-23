-- supabase/migrations/20260723100000_user_dashboard_prefs.sql
--
-- Per-user, per-team dashboard widget preferences for the customizable
-- summary dashboard (ld. docs/superpowers/specs/2026-07-23-dashboard-widgets-design.md).
--
-- `widgets` egy rendezett JSON tömb: [{"key":"upcoming_week","visible":true}, ...].
-- Nincs sor => szerepkör-alapú default (kliens oldalon, getDefaultWidgets).

CREATE TABLE public.user_dashboard_prefs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);

ALTER TABLE public.user_dashboard_prefs ENABLE ROW LEVEL SECURITY;

-- RLS: minden művelet csak a saját (user_id = auth.uid()) sorra.
CREATE POLICY "view own dashboard prefs" ON public.user_dashboard_prefs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "insert own dashboard prefs" ON public.user_dashboard_prefs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own dashboard prefs" ON public.user_dashboard_prefs
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own dashboard prefs" ON public.user_dashboard_prefs
  FOR DELETE USING (user_id = auth.uid());
