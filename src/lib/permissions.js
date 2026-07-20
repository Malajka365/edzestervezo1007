// src/lib/permissions.js

export const MODULES = [
  { key: 'players', name: 'Csapatok / Játékosok' },
  { key: 'macrocycle', name: 'Makrociklus Tervező' },
  { key: 'calendar', name: 'Edzésnaptár' },
  { key: 'exercises', name: 'Gyakorlat Könyvtár' },
  { key: 'templates', name: 'Edzéssablonok' },
  { key: 'matches', name: 'Mérkőzések' },
  { key: 'measurement', name: 'Mérési modul' },
  { key: 'stats', name: 'Ranglista / Progresszió' },
  { key: 'rehab', name: 'Rehabilitáció' },
]

export const ROLES = [
  { key: 'coach', name: 'Vezetőedző' },
  { key: 'fitness_coach', name: 'Erőnléti edző' },
  { key: 'physiotherapist', name: 'Gyógytornász' },
]

export const ACCESS_LEVELS = [
  { key: 'none', name: 'Nincs' },
  { key: 'view', name: 'Megtekint' },
  { key: 'edit', name: 'Szerkeszt' },
]

// A dashboard sidebar modulok id-jai (Dashboard.jsx `modules` tömb `id`
// mezője) és a jogosultsági module_key-ek közötti megfeleltetés.
// A 'home' és 'trainingload' (1RM Kalkulátor) nincs benne: mindig
// elérhető minden csapattagnak, nem íródik adatbázisba.
export const DASHBOARD_MODULE_TO_PERMISSION_KEY = {
  teams: 'players',
  macrocycle: 'macrocycle',
  calendar: 'calendar',
  exercises: 'exercises',
  templates: 'templates',
  matches: 'matches',
  measurement: 'measurement',
  leaderboard: 'stats',
  progress: 'stats',
  rehab: 'rehab',
}

// Egy adott modul_key-hez tartozó access_level alapján eldönti, látszik-e
// a sidebar-ban egyáltalán ('none' esetén nem).
export function isModuleVisible(permissions, moduleKey) {
  if (!moduleKey) return true
  return permissions?.[moduleKey] === 'view' || permissions?.[moduleKey] === 'edit'
}

// Van-e szerkesztési joga az adott modulhoz.
export function canEditModule(permissions, moduleKey) {
  if (!moduleKey) return true
  return permissions?.[moduleKey] === 'edit'
}
