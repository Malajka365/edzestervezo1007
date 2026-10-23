// src/lib/commands.js
// A parancspaletta parancsai és a keresés. Csak adat és tiszta függvények.

import { CalendarPlus, Plus, User, UserPlus } from 'lucide-react'
import { PROFILE_ITEM } from './navigation'

// A műveletek csak navigálnak a céloldalra, űrlapot nem nyitnak.
// Csak akkor kerülnek be, ha a céloldal a felhasználónak látható.
const ACTIONS = [
  { id: 'new-measurement', label: 'Új mérés rögzítése', path: '/dashboard/meresek', icon: Plus, keywords: ['meres', '1rm'] },
  { id: 'new-training', label: 'Edzés hozzáadása a naptárhoz', path: '/dashboard/naptar', icon: CalendarPlus, keywords: ['edzes', 'uj'] },
  { id: 'new-exercise', label: 'Új gyakorlat', path: '/dashboard/gyakorlatok', icon: Plus, keywords: [] },
  { id: 'add-player', label: 'Játékos hozzáadása', path: '/dashboard/csapatok', icon: UserPlus, keywords: [] },
]

// Command = { id, label, group: 'Oldalak' | 'Műveletek', path, icon, keywords }
export function buildCommands(groups) {
  const items = groups.flatMap((group) => group.items)

  const pages = items.map((item) => ({
    id: `page-${item.id}`,
    label: item.label,
    group: 'Oldalak',
    path: item.path,
    icon: item.icon,
    keywords: [],
  }))
  pages.push({
    id: `page-${PROFILE_ITEM.id}`,
    label: PROFILE_ITEM.label,
    group: 'Oldalak',
    path: PROFILE_ITEM.path,
    icon: User,
    keywords: [],
  })

  const visiblePaths = new Set(items.map((item) => item.path))
  const actions = ACTIONS.filter((action) => visiblePaths.has(action.path)).map((action) => ({
    ...action,
    id: `action-${action.id}`,
    group: 'Műveletek',
  }))

  return [...pages, ...actions]
}

// Kisbetűsít és eltávolítja az ékezeteket.
export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

// Minden szóköz-elválasztott keresőszónak szerepelnie kell a címkében vagy a kulcsszavakban.
export function filterCommands(commands, query) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return commands
  return commands.filter((command) => {
    const haystack = normalize(`${command.label} ${command.keywords.join(' ')}`)
    return tokens.every((token) => haystack.includes(token))
  })
}
