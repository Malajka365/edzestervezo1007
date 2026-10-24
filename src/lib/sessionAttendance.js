// A Mai edzés oldal logikája: melyik edzést mutassuk, és az edzés jelenléti
// névsora hogyan áll össze a meglévő sorokból (edzéshez kötött + régi, kötetlen).
import { availabilityOf } from './availability'

const hhmm = (t) => (t ? String(t).slice(0, 5) : null)

const byStart = (a, b) => {
  if (!a.start_time && !b.start_time) return 0
  if (!a.start_time) return 1
  if (!b.start_time) return -1
  return a.start_time.localeCompare(b.start_time)
}

// mode: 'today' (ma van edzés), 'next' (a következő jövőbeli), 'none'.
// A mai edzések egész nap maradnak, akkor is, ha már véget értek.
export function pickSession(sessions, today) {
  const list = sessions || []
  const todays = list.filter((s) => s.date === today).sort(byStart)
  if (todays.length) return { mode: 'today', session: todays[0], todays }
  const future = list
    .filter((s) => s.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || byStart(a, b))
  if (future.length) return { mode: 'next', session: future[0], todays: [] }
  return { mode: 'none', session: null, todays: [] }
}

// linkedRows: az edzéshez kötött sorok; dayRows: a csapat aznapi kötetlen sorai.
// Kötetlen edzés-sort (típusa 'edzés' vagy üres; meccs, orvosi stb. soha) akkor
// veszünk át, ha aznap ez az egyetlen edzés, vagy a sor időpontja egyezik az
// edzés kezdésével. A mentett sorok `saved` mezője a betöltött állapot: mentéskor
// csak a megváltozott sorok íródnak vissza.
export function resolveRoster({ session, players, linkedRows = [], dayRows = [], sessionsThatDay = [], availabilityByPlayer }) {
  const linked = new Map(linkedRows.map((r) => [r.player_id, r]))
  const onlySession = sessionsThatDay.length <= 1
  const start = hhmm(session?.start_time)
  const adoptable = new Map()
  for (const r of dayRows) {
    if (r.training_session_id) continue
    if (r.training_type && r.training_type !== 'edzés') continue
    if (onlySession || (start && hhmm(r.event_time) === start)) {
      if (!adoptable.has(r.player_id)) adoptable.set(r.player_id, r)
    }
  }

  let recorded = false
  const rows = (players || []).map((player) => {
    const own = linked.get(player.id)
    if (own) {
      recorded = true
      return { player, status: own.status, notes: own.notes ?? '', rowId: own.id, adopt: false, saved: { status: own.status, notes: own.notes ?? null } }
    }
    const old = adoptable.get(player.id)
    if (old) {
      recorded = true
      return { player, status: old.status, notes: old.notes ?? '', rowId: old.id, adopt: true }
    }
    const injured = availabilityOf(availabilityByPlayer, player.id).status === 'injured'
    return { player, status: injured ? 'sérült' : 'jelen', notes: '', rowId: null, adopt: false }
  })
  return { rows, recorded }
}

export function buildAttendanceWrites(session, rows, teamId) {
  const inserts = []
  const updates = []
  for (const r of rows) {
    const notes = r.notes?.trim() ? r.notes.trim() : null
    if (r.rowId) {
      if (!r.adopt && r.saved && r.saved.status === r.status && r.saved.notes === notes) continue
      updates.push({ id: r.rowId, patch: { status: r.status, notes, training_session_id: session.id } })
    } else {
      inserts.push({
        team_id: teamId,
        player_id: r.player.id,
        date: session.date,
        event_time: session.start_time ?? null,
        training_type: 'edzés',
        training_session_id: session.id,
        status: r.status,
        notes,
      })
    }
  }
  return { inserts, updates }
}

export function canRecordAttendance(session, today) {
  return !!session && session.date <= today
}
