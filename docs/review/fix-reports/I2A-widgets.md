# I2A — Dashboard widgets (schedule, attendance, rehab, quick actions)

Implemented 5 widget files in `src/pages/dashboard-home/widgets/`:

1. **UpcomingWeekWidget** — `training_sessions` (id, date, start_time, type, location) + `matches` (id, date, time, opponent), both `.eq('team_id')`, `date >= today`, `date < today+7`, merged/sorted by date+time, sliced to 6. Empty: "Nincs esemény a következő 7 napban."
2. **NextMatchWidget** — `matches` (id, date, time, opponent, home_away), `date >= today`, order asc, limit 1. Empty: "Nincs közelgő mérkőzés."
3. **WeeklyAttendanceWidget** — `player_attendance` (id, status), `.eq('team_id')`, current Mon–Sun range, ratio = jelen/total, breakdown via `ATTENDANCE_STATUSES`/`getStatusLabel`/`getStatusColor`. Empty: "Nincs jelenléti adat ezen a héten."
4. **RehabStatusWidget** — `player_anamnesis` (id, player_id, admission_date, embedded `players(name)`), `.eq('team_id')`, count exact + 3 most recent by `admission_date` desc. Empty: "Nincs aktív rehabilitációs eset."
5. **QuickActionsWidget** — no fetch; `useNavigate` buttons filtered by `canEditModule(currentUserPermissions, 'calendar'|'measurement'|'players')`. Empty: "Nincs elérhető gyorsművelet."

Column names verified by reading real query sites, not guessed: `matches` from `src/pages/Matches.jsx` + `useCalendarData.js`; `training_sessions.type` values (`gym`/`ball`/`tactic`/`other`) from `src/components/TrainingSessionModal.jsx`; `player_attendance` (date/status/event_time, embedded `players(...)`) from `src/components/TeamAttendanceCalendar.jsx`; `player_anamnesis.admission_date`/`player_id` from `src/pages/Rehabilitation.jsx` + `src/pages/PlayerProfileRehab.jsx`.

`npm test` → 67 passed. `npm run build` → clean.

No concerns.
