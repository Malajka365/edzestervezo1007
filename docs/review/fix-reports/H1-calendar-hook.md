# H1 — Calendar data-layer extraction into `useCalendarData`

**Task:** Extract the data layer of `src/pages/Calendar.jsx` into a custom hook `src/pages/calendar/useCalendarData.js`. ZERO behavior change. Highest risk: the debounced auto-save (`saveTimeouts`).

**Pattern:** Same as MacrocyclePlanner → `useMacrocycleData` (reviewer verdict CLEAN).

---

## Step-0 MAP

| Symbol | Category | Destination |
|---|---|---|
| `seasons`, `currentSeason`, `planningData`, `trainingSessions`, `matches`, `weekLoadFactors`, `weekTacticsTechnique`, `saveTimeouts`, `loading` | Data state | **Hook** |
| `view`, `currentDate`, `showSessionModal`, `editingSession`, `selectedDateForSession`, `showQuickAddModal`, `confirmState` | UI state | **Component** |
| `fetchSeasons`, `loadPlanningData`, `loadTrainingSessions`, `loadMatches`, `loadWeekLoadFactors`, `loadWeekTacticsTechnique` | Data fetch | **Hook** |
| `saveLoadFactorToDatabase`, `saveTacticsTechniqueToDatabase` | Data write (internal) | **Hook** |
| `updateLoadFactor`, `updateTacticsTechnique` | Debounced write orchestration | **Hook** |
| `getLoadFactor`, `getTacticsTechnique` | State readers (read hook state) | **Hook** |
| `deleteTrainingSession` (raw supabase delete + reload) | Data write | **Hook** (raw) |
| `deleteTrainingSession` (confirm wrapper) | Uses `confirmState` UI state | **Component** |
| `getWeekDays`, `getDateKey` | Pure date helpers (hook needs them internally) | **Hook** (module-level, exported) |
| `getWeekNumber` | Reads `currentSeason` | **Component** (reads hook data) |
| `getDayData`, `getTrainingSessionsForDate`, `getMatchesForDate`, `hasBallTraining` | Readers of hook data | **Component** (read hook data via props) |
| `getDaysInMonth`, `navigateMonth/Week/Day`, `isToday`, `isCurrentMonth` | Pure date/UI helpers | **Component** |
| `daysOfWeek`, `daysOfWeekShort`, `trainingDayOptions` | Static config | **Component** |

---

## Per-op table

| Op | Moved to hook? | Reads UI state? | Behavior identical? |
|---|---|---|---|
| fetchSeasons | Yes | No (uses `currentDate` param) | Yes — same query/filter/order, same active-season selection, same error toast id `adat-betoltes` |
| loadPlanningData | Yes | No | Yes — same `.single()`, same setLoading, same catch fallback `{}` |
| loadTrainingSessions | Yes | No | Yes — same season-range filter/order |
| loadMatches | Yes | No | Yes — same season-range filter/order |
| loadWeekLoadFactors | Yes | No | Yes — same week-range (getWeekDays/getDateKey on `currentDate` param), same factorsMap shape |
| loadWeekTacticsTechnique | Yes | No | Yes — same 14 mapped fields |
| saveLoadFactorToDatabase | Yes | No | Yes — same switch→column map, same upsert onConflict `team_id,date`, same toast |
| saveTacticsTechniqueToDatabase | Yes | No | Yes — same upsert onConflict, same toast |
| updateLoadFactor | Yes | No | Yes — see trace below |
| updateTacticsTechnique | Yes | No | Yes — same timeoutKey `tactics-…`, same dropdown-immediate (`video_url`/`practice_game`), else 1000 ms |
| getLoadFactor / getTacticsTechnique | Yes | No | Yes — read hook maps, `|| ''` fallback |
| deleteTrainingSession (raw) | Yes | No | Yes — same delete `.eq('id')` + `loadTrainingSessions()` on success, same error toast |
| deleteTrainingSession (confirm) | Left in component | Yes (`setConfirmState`) | Yes — sets same message, action now calls hook's raw delete |

---

## Debounced `updateLoadFactor` trace (HIGH RISK — proven intact)

Component `WeekView` → prop `updateLoadFactor` (sourced from hook). Path inside hook, identical to original:

1. **State update (immediate):** `dateKey = getDateKey(date)`, `timeoutKey = \`${dateKey}-${factorType}\``. `setWeekLoadFactors(prev => ({ ...prev, [dateKey]: { ...prev[dateKey], [factorType]: value } }))` — responsive UI, unchanged.
2. **Clear existing timeout:** `if (saveTimeouts[timeoutKey]) clearTimeout(saveTimeouts[timeoutKey])` — `saveTimeouts` now lives in the hook, so the debounce reset still sees prior pending saves. Unchanged.
3. **Timeout schedule:** `delay = immediate ? 0 : 1000`. `timeoutId = setTimeout(() => { saveLoadFactorToDatabase(date, factorType, value); setSaveTimeouts(prev => { delete newTimeouts[timeoutKey]; return newTimeouts }) }, delay)`.
4. **DB save:** fires inside the timeout via hook-local `saveLoadFactorToDatabase` (upsert onConflict `team_id,date`).
5. **Bookkeeping:** `setSaveTimeouts(prev => ({ ...prev, [timeoutKey]: timeoutId }))` stores the handle; the timeout deletes its own key on completion. Unchanged.

**Cleanup on unmount:** The original component had **NO** `useEffect` cleanup clearing `saveTimeouts` on unmount. To preserve behavior EXACTLY, none was added. (Adding one would be a behavior change — deliberately avoided.)

`updateTacticsTechnique` follows the identical shape with its own `timeoutKey` prefix and dropdown-immediate rule — same trace.

---

## Verification

- **Tests:** `npm test` → **67 passed (8 files).** (The `kaboom` stack in output is the intentional `ErrorBoundary.test.jsx` throw — expected.)
- **Build:** `npm run build` → clean, `built in 13.23s`, `Calendar-*.js` emitted.
- **Line count:** `Calendar.jsx` 819 → **399**; `useCalendarData.js` **387**.
- **Hook reads zero component UI state:** confirmed — no reference to `view`, `showSessionModal`, `editingSession`, `selectedDateForSession`, `showQuickAddModal`, or `confirmState` in the hook. `currentDate` is a **prop param**, not owned there.

## Prop shapes preserved

`MonthView` / `WeekView` / `DayView` receive the same props as before; the data/readers now originate from the hook (`updateLoadFactor`, `getLoadFactor`, `getTacticsTechnique`, `updateTacticsTechnique`, `trainingSessions`, etc.), and `deleteTrainingSession` handed to `DayView` is still the component's confirm-wrapper. `canEdit` gating unchanged. `ConfirmDialog`/`confirmState` unchanged.

## Concerns

- `daysOfWeekShort` remains declared-but-unused in the component (it was already unused before this refactor — left as-is to avoid an unrelated change).
