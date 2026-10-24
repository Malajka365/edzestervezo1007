// A Teendők widget szabályai (2. szakasz spec, „Teendők szabályai”).
// Minden tétel csak a hozzá tartozó jogosultsággal jelenik meg.
import { isModuleVisible } from './permissions'
import { availabilityOf } from './availability'

const DAY = 24 * 60 * 60 * 1000
const toDate = (iso) => new Date(`${iso}T12:00:00`)
const daysBetween = (from, to) => Math.round((toDate(to) - toDate(from)) / DAY)
const shortDate = (iso) => toDate(iso).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })

// category: 'perf' (mérés) | 'health' (egészség) | 'plan' (edzés, szezon)
// src: 'all' | 'perf' | 'health' — a 'plan' tételek csak 'all' mellett.
export function computeTodos({
  today,
  perms,
  players = [],
  lastMeasuredByPlayer = new Map(),
  coverageWeeks = 6,
  sessionsLast7 = [],
  attendanceDates = new Set(),
  availabilityByPlayer = new Map(),
  season = null,
  src = 'all',
}) {
  const todos = []
  const want = (category) => src === 'all' || src === category

  if (want('health') && (isModuleVisible(perms, 'players') || isModuleVisible(perms, 'rehab'))) {
    const health = []
    for (const p of players) {
      const a = availabilityOf(availabilityByPlayer, p.id)
      if (a.status !== 'injured' || !a.expected_return) continue
      const left = daysBetween(today, a.expected_return)
      if (left < 0) {
        health.push({ order: left, id: `overdue-${p.id}`, tone: 'bad', text: `${p.name} várható visszatérése lejárt (${shortDate(a.expected_return)})` })
      } else if (left <= 7) {
        health.push({ order: left, id: `return-${p.id}`, tone: 'info', text: `${p.name} visszatérése: ${shortDate(a.expected_return)}` })
      }
    }
    health
      .sort((a, b) => a.order - b.order)
      .forEach(({ order, ...t }) => todos.push({ ...t, category: 'health', to: '/dashboard/rehabilitacio' }))
  }

  if (want('perf') && isModuleVisible(perms, 'measurement')) {
    const limit = coverageWeeks * 7
    const missing = players.filter((p) => {
      const last = lastMeasuredByPlayer.get(p.id)
      return !last || daysBetween(String(last).slice(0, 10), today) > limit
    })
    if (missing.length) {
      todos.push({
        id: 'coverage',
        tone: 'warn',
        category: 'perf',
        text: `${missing.length} játékosnak ${coverageWeeks} hete nincs mérése`,
        detail: missing.map((p) => p.name).join(', '),
        to: '/dashboard/meresek',
      })
    }
  }

  if (src === 'all' && isModuleVisible(perms, 'attendance')) {
    for (const s of sessionsLast7) {
      if (s.date >= today || attendanceDates.has(s.date)) continue
      todos.push({
        id: `attendance-${s.id}`,
        tone: 'warn',
        category: 'plan',
        text: `${shortDate(s.date)}: az edzésen nincs jelenlét rögzítve`,
        to: `/dashboard/mai-edzes?session=${s.id}`,
      })
    }
  }

  if (src === 'all' && season && isModuleVisible(perms, 'macrocycle')) {
    const toEnd = daysBetween(today, season.end_date)
    const toStart = daysBetween(today, season.start_date)
    if (toStart > 0 && toStart <= 7) {
      todos.push({ id: 'season-start', tone: 'info', category: 'plan', text: `A ${season.name} szezon ${toStart} nap múlva kezdődik`, to: '/dashboard/makrociklus' })
    } else if (toEnd >= 0 && toEnd <= 7) {
      todos.push({ id: 'season-end', tone: 'info', category: 'plan', text: `A ${season.name} szezon ${toEnd} nap múlva véget ér`, to: '/dashboard/makrociklus' })
    }
  }

  return todos
}
