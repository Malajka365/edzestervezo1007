// Játékos-elérhetőség (bevethető / korlátozott / sérült) a `player_availability`
// naplóból. Minden változás új sor; a játékos állapota egy adott napon a
// legutóbbi, addig már elkezdődött bejegyzése. Bejegyzés nélkül: bevethető.

export const AVAILABILITY = {
  available: { label: 'Bevethető', tone: 'ok' },
  limited: { label: 'Korlátozott', tone: 'warn' },
  injured: { label: 'Sérült', tone: 'bad' },
}

export const AVAILABILITY_STATUSES = Object.keys(AVAILABILITY)

const DEFAULT = { status: 'available', expected_return: null, note: null, entryId: null, started_on: null }

export function todayIso(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const isNewer = (a, b) =>
  a.started_on > b.started_on || (a.started_on === b.started_on && (a.created_at || '') > (b.created_at || ''))

// Map<playerId, { status, expected_return, note, entryId, started_on }> — csak
// azok a játékosok szerepelnek benne, akiknek van a napig érvényes bejegyzésük.
export function currentAvailability(entries, onDate = todayIso()) {
  const latest = new Map()
  for (const e of entries || []) {
    if (!e?.player_id || !e.started_on || e.started_on > onDate) continue
    const prev = latest.get(e.player_id)
    if (!prev || isNewer(e, prev)) latest.set(e.player_id, e)
  }
  const result = new Map()
  for (const [playerId, e] of latest) {
    result.set(playerId, {
      status: e.status,
      expected_return: e.expected_return ?? null,
      note: e.note ?? null,
      entryId: e.id ?? null,
      started_on: e.started_on,
    })
  }
  return result
}

export function availabilityOf(map, playerId) {
  return map?.get(playerId) ?? DEFAULT
}
