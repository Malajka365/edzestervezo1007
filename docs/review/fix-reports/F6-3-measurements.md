# F6-3 — Measurements Modal Extraction

Pure mechanical decomposition of `src/pages/Measurements.jsx`. The 5 modal JSX
blocks were extracted verbatim into `src/pages/measurements/`. No handler,
helper, data-fetch, or gating logic was moved — modals receive everything as
props. `{showX && <Modal/>}` guards remain in the parent (identical
short-circuit semantics).

## Results

- `npm run build`: clean (`✓ built in 10.45s`).
- Parent: 1224 → 683 lines.
- New files: ExerciseModal 74, MeasurementModal 132, PlayerSelectionModal 101,
  TeamMeasurementModal 259, ExerciseManagementModal 87.
- Removed now-unused lucide icons from parent import: `X`, `Save`, `Edit2`,
  `Trash2` (all only referenced inside the extracted blocks). `TrendingUp`,
  `Settings`, `Dumbbell`, `Users` remain — still used by the table/header.

## Prop-audit tables

### 1. ExerciseModal.jsx

| Identifier | Declared as prop? | Passed by parent? |
|---|---|---|
| editingExercise | ✓ | ✓ |
| exerciseForm | ✓ | ✓ |
| setExerciseForm | ✓ | ✓ |
| setShowExerciseModal | ✓ | ✓ |
| setEditingExercise | ✓ | ✓ |
| handleCreateExercise | ✓ | ✓ |
| X, Save | own import | — |

### 2. MeasurementModal.jsx

| Identifier | Declared as prop? | Passed by parent? |
|---|---|---|
| players | ✓ | ✓ |
| exercises | ✓ | ✓ |
| measurementForm | ✓ | ✓ |
| setMeasurementForm | ✓ | ✓ |
| setShowMeasurementModal | ✓ | ✓ |
| handleCreateMeasurement | ✓ | ✓ |
| calculate1RM | ✓ | ✓ |
| X, Save, TrendingUp | own import | — |

### 3. PlayerSelectionModal.jsx

| Identifier | Declared as prop? | Passed by parent? |
|---|---|---|
| players | ✓ | ✓ |
| selectedPlayers | ✓ | ✓ |
| toggleAllPlayers | ✓ | ✓ |
| togglePlayerSelection | ✓ | ✓ |
| proceedToTeamMeasurement | ✓ | ✓ |
| setShowPlayerSelectionModal | ✓ | ✓ |
| X, Users | own import | — |

### 4. TeamMeasurementModal.jsx

| Identifier | Declared as prop? | Passed by parent? |
|---|---|---|
| players | ✓ | ✓ |
| exercises | ✓ | ✓ |
| selectedPlayers | ✓ | ✓ |
| teamMeasurementForm | ✓ | ✓ |
| setTeamMeasurementForm | ✓ | ✓ |
| setShowTeamMeasurementModal | ✓ | ✓ |
| handleCreateTeamMeasurement | ✓ | ✓ |
| updatePlayerData | ✓ | ✓ |
| calculate1RM | ✓ | ✓ |
| X, Save, Users | own import | — |

### 5. ExerciseManagementModal.jsx

| Identifier | Declared as prop? | Passed by parent? |
|---|---|---|
| exercises | ✓ | ✓ |
| canEdit | ✓ | ✓ |
| openEditExercise | ✓ | ✓ |
| handleDeleteExercise | ✓ | ✓ |
| setShowExerciseManagementModal | ✓ | ✓ |
| X, Dumbbell, Edit2, Trash2 | own import | — |

All identifiers matched. `canEdit` gating inside ExerciseManagementModal
(edit/delete buttons) and `disabled` states preserved byte-identical.
`ConfirmDialog`/`confirmState` untouched in parent.
