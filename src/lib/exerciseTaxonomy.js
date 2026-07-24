// Központi edzés-taxonómia (a GIF-katalógushoz és a Gyakorlat Könyvtárhoz).
// A DB muscle_group kódjai; a régi 6-kódú rendszert (chest/back/...) váltja a 12-es.

export const MUSCLE_GROUPS = [
  { id: 'mell',        name: 'Mell',           color: 'bg-red-600' },
  { id: 'hat',         name: 'Hát',            color: 'bg-blue-600' },
  { id: 'vall',        name: 'Váll',           color: 'bg-yellow-600' },
  { id: 'bicepsz',     name: 'Bicepsz',        color: 'bg-purple-600' },
  { id: 'tricepsz',    name: 'Tricepsz',       color: 'bg-fuchsia-600' },
  { id: 'alkar',       name: 'Alkar',          color: 'bg-pink-600' },
  { id: 'quad',        name: 'Négyfejű comb',  color: 'bg-green-600' },
  { id: 'combhajlito', name: 'Combhajlító',    color: 'bg-emerald-600' },
  { id: 'farizom',     name: 'Farizom',        color: 'bg-teal-600' },
  { id: 'vadli',       name: 'Vádli',          color: 'bg-cyan-600' },
  { id: 'core',        name: 'Has / core',     color: 'bg-orange-600' },
  { id: 'csipo',       name: 'Csípő',          color: 'bg-lime-600' },
]

export const MUSCLE_GROUP_LABELS = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.id, g.name]))

// Régi 6-kódú értékek -> új 12-es kódok (a UI visszafelé kompatibilis marad).
export const LEGACY_MUSCLE_MAP = {
  chest: 'mell', back: 'hat', shoulders: 'vall',
  arms: 'bicepsz', legs: 'quad', core: 'core', abs: 'core',
}

export function normalizeMuscleGroup(code) {
  if (!code) return code
  return LEGACY_MUSCLE_MAP[code] || code
}

export function muscleGroupLabel(code) {
  const c = normalizeMuscleGroup(code)
  return MUSCLE_GROUP_LABELS[c] || 'Egyéb'
}

// Edzésmodalitás — külön a régi type=gym/both/ball mezőtől.
export const MODALITIES = [
  { id: 'erosites',          name: 'Erősítés' },
  { id: 'kalisztenika',      name: 'Kalisztenika' },
  { id: 'funkcionalis_hiit', name: 'Funkcionális / HIIT' },
  { id: 'nyujtas_mobilitas', name: 'Nyújtás / mobilitás' },
]
export const MODALITY_LABELS = Object.fromEntries(MODALITIES.map(m => [m.id, m.name]))

// A részletes izom-réteg szerepei (exercise_muscles.role).
export const ROLE_LABELS = {
  primary: 'Fő mozgató',
  secondary: 'Segédizom',
  stabilizer: 'Stabilizáló',
}
export const ROLE_ORDER = ['primary', 'secondary', 'stabilizer']
