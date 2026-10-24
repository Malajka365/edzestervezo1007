// A Kezdőlap widgetjeinek adat-feldolgozása (tiszta függvények, tesztelhetők).
import { CalendarPlus, Trophy, CheckSquare, LineChart, Users, Calculator, ShieldCheck, ClipboardPlus } from 'lucide-react'
import { canEditModule, isModuleVisible } from './permissions'
import { oneRepMax, relativeStrength } from './strength'

const BODY_WEIGHT = 'testsúly'
const TIME_UNITS = new Set(['s', 'mp', 'sec', 'másodperc'])
const lowerIsBetter = (unit) => TIME_UNITS.has(String(unit || '').toLowerCase())

export function filterAgendaByType(items, types) {
  if (types === 'match') return items.filter((i) => i.kind === 'match')
  if (types === 'train') return items.filter((i) => i.kind !== 'match')
  return items
}

// A legfrissebb n mérés; "csúcs", ha az érték a játékos legjobbja abban a
// gyakorlatban (a betöltött mérések között; időnél a kisebb a jobb).
export function markPersonalBests(rows, n) {
  const best = new Map()
  for (const r of rows) {
    const key = `${r.player?.id}|${r.exercise?.id}`
    const v = parseFloat(r.value)
    if (Number.isNaN(v)) continue
    const prev = best.get(key)
    const better = lowerIsBetter(r.exercise?.unit) ? v < prev : v > prev
    if (prev === undefined || better) best.set(key, v)
  }
  return [...rows]
    .sort((a, b) => String(b.measured_at).localeCompare(String(a.measured_at)))
    .slice(0, n)
    .map((r) => ({ ...r, isBest: parseFloat(r.value) === best.get(`${r.player?.id}|${r.exercise?.id}`) }))
}

const isBodyWeight = (ex) => String(ex?.name || '').toLowerCase() === BODY_WEIGHT

function bestOneRm(measurements) {
  const best = new Map()
  for (const m of measurements) {
    if (!m.player || isBodyWeight(m.exercise) || m.exercise?.unit !== 'kg') continue
    const v = oneRepMax(m.value, m.reps)
    if (!v) continue
    const prev = best.get(m.player.id)
    if (!prev || v > prev.value) best.set(m.player.id, { playerId: m.player.id, playerName: m.player.name, value: v })
  }
  return best
}

function latestBodyWeight(measurements) {
  const latest = new Map()
  for (const m of measurements) {
    if (!m.player || !isBodyWeight(m.exercise)) continue
    const prev = latest.get(m.player.id)
    if (!prev || String(m.measured_at) > String(prev.at)) latest.set(m.player.id, { at: m.measured_at, value: parseFloat(m.value) })
  }
  return latest
}

export function attendanceByPlayer(rows) {
  const byPlayer = new Map()
  for (const r of rows || []) {
    const p = byPlayer.get(r.player_id) || { playerId: r.player_id, name: r.players?.name || '—', total: 0, present: 0, absent: 0 }
    p.total += 1
    if (r.status === 'jelen') p.present += 1
    else if (r.status === 'hiányzik') p.absent += 1
    byPlayer.set(r.player_id, p)
  }
  return byPlayer
}

// metric: 'rel' (1RM / testsúly), 'orm' (legjobb 1RM), 'att' (jelenlét %); n: '3' | '5' | 'all'
export function rankPlayers({ measurements = [], attendance = [], metric, n }) {
  let list = []
  if (metric === 'att') {
    list = [...attendanceByPlayer(attendance).values()].map((p) => ({
      playerId: p.playerId,
      playerName: p.name,
      value: p.total ? Math.round((p.present / p.total) * 100) : 0,
    }))
  } else {
    const best = bestOneRm(measurements)
    if (metric === 'rel') {
      const bw = latestBodyWeight(measurements)
      list = [...best.values()]
        .map((b) => ({ ...b, value: relativeStrength(b.value, bw.get(b.playerId)?.value) }))
        .filter((b) => b.value)
    } else {
      list = [...best.values()]
    }
  }
  list.sort((a, b) => b.value - a.value)
  return n === 'all' ? list : list.slice(0, parseInt(n, 10) || 3)
}

const ACTION_SETS = {
  coach: [
    { label: 'Új edzés', path: '/dashboard/naptar', icon: CalendarPlus, module: 'calendar' },
    { label: 'Új mérkőzés', path: '/dashboard/merkozesek', icon: Trophy, module: 'matches' },
    { label: 'Mai jelenlét', path: '/dashboard/mai-edzes', icon: CheckSquare, module: 'attendance' },
  ],
  fit: [
    { label: 'Új mérés', path: '/dashboard/meresek', icon: LineChart, module: 'measurement' },
    { label: 'Csapatfelmérés', path: '/dashboard/meresek', icon: Users, module: 'measurement' },
    { label: '1RM táblázat', path: '/dashboard/kalkulator', icon: Calculator, module: null },
  ],
  physio: [
    { label: 'Elérhetőség', path: '/dashboard/rehabilitacio', icon: ShieldCheck, module: 'rehab' },
    { label: 'Anamnézis', path: '/dashboard/rehabilitacio', icon: ClipboardPlus, module: 'rehab' },
    { label: 'Jelenlét', path: '/dashboard/jelenlet', icon: CheckSquare, module: 'attendance' },
  ],
}

export function quickActionsFor(set, perms) {
  return (ACTION_SETS[set] || ACTION_SETS.coach).filter((a) =>
    a.module ? canEditModule(perms, a.module) : isModuleVisible(perms, a.module)
  )
}

export function attendanceSummary(rows) {
  const total = (rows || []).length
  if (!total) return { rate: null, total: 0, mostAbsent: [] }
  const present = rows.filter((r) => r.status === 'jelen').length
  const mostAbsent = [...attendanceByPlayer(rows).values()]
    .filter((p) => p.absent > 0)
    .sort((a, b) => b.absent - a.absent)
    .slice(0, 3)
    .map(({ playerId, name, absent }) => ({ playerId, name, absent }))
  return { rate: Math.round((present / total) * 100), total, mostAbsent }
}

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Az időszak első napja (YYYY-MM-DD): hét = hétfő, hónap = 1., szezon = aug. 1.
export function periodStart(period, todayIsoStr) {
  const d = new Date(`${todayIsoStr}T12:00:00`)
  if (period === 'month') return iso(new Date(d.getFullYear(), d.getMonth(), 1))
  if (period === 'season') return iso(new Date(d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1, 7, 1))
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return iso(d)
}
