# I2B — 4 dashboard widget implementálása

## RecentMeasurementsWidget

- Tábla/lekérdezés: `measurements` (`id, value, measured_at, player:players(id,name), exercise:exercises(id,name,unit)`), `.eq('team_id', selectedTeam.id)`, `order('measured_at', desc)`, `limit(5)`. A select-alak `src/pages/measurements/useMeasurementsData.js` `fetchMeasurements`-jét tükrözi (player+exercise embedded join).
- Sor: játékos név · gyakorlat név, érték+mértékegység, dátum (`toLocaleDateString('hu-HU')`).
- Üres állapot: "Még nincs mérés."

## LeaderboardTop3Widget

- **Választott megközelítés: egyszerűsített fallback ("Top 3 (1RM)")**, nem a teljes `Leaderboard.jsx` testsúly-arányos logika. Indoklás: az eredeti egy exercise-selectort + 2 külön (testsúly + kiválasztott gyakorlat 1RM) lekérdezést igényel, ami komponens-állapotot és UI-t adna egy kompakt widgethez — a megbízás explicit engedélyezte ezt a fallbacket.
- Lekérdezés: utolsó 200 `measurements` sor a csapatnál (`value, reps, measured_at, player:players(id,name), exercise:exercises(id,name,unit)`), kliens oldalon `exercise.unit === 'kg'`-ra szűrve, `calculate1RM` (importálva: `src/pages/measurements/useMeasurementsData.js`) újraszámolja az 1RM-et `value`+`reps`-ből (nem a tárolt `one_rm` oszlopot használja), játékosonként a legjobb érték marad, végül top 3 csökkenő sorrendben.
- Üres állapot: "Nincs elég mérési adat."

## SeasonProgressWidget

- Tábla: `training_seasons` (`id, name, start_date, end_date`), oszlopnevek `src/pages/macrocycle/useMacrocycleData.js` `createSeason`/`updateSeason`-ből verifikálva.
- Aktuális szezon: ahol `start_date <= ma <= end_date`; ha nincs ilyen, a legfrissebb (legkésőbbi `start_date`) sor.
- Megjelenítés: szezon neve, "X. hét / Y" (Monday-igazítás nélküli, egyszerű 7-napos osztás), emerald progress bar.
- Üres állapot: "Nincs aktív szezon."

## TeamOverviewWidget

- Játékosszám: megosztott `usePlayers(selectedTeam?.id)` hook (`src/hooks/usePlayers.js`).
- Tagok szerepkörönként: `team_members` (`role`) a csapatra szűrve, kliensen összeszámolva; címkék `ROLES`-ból (`src/lib/permissions.js`).
- Két szám (játékos / csapattag összesen) + szerepkörönkénti lista. Üres részállapotok: "Nincs csapattag." (ha a `team_members` lista üres); a játékosszám kártya mindig 0-t mutat játékos nélkül (nincs külön szöveges üres állapot rá, a spec csak "üres állapot" pontokat kért, ez konzisztens a 2 kártyás elrendezéssel).

## Verifikáció

- `npm test`: 67/67 zöld.
- `npm run build`: hibamentes.

## Érintett fájlok

- `src/pages/dashboard-home/widgets/RecentMeasurementsWidget.jsx`
- `src/pages/dashboard-home/widgets/LeaderboardTop3Widget.jsx`
- `src/pages/dashboard-home/widgets/SeasonProgressWidget.jsx`
- `src/pages/dashboard-home/widgets/TeamOverviewWidget.jsx`
