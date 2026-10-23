// src/lib/navigation.js
// A dashboard navigációs modell: csoportok, menüpontok, mobil tab-ok.
// Csak adat és tiszta függvények, UI-t nem tartalmaz.

import {
  Sun,
  Trophy,
  CalendarRange,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  Activity,
  Medal,
  TrendingUp,
  Calculator,
  Users,
  HeartPulse,
} from 'lucide-react'
import { isModuleVisible } from './permissions'

// A `permissionKey` a permissions.js module_key-je; `null` = mindig látszik.
export const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Áttekintés',
    items: [
      { id: 'home', label: 'Kezdőlap', path: '/dashboard', icon: Sun, permissionKey: null, end: true },
      { id: 'matches', label: 'Mérkőzések', path: '/dashboard/merkozesek', icon: Trophy, permissionKey: 'matches' },
    ],
  },
  {
    id: 'planning',
    label: 'Tervezés',
    items: [
      { id: 'macrocycle', label: 'Szezonterv', path: '/dashboard/makrociklus', icon: CalendarRange, permissionKey: 'macrocycle' },
      { id: 'calendar', label: 'Naptár', path: '/dashboard/naptar', icon: CalendarDays, permissionKey: 'calendar' },
      { id: 'templates', label: 'Edzéssablonok', path: '/dashboard/sablonok', icon: ClipboardList, permissionKey: 'templates' },
    ],
  },
  {
    id: 'content',
    label: 'Edzéstartalom',
    items: [
      { id: 'exercises', label: 'Gyakorlattár', path: '/dashboard/gyakorlatok', icon: Dumbbell, permissionKey: 'exercises' },
    ],
  },
  {
    id: 'performance',
    label: 'Teljesítmény',
    items: [
      { id: 'measurement', label: 'Mérések', path: '/dashboard/meresek', icon: Activity, permissionKey: 'measurement' },
      { id: 'leaderboard', label: 'Ranglista', path: '/dashboard/ranglista', icon: Medal, permissionKey: 'stats' },
      { id: 'progress', label: 'Progresszió', path: '/dashboard/progresszio', icon: TrendingUp, permissionKey: 'stats' },
      { id: 'trainingload', label: '1RM táblázat', path: '/dashboard/kalkulator', icon: Calculator, permissionKey: null },
    ],
  },
  {
    id: 'team',
    label: 'Csapat',
    items: [
      { id: 'teams', label: 'Játékosok', path: '/dashboard/csapatok', icon: Users, permissionKey: 'players' },
      { id: 'rehab', label: 'Egészség', path: '/dashboard/rehabilitacio', icon: HeartPulse, permissionKey: 'rehab' },
    ],
  },
]

// A profil a menün kívül, a felhasználói blokkból érhető el.
export const PROFILE_ITEM = { id: 'profile', label: 'Profil', path: '/dashboard/profil' }

// Mobil alsó sáv: az ötödik hely mindig a "Több" menüé.
export const MOBILE_TAB_IDS = ['home', 'calendar', 'teams', 'exercises']

// Szerepkör szerinti navigáció. A `player` szerep később ide kerül külön csoportlistával.
export function getNavForRole(role) {
  switch (role) {
    case 'coach':
    case 'fitness_coach':
    case 'physiotherapist':
    case null:
      return NAV_GROUPS
    default:
      return NAV_GROUPS
  }
}

// Jogosultság szerint szűri a csoportokat. Betöltés alatt minden pont látszik,
// hogy ne villanjon föl a menü üres állapota. Új tömböket ad vissza.
export function filterNav(groups, permissions, permissionsLoading) {
  if (permissionsLoading) {
    return groups.map((group) => ({ ...group, items: [...group.items] }))
  }
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => isModuleVisible(permissions, item.permissionKey)),
    }))
    .filter((group) => group.items.length > 0)
}

// A látható mobil tab-ok a MOBILE_TAB_IDS sorrendjében.
export function getMobileTabs(filteredGroups) {
  const visible = filteredGroups.flatMap((group) => group.items)
  return MOBILE_TAB_IDS.map((id) => visible.find((item) => item.id === id)).filter(Boolean)
}

// Útvonal alapján keresi a menüpontot. A záró perjelet figyelmen kívül hagyja.
export function findNavItemByPath(pathname) {
  if (!pathname) return null
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (normalized === PROFILE_ITEM.path) return PROFILE_ITEM
  for (const group of NAV_GROUPS) {
    const item = group.items.find((candidate) => candidate.path === normalized)
    if (item) return item
  }
  return null
}

// A menüpont csoportja, vagy null (pl. a profil vagy ismeretlen id).
export function getGroupOfItem(itemId) {
  return NAV_GROUPS.find((group) => group.items.some((item) => item.id === itemId)) ?? null
}
