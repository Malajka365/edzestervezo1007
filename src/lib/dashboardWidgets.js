// src/lib/dashboardWidgets.js
//
// A testreszabható összegző dashboard widget-regisztere.
// Ld. docs/superpowers/specs/2026-07-23-dashboard-widgets-design.md.
//
// Minden bejegyzés: { key, name, icon, module_key, component }.
//   - key: stabil azonosító (a user_dashboard_prefs.widgets tömbben és a
//     default-listákban ez szerepel).
//   - name: magyar megjelenített cím.
//   - icon: lucide-react komponens.
//   - module_key: a jogosultsághoz tartozó modul (isModuleVisible / canEditModule);
//     null => mindig látható (quick_actions).
//   - component: a widget React-komponense.
import {
  CalendarDays,
  Medal,
  UserCheck,
  Heart,
  BarChart3,
  Trophy,
  CalendarRange,
  Users,
  Zap,
} from 'lucide-react'
import { isModuleVisible } from './permissions'

import UpcomingWeekWidget from '../pages/dashboard-home/widgets/UpcomingWeekWidget'
import NextMatchWidget from '../pages/dashboard-home/widgets/NextMatchWidget'
import WeeklyAttendanceWidget from '../pages/dashboard-home/widgets/WeeklyAttendanceWidget'
import RehabStatusWidget from '../pages/dashboard-home/widgets/RehabStatusWidget'
import RecentMeasurementsWidget from '../pages/dashboard-home/widgets/RecentMeasurementsWidget'
import LeaderboardTop3Widget from '../pages/dashboard-home/widgets/LeaderboardTop3Widget'
import SeasonProgressWidget from '../pages/dashboard-home/widgets/SeasonProgressWidget'
import TeamOverviewWidget from '../pages/dashboard-home/widgets/TeamOverviewWidget'
import QuickActionsWidget from '../pages/dashboard-home/widgets/QuickActionsWidget'

// A widgetek kanonikus sorrendje (a registry sorrendje egyben az alapértelmezett
// megjelenítési sorrend is, amikor egy default-listát rendezünk).
export const DASHBOARD_WIDGETS = [
  { key: 'upcoming_week', name: 'Következő 7 nap', icon: CalendarDays, module_key: 'calendar', component: UpcomingWeekWidget },
  { key: 'next_match', name: 'Következő mérkőzés', icon: Medal, module_key: 'matches', component: NextMatchWidget },
  { key: 'weekly_attendance', name: 'Heti jelenlét', icon: UserCheck, module_key: 'rehab', component: WeeklyAttendanceWidget },
  { key: 'rehab_status', name: 'Rehab-státusz', icon: Heart, module_key: 'rehab', component: RehabStatusWidget },
  { key: 'recent_measurements', name: 'Friss mérések', icon: BarChart3, module_key: 'measurement', component: RecentMeasurementsWidget },
  { key: 'leaderboard_top3', name: 'Ranglista top 3', icon: Trophy, module_key: 'stats', component: LeaderboardTop3Widget },
  { key: 'season_progress', name: 'Szezon-állás', icon: CalendarRange, module_key: 'macrocycle', component: SeasonProgressWidget },
  { key: 'team_overview', name: 'Csapat-áttekintő', icon: Users, module_key: 'players', component: TeamOverviewWidget },
  { key: 'quick_actions', name: 'Gyors műveletek', icon: Zap, module_key: null, component: QuickActionsWidget },
]

// Gyors kulcs -> registry-bejegyzés keresés.
export const WIDGETS_BY_KEY = Object.fromEntries(
  DASHBOARD_WIDGETS.map((w) => [w.key, w])
)

// Szerepkör-alapú alapértelmezett widget-készletek (ld. spec).
// Csak a keyeket soroljuk fel; a láthatóságot / sorrendet a getDefaultWidgets adja.
const DEFAULT_KEYS_BY_ROLE = {
  coach: ['upcoming_week', 'next_match', 'weekly_attendance', 'rehab_status', 'quick_actions'],
  physiotherapist: ['weekly_attendance', 'rehab_status', 'upcoming_week'],
  fitness_coach: ['recent_measurements', 'leaderboard_top3', 'upcoming_week', 'quick_actions'],
}

/**
 * A szerepkör alapértelmezett widget-listája, jogosultsággal szűrve.
 *
 * Visszaad: [{ key, visible: true }, ...] a szerepkörhöz definiált sorrendben,
 * kihagyva azokat, amelyeknek a module_key-e nem legalább `view` a
 * felhasználónak (a quick_actions module_key === null, ezért mindig marad).
 *
 * @param {string|null|undefined} role - a felhasználó csapat-szerepköre.
 * @param {Record<string,string>} permissions - module_key -> access_level.
 * @returns {{key:string, visible:true}[]}
 */
export function getDefaultWidgets(role, permissions) {
  const keys = DEFAULT_KEYS_BY_ROLE[role] || []
  return keys
    .filter((key) => {
      const entry = WIDGETS_BY_KEY[key]
      return entry && isModuleVisible(permissions, entry.module_key)
    })
    .map((key) => ({ key, visible: true }))
}

/**
 * Azok a registry-bejegyzések, amelyeket a felhasználó egyáltalán láthat
 * (a module_key-e legalább `view`, vagy null). A szerkesztő és a renderelés
 * ezzel szűri, hogy tiltott widget ne kerüljön elő mentett prefs-ből sem.
 *
 * @param {Record<string,string>} permissions - module_key -> access_level.
 * @returns a DASHBOARD_WIDGETS engedélyezett részhalmaza (regisztry sorrendben).
 */
export function filterAllowedWidgets(permissions) {
  return DASHBOARD_WIDGETS.filter((w) => isModuleVisible(permissions, w.module_key))
}
