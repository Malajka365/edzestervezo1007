# F2a — Replace confirm() dialogs with ConfirmDialog modal component

## New files

- `src/components/ui/ConfirmDialog.jsx` — reusable confirmation modal (props: `open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `danger`, `onConfirm`, `onCancel`; Escape key cancels). Idiom documented at top of the file: local per-component state `const [confirmState, setConfirmState] = useState(null)` holding `{ message, action }`, applied consistently at every call site.

## Converted call sites

| File | confirm() count before | Converted |
|---|---|---|
| `src/components/AttendanceCalendar.jsx` | 1 | Yes |
| `src/components/TeamAttendanceCalendar.jsx` | 1 | Yes |
| `src/components/TeamMembersPanel.jsx` | 2 | Yes |
| `src/components/TrainingLocations.jsx` | 1 | Yes |
| `src/pages/Calendar.jsx` | 1 | Yes |
| `src/pages/ExerciseLibrary.jsx` | 1 | Yes |
| `src/pages/MacrocyclePlanner.jsx` | 1 | Yes |
| `src/pages/Matches.jsx` | 1 (dynamic message w/ macrocycle warning) | Yes |
| `src/pages/Measurements.jsx` | 1 | Yes |
| `src/pages/PlayerProfileRehab.jsx` | 2 | Yes |
| `src/pages/Teams.jsx` | 2 | Yes |
| `src/pages/TrainingTemplates.jsx` | 1 | Yes |
| `src/pages/Dashboard.jsx` | 0 | N/A — untouched (another agent's file); no confirm() found in it anyway |

Total converted: 15/15. All Hungarian message texts kept verbatim, including the two-part dynamic message in `Matches.jsx` (newlines preserved via `whitespace-pre-line` in `ConfirmDialog`). Deletion logic, toasts, and state updates unchanged — only moved from a synchronous `if (!confirm()) return` guard into an `onConfirm` callback.

## Verification

- `grep -rn "confirm(" src/` → zero real call sites; only two comment mentions inside `ConfirmDialog.jsx`'s own usage-example doc comment.
- `npm run build` → clean, no errors.
