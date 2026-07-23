# I1 — Dashboard widget foundation

## Status
Complete. Foundation of the customizable widget dashboard is in place: prefs table + RLS,
widget registry, prefs hook, 9 stub widgets, shared WidgetCard, and a rewritten DashboardHome
that renders the widget grid (old module grid + next-steps card removed).

## Migration
`supabase/migrations/20260723100000_user_dashboard_prefs.sql` — applied live and verified.

Table `public.user_dashboard_prefs`:
- PK `(user_id, team_id)`
- `widgets jsonb NOT NULL DEFAULT '[]'`, `updated_at timestamptz NOT NULL DEFAULT now()`
- FKs: `user_id → auth.users(id) ON DELETE CASCADE`, `team_id → public.teams(id) ON DELETE CASCADE`
- RLS enabled, 4 policies (`user_id = auth.uid()`; WITH CHECK on insert/update).

pg_policies verification:
```
         policyname         |  cmd   |          qual          |       with_check
----------------------------+--------+------------------------+------------------------
 delete own dashboard prefs | DELETE | (user_id = auth.uid()) |
 insert own dashboard prefs | INSERT |                        | (user_id = auth.uid())
 view own dashboard prefs   | SELECT | (user_id = auth.uid()) |
 update own dashboard prefs | UPDATE | (user_id = auth.uid()) | (user_id = auth.uid())
```

## Files created
- `supabase/migrations/20260723100000_user_dashboard_prefs.sql`
- `src/lib/dashboardWidgets.js` (registry + getDefaultWidgets + filterAllowedWidgets)
- `src/hooks/useDashboardPrefs.js`
- `src/pages/dashboard-home/WidgetCard.jsx`
- `src/pages/dashboard-home/widgets/` — 9 stub widgets
- `src/pages/DashboardHome.jsx` (rewritten)

## Registry (key → component → module_key)
| key | component | module_key |
|---|---|---|
| upcoming_week | UpcomingWeekWidget | calendar |
| next_match | NextMatchWidget | matches |
| weekly_attendance | WeeklyAttendanceWidget | rehab |
| rehab_status | RehabStatusWidget | rehab |
| recent_measurements | RecentMeasurementsWidget | measurement |
| leaderboard_top3 | LeaderboardTop3Widget | stats |
| season_progress | SeasonProgressWidget | macrocycle |
| team_overview | TeamOverviewWidget | players |
| quick_actions | QuickActionsWidget | null (always) |

## Default-set logic
`getDefaultWidgets(role, permissions)` returns `[{key, visible:true}, ...]` from a per-role
key list, filtered by `isModuleVisible` (quick_actions has module_key null so it always survives):
- coach: upcoming_week, next_match, weekly_attendance, rehab_status, quick_actions
- physiotherapist: weekly_attendance, rehab_status, upcoming_week
- fitness_coach: recent_measurements, leaderboard_top3, upcoming_week, quick_actions

DashboardHome resolves: saved prefs → else role defaults → filter to visible + permission-allowed
→ render registry components in list order. `filterAllowedWidgets` also gates saved prefs so a
revoked-permission widget never renders. Testreszabás button is a disabled "Hamarosan" placeholder
(editor owned by follow-up I3).

## Verification
- `npm test` — 67/67 pass.
- `npm run build` — clean.
