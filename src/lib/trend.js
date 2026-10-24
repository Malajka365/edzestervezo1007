// Mérés-trend: heti átlagok egy időablakban (mérés nélküli hét kimarad).

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function weekStart(isoDate) {
  const d = new Date(`${String(isoDate).slice(0, 10)}T12:00:00`)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return iso(d)
}

// rows: [{ value, measured_at }]; weeks: az ablak hossza hetekben; today: YYYY-MM-DD.
export function weeklyAverage(rows, { weeks, today }) {
  const from = new Date(`${weekStart(today)}T12:00:00`)
  from.setDate(from.getDate() - (weeks - 1) * 7)
  const fromIso = iso(from)
  const buckets = new Map()
  for (const r of rows || []) {
    const v = parseFloat(r.value)
    if (Number.isNaN(v)) continue
    const w = weekStart(r.measured_at)
    if (w < fromIso) continue
    const b = buckets.get(w) || { sum: 0, n: 0 }
    b.sum += v
    b.n += 1
    buckets.set(w, b)
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([w, b]) => ({ weekStart: w, value: Math.round((b.sum / b.n) * 100) / 100 }))
}
