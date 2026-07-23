# F6-2: Calendar.jsx view decomposition

Mechanical extraction of the 3 mutually-exclusive view render blocks from
`src/pages/Calendar.jsx` into standalone components. Zero behavior change — all
Tailwind classes, Hungarian text, conditional logic, and `canEdit` gating kept
byte-identical. Data-fetching, save-to-DB logic (`saveLoadFactorToDatabase`,
`saveTacticsTechniqueToDatabase`, debounce timeouts), `fetchSeasons`, useEffects,
header/toolbar, and the two modal wrapper blocks stay in the parent.

## Results

- `npm run build`: clean (built in ~10.6s, no errors)
- Parent: **1548 → 819 lines**
- New files:
  - `src/pages/calendar/MonthView.jsx` — 124 lines
  - `src/pages/calendar/WeekView.jsx` — 533 lines
  - `src/pages/calendar/DayView.jsx` — 170 lines
- All 19 helper/save functions remain defined in the parent (verified `const X =` count = 1 each); only JSX moved.
- Icons used solely by a view (`Home`, `Plane`, `Star`, `Plus`, `Edit`, `Trash2`) are imported directly inside each component and removed from the parent import (external library, not parent state). `CalendarIcon` stays in both (parent nav tab + DayView empty-state).

## Prop audit

Automated diff: for every view, declared props == props passed by parent, every
declared prop is used in the body, and no parent-defined identifier is referenced
in the body without being a prop (would crash). Icons are direct imports, not props.

### MonthView (11 props — all matched)

| Identifier | Kind | In component props | Passed by parent |
|---|---|---|---|
| currentDate | state | ✓ | ✓ |
| daysOfWeek | constant | ✓ | ✓ |
| trainingDayOptions | constant | ✓ | ✓ |
| getDaysInMonth | helper | ✓ | ✓ |
| getDayData | helper | ✓ | ✓ |
| getTrainingSessionsForDate | helper | ✓ | ✓ |
| getMatchesForDate | helper | ✓ | ✓ |
| isToday | helper | ✓ | ✓ |
| isCurrentMonth | helper | ✓ | ✓ |
| setCurrentDate | setter | ✓ | ✓ |
| setView | setter | ✓ | ✓ |
| Home, Plane | icons | imported in component | n/a |

### WeekView (16 props — all matched)

| Identifier | Kind | In component props | Passed by parent |
|---|---|---|---|
| currentDate | state | ✓ | ✓ |
| daysOfWeek | constant | ✓ | ✓ |
| trainingDayOptions | constant | ✓ | ✓ |
| getWeekDays | helper | ✓ | ✓ |
| getDayData | helper | ✓ | ✓ |
| getTrainingSessionsForDate | helper | ✓ | ✓ |
| getMatchesForDate | helper | ✓ | ✓ |
| isToday | helper | ✓ | ✓ |
| setCurrentDate | setter | ✓ | ✓ |
| setView | setter | ✓ | ✓ |
| hasBallTraining | helper | ✓ | ✓ |
| canEdit | const | ✓ | ✓ |
| updateLoadFactor | helper | ✓ | ✓ |
| getLoadFactor | helper | ✓ | ✓ |
| getTacticsTechnique | helper | ✓ | ✓ |
| updateTacticsTechnique | helper | ✓ | ✓ |
| Home, Plane, Star | icons | imported in component | n/a |

### DayView (10 props — all matched)

| Identifier | Kind | In component props | Passed by parent |
|---|---|---|---|
| currentDate | state | ✓ | ✓ |
| trainingDayOptions | constant | ✓ | ✓ |
| getDayData | helper | ✓ | ✓ |
| getTrainingSessionsForDate | helper | ✓ | ✓ |
| getMatchesForDate | helper | ✓ | ✓ |
| canEdit | const | ✓ | ✓ |
| setSelectedDateForSession | setter | ✓ | ✓ |
| setEditingSession | setter | ✓ | ✓ |
| setShowSessionModal | setter | ✓ | ✓ |
| deleteTrainingSession | helper | ✓ | ✓ |
| Plus, Edit, Trash2, CalendarIcon | icons | imported in component | n/a |

**All three views: declared == passed, no missing, no extra, no undeclared free variables.**

## Concerns

None. Build clean; prop audit fully matched; debounced load-factor/tactics save
behavior preserved (views call `updateLoadFactor`/`updateTacticsTechnique` passed
as props — the save logic and timeouts stay in the parent).
