// A `matches` tábla mérkőzéstípus-oszlopa az élő sémában `type`
// (CHECK: friendly / league / cup / tournament). `match_type` oszlop nincs —
// a régi setup-szkript így írta, ettől bukott a Mérkőzések oldal mentése.

// Makrociklusból létrehozott mérkőzés beszúrandó sora.
export const buildMacrocycleMatchInsert = ({ teamId, seasonId, date, homeAway, weekIndex, dayIndex }) => ({
  team_id: teamId,
  season_id: seasonId,
  date,
  home_away: homeAway,
  created_from_macrocycle: true,
  macrocycle_week_index: weekIndex,
  macrocycle_day_index: dayIndex,
  opponent: null, // a Mérkőzések oldalon tölthető ki
  time: '18:00',
  type: 'league',
})

// A Mérkőzések űrlap adataiból mentendő sor (üres eredmény = null).
export const toMatchRow = (formData) => ({
  ...formData,
  our_score: formData.our_score === '' ? null : parseInt(formData.our_score),
  opponent_score: formData.opponent_score === '' ? null : parseInt(formData.opponent_score),
})
