# F6-4 ExerciseLibrary modal extraction

**Status:** DONE — build clean.

**Parent:** 1350 → 742 lines.

**Approach:** A (two separate verbatim components). Create vs edit are NOT
structurally identical: name `<input>` and description `<textarea>` carry
placeholders in create but not edit; labels differ (block-on-own-line vs
compact inline); header title, submit label, and cancel/close handlers differ.
Per the "any field-level/layout difference → do not unify" rule, unifying would
risk a behavior change, so each modal was extracted byte-for-byte.

**New files:**
- `src/pages/exercise-library/CreateExerciseModal.jsx` — 287 lines
- `src/pages/exercise-library/EditExerciseModal.jsx` — 275 lines

Guards kept in parent: `{showCreateModal && <CreateExerciseModal .../>}` and
`{showEditModal && editingExercise && <EditExerciseModal .../>}` (secondary
`editingExercise` guard preserved).

## Prop audit — CreateExerciseModal

| Identifier used | Declared prop | Passed by parent |
|---|---|---|
| setShowCreateModal | ✓ | ✓ |
| newExercise | ✓ | ✓ |
| setNewExercise | ✓ | ✓ |
| createExercise | ✓ | ✓ |
| loading | ✓ | ✓ |

`X`, `Plus` imported directly from `lucide-react` in the component. All ✓.

## Prop audit — EditExerciseModal

| Identifier used | Declared prop | Passed by parent |
|---|---|---|
| setShowEditModal | ✓ | ✓ |
| editingExercise | ✓ | ✓ |
| setEditingExercise | ✓ | ✓ |
| updateExercise | ✓ | ✓ |
| loading | ✓ | ✓ |

`X`, `Plus` imported directly from `lucide-react` in the component. All ✓.

**Concerns:** None. `X`/`Plus` still used in parent (header + detail modal), so
parent imports remain valid. No untouched logic changed.
