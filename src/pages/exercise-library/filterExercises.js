import { normalizeMuscleGroup } from '../../lib/exerciseTaxonomy'

// Pure szűrő. Böngészéskor (üres searchTerm) egy izomcsoport; keresésnél név +
// izomnév illesztés minden csoporton. A rátét szűrők mindkét módban érvényesek.
export function filterExercises(exercises, opts) {
  const {
    searchTerm = '', muscleGroup, difficulty = 'all', modality = 'all',
    favoritesOnly = false, favorites = [], muscleSearchByExercise = {},
  } = opts || {}

  const getBlob = (id) =>
    muscleSearchByExercise instanceof Map
      ? (muscleSearchByExercise.get(id) || '')
      : (muscleSearchByExercise[id] || '')

  const q = searchTerm.trim().toLowerCase()
  let out = exercises

  if (q) {
    out = out.filter((ex) =>
      ex.name?.toLowerCase().includes(q) ||
      ex.name_en?.toLowerCase().includes(q) ||
      getBlob(ex.id).includes(q)
    )
  } else {
    out = out.filter((ex) => normalizeMuscleGroup(ex.muscle_group) === muscleGroup)
  }

  if (difficulty !== 'all') out = out.filter((ex) => ex.difficulty === difficulty)
  if (modality !== 'all') out = out.filter((ex) => (ex.modality || 'erosites') === modality)
  if (favoritesOnly) out = out.filter((ex) => favorites.includes(ex.id))

  return out
}
