// src/lib/dashboardWidgets.js
//
// A Kezdőlap widget-típusainak React-komponensei. A leíró adatok (név, ikon,
// méretek, beállítások, jogosultság) a komponens-mentes src/lib/widgetCatalog.js
// fájlban vannak; az elrendezés-logika: src/lib/dashboardLayout.js.
//
// Amelyik katalógus-típusnak itt még nincs komponense, azt a Kezdőlap
// "Hamarosan" helyőrzővel mutatja.
import UpcomingWeekWidget from '../pages/dashboard-home/widgets/UpcomingWeekWidget'
import NextMatchWidget from '../pages/dashboard-home/widgets/NextMatchWidget'
import WeeklyAttendanceWidget from '../pages/dashboard-home/widgets/WeeklyAttendanceWidget'
import RehabStatusWidget from '../pages/dashboard-home/widgets/RehabStatusWidget'
import RecentMeasurementsWidget from '../pages/dashboard-home/widgets/RecentMeasurementsWidget'
import LeaderboardTop3Widget from '../pages/dashboard-home/widgets/LeaderboardTop3Widget'
import SeasonProgressWidget from '../pages/dashboard-home/widgets/SeasonProgressWidget'
import TeamOverviewWidget from '../pages/dashboard-home/widgets/TeamOverviewWidget'
import QuickActionsWidget from '../pages/dashboard-home/widgets/QuickActionsWidget'
import TodaySessionWidget from '../pages/dashboard-home/widgets/TodaySessionWidget'
import AvailabilityWidget from '../pages/dashboard-home/widgets/AvailabilityWidget'
import TodosWidget from '../pages/dashboard-home/widgets/TodosWidget'
import MeasurementTrendWidget from '../pages/dashboard-home/widgets/MeasurementTrendWidget'
import MeasurementCoverageWidget from '../pages/dashboard-home/widgets/MeasurementCoverageWidget'
import WeeklyLoadWidget from '../pages/dashboard-home/widgets/WeeklyLoadWidget'
import FavoriteExercisesWidget from '../pages/dashboard-home/widgets/FavoriteExercisesWidget'
import NoteWidget from '../pages/dashboard-home/widgets/NoteWidget'

export const WIDGET_COMPONENTS = {
  upcoming_week: UpcomingWeekWidget,
  next_match: NextMatchWidget,
  weekly_attendance: WeeklyAttendanceWidget,
  rehab_status: RehabStatusWidget,
  recent_measurements: RecentMeasurementsWidget,
  leaderboard_top3: LeaderboardTop3Widget,
  season_progress: SeasonProgressWidget,
  team_overview: TeamOverviewWidget,
  quick_actions: QuickActionsWidget,
  today_session: TodaySessionWidget,
  availability: AvailabilityWidget,
  todos: TodosWidget,
  measurement_trend: MeasurementTrendWidget,
  measurement_coverage: MeasurementCoverageWidget,
  weekly_load: WeeklyLoadWidget,
  favorite_exercises: FavoriteExercisesWidget,
  note: NoteWidget,
}
