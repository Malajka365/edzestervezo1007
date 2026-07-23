# D1 — Mobil reszponzivitás: Auth, JoinTeam, Profile, TeamMembersPanel

Fájlok: `src/pages/Auth.jsx`, `src/pages/JoinTeam.jsx`, `src/pages/Profile.jsx`,
`src/components/TeamMembersPanel.jsx`
Kapcsolódó review: `docs/review/05-design-ux.md`, "2.3 Mobil-reszponzivitás nagyon egyenetlen"
és "2.4 Jogosultsági mátrix táblázat mobilon" szakaszok.

Cél: a fenti négy fájl mobilon (375px szélesség) törésmentes legyen, tisztán layout/spacing/
breakpoint szintű beavatkozással — színek, komponensek, állapot-/logika-kezelés változatlan.

---

## 1. `src/pages/Auth.jsx`

**Előtte**: nulla `sm:`/`md:` prefix. A tab-váltó gombsor (`Bejelentkezés` / `Regisztráció`)
fix `px-4` paddinggel és alap (nem méretezett) betűmérettel futott — ikon + hosszabb magyar
felirat (`Regisztráció`) 375px-en két, `flex-1` gombban szűk volt.

**Utána**:
- Tab gombok: `px-2 sm:px-4`, `text-sm sm:text-base`, ikon margó `mr-1 sm:mr-2` — mobilon
  szűkebb belső térköz és kisebb betű, `sm:` fölött visszaáll az eredeti méretre.
- Logó doboz és cím: `w-14 h-14 sm:w-16 sm:h-16`, `text-2xl sm:text-3xl` (TF monogram),
  `text-3xl sm:text-4xl` (TeamFlow cím), alcím `text-sm sm:text-base` — mobilon kompaktabb
  fejléc, nagyobb kijelzőn az eredeti méret.
- Kapcsolat-teszt gomb (`Adatbázis kapcsolat tesztelése`): `flex` → `inline-flex` + a szülőre
  `px-2`, hogy a hosszú felirat ne az abszolút szélső képernyőszélig fusson; az ikonra
  `flex-shrink-0`, hogy sortöréskor ne torzuljon.
- A `.card` (form) és az input mezők eleve `w-full` + a globális `.input-field`/`.card`
  osztályokat használták, itt nem volt szükség módosításra.

Nem nyúltam a `handleAuth`, `redirectToPendingInviteIfAny` logikához vagy a state-hez.

---

## 2. `src/pages/JoinTeam.jsx`

**Előtte**: nulla reszponzív prefix, de a szerkezet (`min-h-screen ... p-4` + `card max-w-md
w-full`) már eleve a kért `max-w-md w-full` mintát követte — 375px-en nem tört, csak a
tipográfia volt fixen "asztali" méretű, és a kártya-padding a globális `.card` (`p-6`) miatt
a legkeskenyebb (320-360px-es) telefonokon feleslegesen sok helyet vitt el a tartalomtól.

**Utána**:
- Kártya padding: `p-5 sm:p-6` (a globális `.card` `p-6`-ját felülírva) — valamivel több hely
  a tartalomnak a legkeskenyebb kijelzőkön, `sm:` fölött az eredeti érték.
- Cím: `text-lg sm:text-xl`, leírás/állapot-szövegek: `text-sm sm:text-base`.
- A leírás bekezdésre `break-words`, hogy egy hosszú csapatnév (`invite.team_name`) ne
  feszítse szét a kártyát 375px-en.

A státuszgép (`loading/confirm/joining/success/error`), a `handleAccept`/`fetchInvite` logika
és a `btn btn-primary w-full` gomb változatlan.

---

## 3. `src/pages/Profile.jsx`

**Előtte**: nulla reszponzív prefix. A form-mezők eleve `block`/`w-full` elemek, tehát
egymás alá stackeltek mobilon is — a tényleges kockázat a jelszó-form két gombos sora
(`Jelszó Mentése` + `Mégse`, `flex items-center space-x-3`) volt, ami 375px-en, két
`btn-primary`/`btn-secondary` gombbal (ikon+felirat) egymás mellett szűken fért volna.

**Utána**:
- Jelszó-form gombsor: `flex items-center space-x-3` → `flex flex-col sm:flex-row
  sm:items-center gap-3` — mobilon a két gomb egymás alá kerül (teljes szélességben, a
  `btn-primary`/`btn-secondary` saját `w-full`-ja nélkül is jól olvasható méretben), `sm:`
  fölött visszaáll az eredeti egy sorba rendezés.
- A mentés-gombra `justify-center` az ikon+szöveg középre igazításához az új, oszlopos
  elrendezésben.
- Üzenet-sáv (siker/hiba): a szöveg `<p>`-re `flex-1 min-w-0`, a bezáró `X` gombra
  `flex-shrink-0` — így hosszabb hibaüzenet (pl. Supabase válasz) flex-konténerben helyesen
  tördelődik, nem tolja ki a bezáró gombot a kártyából.

A profil-form (email/név/szerepkör) és a "Fiók Információk" kártya már eleve helyesen
stackelt/blokk-elemekből állt, itt nem volt szükség változtatásra. `handleUpdateProfile`,
`handleChangePassword`, `fetchProfile` logika és state változatlan.

---

## 4. `src/components/TeamMembersPanel.jsx`

**Előtte**: nulla reszponzív prefix. A "Jogosultságok" kártya egy natív `<table>`-t
renderelt `overflow-x-auto` wrapperben — ez nem tört el, de 375px-en apró cellákkal,
oldalra görgetve volt csak használható (lásd review 2.4). A "Csapattagok" fejléc sor
(`Csapattagok` cím + `Tag meghívása` gomb) `justify-between`, `flex-wrap` nélkül, ikon+
hosszabb feliratú gombbal szűk lehetett a legkeskenyebb kijelzőkön.

**Utána — mátrix mobil megoldás**: a Jogosultságok mátrixot **két, kizárólagos nézetre**
bontottam ugyanabból a `permissions` state-ből és `handlePermissionChange`
handlerből — `md:hidden` blokk alatt **modulonként egy kártya**, benne a 3 szerephez
tartozó `<select>` egy-egy címkézett sorban (szerepnév balra, legördülő jobbra), míg
`hidden md:block` blokk alatt megmarad az eredeti `<table>` + `overflow-x-auto` nézet
változatlanul. Nincs új state, nincs duplikált adatforrás — a két blokk ugyanazt a
`MODULES`/`ROLES`/`ACCESS_LEVELS` bejárást és `onChange={(e) =>
handlePermissionChange(r.key, mod.key, e.target.value)}` hívást használja, csak a
JSX-struktúra és a CSS `display` (Tailwind `hidden`/`md:hidden`/`md:block`) különbözik —
tisztán render-only változtatás.

**Egyéb változtatások**:
- "Csapattagok" fejléc sor: `flex items-center justify-between` → `... gap-2 flex-wrap`,
  hogy szükség esetén a cím és a "Tag meghívása" gomb tördelhessen egymás alá, ne csússzon
  össze.
- "Jogosultságok mentése" gomb: `w-full sm:w-auto` hozzáadva — mobilon teljes szélességű,
  könnyen érinthető, `sm:` fölött az eredeti, tartalomhoz igazodó méret.

**Meghívó modal**: már eleve `max-w-md w-full mx-4` mintát követte, a `.card` `p-6`
paddinggel és `w-full`/`flex-1 truncate` gyerekelemekkel 375px-en (kb. 295px belső
tartalom-szélesség a `mx-4` és `p-6` levonása után) nem törik — ezt ellenőriztem, nem
módosítottam.

A `fetchMembersAndInvites`, `handleGenerateInvite`, `handleRevokeInvite`,
`handleRemoveMember`, `handleSavePermissions`, `handlePermissionChange` logika és a
`permissions`/`members`/`pendingInvites` state változatlan.

---

## Build ellenőrzés

```
npm run build
✓ built in ~12s
```

Hiba nélkül lefutott (a kimenetben csak a szokásos, a feladathoz nem kapcsolódó
chunk-méret és browserslist figyelmeztetések jelentek meg).

## Commit

```
git add src/pages/Auth.jsx src/pages/JoinTeam.jsx src/pages/Profile.jsx src/components/TeamMembersPanel.jsx docs/review/fix-reports/D1-reszponzivitas.md
fix: add mobile responsiveness to auth, join, profile and team members panel
```
