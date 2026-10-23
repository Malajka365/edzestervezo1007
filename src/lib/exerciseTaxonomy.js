// Központi edzés-taxonómia (a GIF-katalógushoz és a Gyakorlat Könyvtárhoz).
// A DB muscle_group kódjai; a régi 6-kódú rendszert (chest/back/...) váltja a 12-es.

export const MUSCLE_GROUPS = [
  { id: 'mell',        name: 'Mell' },
  { id: 'hat',         name: 'Hát' },
  { id: 'vall',        name: 'Váll' },
  { id: 'bicepsz',     name: 'Bicepsz' },
  { id: 'tricepsz',    name: 'Tricepsz' },
  { id: 'alkar',       name: 'Alkar' },
  { id: 'quad',        name: 'Négyfejű comb' },
  { id: 'combhajlito', name: 'Combhajlító' },
  { id: 'farizom',     name: 'Farizom' },
  { id: 'vadli',       name: 'Vádli' },
  { id: 'core',        name: 'Has / core' },
  { id: 'csipo',       name: 'Csípő' },
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
