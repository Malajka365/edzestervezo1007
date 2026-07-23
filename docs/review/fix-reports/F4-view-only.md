# F4 — View-only modulok: szerkesztő gombok elrejtése/letiltása

Cél: a `canEditModule(permissions, moduleKey)` (`src/lib/permissions.js`) bekötése minden
modulba, amely eddig kivétel volt (csak `Teams.jsx` volt kész referenciaként). RLS a
DB szinten már blokkolja az írást, de a UI eddig sok helyen mutatta a
létrehozás/szerkesztés/törlés gombokat "view"-only felhasználóknak is, amik némán
elbuktak submitkor.

Minta minden fájlban:
```jsx
const { currentUserPermissions } = useTeams()
const canEdit = canEditModule(currentUserPermissions, '<module_key>')
{canEdit && <button ...>}
```

## 1. `src/pages/Calendar.jsx` (module: `calendar`)
- Elrejtve: "Gyors Hozzáadás" gomb (hónap nézet), "Edzés hozzáadása" gomb (nap nézet),
  edzés szerkesztés/törlés ikon gombok (nap nézet lista).
- Letiltva (`disabled`, meglévő `!hasBall` logikához bővítve `|| !canEdit`): a heti nézet
  20 db inline terhelés-faktor / taktika-technika mező (csillag-értékelés gombok,
  legördülők, szöveges inputok) — ezek `training_load_factors` és `tactics_technique`
  táblákba írnak és eddig view-only usernek is aktívak voltak.
- Hide vs disable: hide a különálló CTA gomboknál, disable az inline mindig látható
  cellás szerkesztőknél (a meglévő UX mintát követve, ami már `hasBall`-lal is tiltott).

## 2. `src/pages/MacrocyclePlanner.jsx` (module: `macrocycle`)
- Elrejtve: "Új Szezon", "Szerkesztés", "Törlés", "Sablon" (mentés), "Betöltés"
  (sablon alkalmazása — írás), "Mentés" (kézi mentés) gombok. A "PDF" export gomb
  megmaradt (csak olvasás).
- Letiltva: a makrociklus táblázat összes inline cellája (OPT toggle gombok, Egyéb
  dropdown cellák, napi bontás cellák, Ciklus mező szerkesztő gombja) —
  `disabled={!canEdit}` + a dropdown/popover csak `canEdit` esetén nyílik meg.

## 3. `src/pages/TrainingTemplates.jsx` (module: `templates`)
- Elrejtve: "Új sablon" gomb (fejléc + üres állapot CTA), sablon kártyánkénti
  Szerkesztés/Duplikálás/Törlés gombcsoport.

## 4. `src/pages/Matches.jsx` (module: `matches`)
- Elrejtve: "Új mérkőzés" gomb (fejléc + üres állapot CTA), mérkőzésenkénti
  Szerkesztés/Törlés gombcsoport.

## 5. `src/pages/Measurements.jsx` (module: `measurement`)
- Elrejtve: teljes "Középső gombok" blokk (Új Gyakorlat, Gyakorlatok kezelése, Csapat
  Felmérés, Új Mérés), az `EmptyState` "Mérés rögzítése" akció, és a Gyakorlatok
  kezelése modálban a Szerkesztés/Törlés ikonpár gyakorlatonként.
- `src/pages/PlayerProfile.jsx` (mérés-fókuszú profil oldal, `PlayerProfile` importként
  `Teams.jsx`-ből) ellenőrizve: nincs benne `insert`/`update`/`delete` hívás, tisztán
  megjelenítő (stat kártyák, mérés-táblázat) — gating nem szükséges.

## 6. `src/pages/ExerciseLibrary.jsx` (module: `exercises`)
- Elrejtve: "Új gyakorlat" gomb (fejléc), gyakorlat kártyánkénti Szerkesztés/Törlés
  gombpár, detail modál Szerkesztés/Törlés gombjai.
- Meghagyva: kedvenc (Star) jelölés gomb — ez `user_exercise_favorites` táblába ír,
  személyes preferencia, nem csapat-szintű modul adat, ezért nincs jogosultsághoz kötve.

## 7. Rehabilitáció (module: `rehab`)
- `src/pages/Rehabilitation.jsx`: nincs saját írás-vezérlő; kiszámolja `canEdit`-et és
  továbbadja a `TeamAttendanceCalendar`-nak.
- `src/pages/PlayerProfileRehab.jsx`: elrejtve az anamnézis Szerkesztés/Törlés
  ikonpár, dokumentum Törlés gomb; `canEdit` propként átadva `AnamnesisForm`-nak és
  `DocumentUpload`-nak; `AttendanceCalendar`-nak is átadva.
- `src/components/AnamnesisForm.jsx`: `canEdit` prop (default `true`); a "Mentés" gomb
  csak `canEdit` esetén jelenik meg, helyette "Csak megtekintési jogosultság" felirat.
  A form mezők vizuálisan megmaradnak (kitölthetők), de mentés gomb nélkül az adat
  sosem kerül elküldésre — ez elegendő az adatvesztés elleni védelemhez.
- `src/components/DocumentUpload.jsx`: `canEdit` prop; `!canEdit` esetén a komponens
  `null`-t rendel (a teljes feltöltő terület eltűnik view-only usernek).
- `src/components/AttendanceCalendar.jsx` (egyjátékos jelenlét lista): `canEdit` prop;
  elrejtve "Új jelenlét" gomb és a soronkénti Szerkesztés gomb.
- `src/components/TeamAttendanceCalendar.jsx` (csapat jelenlét naptár): `canEdit` prop;
  elrejtve a napi "+" gombok (hó és hét nézet), a nap nézet "Jelenlét felvitele" CTA,
  a modál Törlés/Mentés gombjai; a meglévő jelenlét-chipekre kattintás
  (`handleAttendanceClick`) és az üres napra kattintás (`handleDayClick`) is
  `!canEdit` esetén no-op.

## 8. `src/components/TrainingLocations.jsx` (module: `players`)
- A komponens korábban nem hívott `useTeams()`-t — hozzáadva, hogy közvetlenül tudja
  lekérdezni `currentUserPermissions`-t (`Teams.jsx` `TeamContext.Provider`-en belül
  van renderelve, tehát biztonságos).
- Elrejtve: "Új Helyszín" gomb, helyszínenkénti "alapértelmezettnek jelöl" (Star),
  Szerkesztés, Törlés gombok.

## Ellenőrzés
- `npm run build` — sikeres, hiba nélkül.
- `grep -rl canEditModule src/pages src/components` — 10 fájl (11 találat a
  `src/lib/permissions.js` definícióval együtt): `TrainingLocations.jsx`,
  `Rehabilitation.jsx`, `PlayerProfileRehab.jsx`, `ExerciseLibrary.jsx`,
  `Measurements.jsx`, `Matches.jsx`, `TrainingTemplates.jsx`,
  `MacrocyclePlanner.jsx`, `Calendar.jsx`, `Teams.jsx` (már meglévő referencia).
- `canEdit` prop mintával (nem közvetlen `canEditModule` hívással) bekötve:
  `AnamnesisForm.jsx`, `DocumentUpload.jsx`, `AttendanceCalendar.jsx`,
  `TeamAttendanceCalendar.jsx`.

## Kihagyva / nem igényelt módosítást
- `src/pages/Leaderboard.jsx`, `src/pages/PlayerProgress.jsx`,
  `src/pages/TrainingLoad.jsx` — grep-elve `.insert(`/`.update(`/`.delete(` mintákra,
  egyik sem tartalmaz írást (`TrainingLoad.jsx` sem ír `training_load_factors`-ba a
  jelen kódállapotban), tisztán olvasó/stat oldalak.
- `src/pages/PlayerProfile.jsx` — csak olvasás (lásd 5. pont).
- Üzleti logika nem változott sehol, csak láthatóság/`disabled` állapot.
