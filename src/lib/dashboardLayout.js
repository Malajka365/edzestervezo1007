// A Kezdőlap elrendezése: { id, type, w, h, settings } elemek tömbje, a
// user_dashboard_prefs.widgets JSONB-ben. A régi { key, visible } alakot
// beolvasáskor átalakítjuk; mentéskor a régi mezőket is visszaírjuk, hogy egy
// régebbi app-verzió se mutasson üres kezdőlapot.
import { isModuleVisible } from './permissions'
import { WIDGET_CATALOG } from './widgetCatalog'

// [type, w, h, settings?] — a spec szerinti szerepkör-alap.
export const DEFAULT_LAYOUTS = {
  coach: [
    ['today_session', 2, 2],
    ['availability', 1, 2],
    ['next_match', 1, 1],
    ['todos', 1, 1],
    ['upcoming_week', 2, 1, { days: '7', types: 'all' }],
    ['weekly_attendance', 1, 1],
    ['season_progress', 1, 1],
    ['quick_actions', 2, 1, { set: 'coach' }],
  ],
  fitness_coach: [
    ['today_session', 2, 1, { detail: 'compact' }],
    ['leaderboard_top3', 1, 2, { metric: 'rel', n: '5' }],
    ['measurement_coverage', 1, 2],
    ['measurement_trend', 2, 2, { who: 'team', per: '8' }],
    ['recent_measurements', 2, 1, { n: '3' }],
    ['weekly_load', 2, 1],
    ['quick_actions', 2, 1, { set: 'fit' }],
  ],
  physiotherapist: [
    ['availability', 2, 2, { show: 'issues' }],
    ['rehab_status', 2, 1],
    ['todos', 1, 1, { src: 'health' }],
    ['weekly_attendance', 1, 1, { period: 'month' }],
    ['quick_actions', 2, 1, { set: 'physio' }],
  ],
}

const MAX_W = 4
const MAX_H = 3

const clamp = (v, min, max) => Math.max(min, Math.min(max, Number.isFinite(+v) ? +v : min))

function makeItem(id, type, w, h, settings) {
  const def = WIDGET_CATALOG[type]
  return {
    id,
    type,
    w: clamp(w ?? def.defaultSize[0], def.minSize[0], MAX_W),
    h: clamp(h ?? def.defaultSize[1], def.minSize[1], MAX_H),
    settings: { ...def.defaultSettings, ...(settings || {}) },
  }
}

const canSee = (perms, type) => {
  const def = WIDGET_CATALOG[type]
  return !!def && !def.comingSoon && isModuleVisible(perms, def.module_key)
}

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function defaultLayout(role, perms) {
  const spec = DEFAULT_LAYOUTS[role] || DEFAULT_LAYOUTS.coach
  return spec.filter(([type]) => canSee(perms, type)).map(([type, w, h, s]) => makeItem(type, type, w, h, s))
}

// null / nem tömb => szerepkör-alap; [] => szándékosan üres kezdőlap marad.
export function normalizeLayout(saved, role, perms) {
  if (!Array.isArray(saved)) return defaultLayout(role, perms)
  const items = []
  for (const raw of saved) {
    if (!raw || typeof raw !== 'object') continue
    if (raw.type) {
      if (!WIDGET_CATALOG[raw.type]) continue
      items.push(makeItem(raw.id || newId(), raw.type, raw.w, raw.h, raw.settings))
    } else if (raw.key) {
      if (raw.visible === false || !WIDGET_CATALOG[raw.key]) continue
      items.push(makeItem(raw.key, raw.key))
    }
  }
  return items
}

// Megjelenítéskor: csak ami látható jogosultsággal és nem "hamarosan".
// A tárolt elrendezésből nem törlünk — ha a jog visszajön, a widget is.
export function visibleItems(items, perms) {
  return (items || []).filter((i) => canSee(perms, i.type))
}

export function toStored(items) {
  return (items || []).map((i) => ({ ...i, key: i.type, visible: true }))
}

export function addItem(items, type) {
  const def = WIDGET_CATALOG[type]
  if (!def || def.comingSoon) return items
  if (!def.allowMultiple && items.some((i) => i.type === type)) return items
  return [...items, makeItem(newId(), type)]
}
