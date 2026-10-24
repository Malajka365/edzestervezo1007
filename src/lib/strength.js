// Erő-mutatók közös számításai (Ranglista oldal, Kezdőlap widgetek).

// 1RM a mért súlyból és ismétlésből (Epley); 1 ismétlésnél maga a súly.
export function oneRepMax(weight, reps = 1) {
  const w = parseFloat(weight)
  const r = parseInt(reps || 1, 10)
  if (!w || r <= 0) return null
  return r === 1 ? w : Math.round(w * (1 + r / 30) * 100) / 100
}

// Testsúlyarányos erő: 1RM / testsúly, két tizedesre.
export function relativeStrength(oneRm, bodyWeight) {
  if (!oneRm || !bodyWeight) return null
  return Math.round((oneRm / bodyWeight) * 100) / 100
}
