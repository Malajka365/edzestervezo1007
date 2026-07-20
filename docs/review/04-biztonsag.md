# 04 — Biztonsági és stabilitási átvilágítás (TeamFlow)

**Készült:** 2026-07-20
**Vizsgálat típusa:** kódoldali, read-only (semmit nem módosítottam az adatbázisban vagy a kódban)
**Fókusz:** a review 7. szempontja — biztonság és stabilitás, kiemelten a játékosok **egészségügyi adatainak** (anamnézis, sérülések, orvosi dokumentumok) védelme.

> Ez a jelentés laikusnak készült. A szakszavakat példával magyarázom. A korábbi review által javított két RLS-hibát (training_seasons, macrocycle_planning) NEM vizsgáltam újra — más problémákat kerestem.

---

## Vezetői összefoglaló (mit jelentenek a színek)

| # | Találat | Súly | Rövid lényeg |
|---|---------|------|--------------|
| K1 | Teljes adatbázis-mentés és tárhely-export a projektmappában, **nincs gitignore-olva** | 🔴 Kritikus | Egyetlen elgépelt `git` parancs nyilvánosságra hozhatja az ÖSSZES játékos egészségügyi adatát |
| K2 | Négy tábla RLS-védelmét egyik migráció sem írja le (`training_exercises`, `user_exercise_favorites`, `exercises`, `profiles`) | 🔴 Kritikus | A védelmük csak kézzel, a Supabase felületén létezhet — nem ellenőrizhető, újratelepítéskor elveszhet |
| F1 | Néma hibák: elhasalt lekérdezésnél a felhasználó üres listát lát, nem hibaüzenetet | 🟠 Fontos | Egy gyógytornász azt hiheti, a játékosnak nincs sérülése, pedig csak a betöltés bukott el |
| F2 | Nyers hibaüzenetek `alert()`-ben a felhasználónak; nincs globális hibavédő („error boundary”) | 🟠 Fontos | Adatbázis-belső részletek szivároghatnak; egy hiba fehér képernyőt okozhat |
| F3 | Gyenge jelszószabály (min. 6 karakter), nincs kétfaktoros belépés | 🟠 Fontos | Egészségügyi adatokhoz túl gyenge; könnyen kitalálható jelszavak |
| F4 | A meghívó-token a böngésző címsorában (URL) utazik | 🟠 Fontos | Bekerülhet böngésző-előzményekbe, szerver-naplókba; a meghívó nincs e-mailhez kötve |
| A1 | `has_team_access()` jogot kap az `anon` (be nem jelentkezett) szerep is | 🟡 Apróság | Gyakorlati kockázat nincs, de felesleges jogosultság |
| A2 | Hibaüzenet elárulja a migrációs fájl nevét/útját a felhasználónak | 🟡 Apróság | Belső felépítésre utaló infó a végfelhasználó előtt |
| A3 | Ha hiányzik a `.env`, az app csendben, működésképtelenül indul | 🟡 Apróság | Nehezen diagnosztizálható „minden üres” állapot |

**A jó hírek** (amit rendben találtam): nincs `dangerouslySetInnerHTML` és nyers HTML-beszúrás sehol → a klasszikus XSS-támadási felület minimális. Az orvosi dokumentumok privát tárhelyen vannak, és **aláírt, lejáró linkeken** keresztül nyílnak meg (nem publikus URL-en). A meghívó-elfogadás szerveroldali, biztonságos `SECURITY DEFINER` függvényekkel történik. Nincs a kódba égetett titkos kulcs; a `.env` helyesen ki van zárva a verziókövetésből; a benne lévő `VITE_SUPABASE_ANON_KEY` publikus kulcs, ez így rendben van.

---

## 🔴 Kritikus találatok

### K1 — Teljes adatbázis-mentés + tárhely-export a projektmappában, gitignore nélkül

**Hol:** `sb_letoltes/` mappa a projekt gyökerében. Tartalma:
- `db_cluster.backup` (786 KB) és `db_cluster-27-01-2026@23-01-23.backup.gz` — **teljes adatbázis-mentés** (minden játékos, anamnézis, mérés, felhasználó)
- `mvsppkrpcafrutrhitvk.storage.zip` (559 KB) — a Supabase **tárhely (Storage) teljes exportja**, ez nagy valószínűséggel a feltöltött **orvosi dokumentumok / sérülés-PDF-ek** másolatát tartalmazza
- `restore.log`, `test-upload.pdf`, egy A4-es PDF

Ellenőriztem: a `.gitignore` **nem** zárja ki ezt a mappát (`git check-ignore` → „NOT IGNORED”). Jelenleg a mappa még nincs verziókövetve (untracked), de semmi nem védi attól, hogy bekerüljön.

**Miért veszélyes (konkrét példa):** Ha valaki később kiad egy `git add -A && git commit && git push` parancsot (ez a leggyakoribb, „mentsünk el mindent” reflex), akkor a **teljes adatbázis és az összes orvosi dokumentum felkerül a GitHub-ra**. Ha a repó publikus vagy csak megosztott, onnantól bárki letöltheti egy csapat összes játékosának egészségügyi anamnézisét. Ez GDPR-szempontból különleges (egészségügyi) adat kiszivárgása — ez a legsúlyosabb, bejelentési kötelezettséggel járó incidens-kategória. Ráadásul a mentések **titkosítatlanul**, tisztán olvashatóan hevernek a fejlesztő gépén is.

A fájlnévben (`mvsppkrpcafrutrhitvk`) benne van a Supabase-projekt azonosítója is — ez önmagában nem titok, de jelzi, hogy éles adatokról van szó.

**Mit kell tenni:**
1. **Azonnal** vedd ki ezt a mappát a projekt könyvtárából (mozgasd egy verziókövetésen kívüli, titkosított helyre), VAGY add hozzá a `.gitignore`-hoz: `sb_letoltes/` (és minden `*.backup`, `*.backup.gz`, `*.storage.zip` mintát).
2. Ellenőrizd, hogy **soha, egyetlen korábbi commitba sem** került már be ilyen fájl (`git log --all --stat` a backup-nevekre). Ha bekerült, a git-előzményből is törölni kell.
3. Az adatbázis-mentéseket titkosítva, jelszóval védve tárold, ne a fejlesztői projektmappában.

**Munka:** ~15 perc (a `.gitignore` sor + a mappa áthelyezése). Ha már bekerült git-be: 1–2 óra (history-tisztítás).

---

### K2 — Négy tábla RLS-védelme sehol nincs kódban rögzítve

**Hol:** a kód ezeket a táblákat használja, de **egyetlen migrációs fájl sem** kapcsol rájuk RLS-t vagy policy-t:
- `training_exercises` — a közös gyakorlat-könyvtár (`src/pages/ExerciseLibrary.jsx:84,153,235,269`)
- `user_exercise_favorites` — kedvenc gyakorlatok (`src/pages/ExerciseLibrary.jsx:95,205,215`)
- `exercises` — mérés-gyakorlatok (`src/pages/Measurements.jsx:101`, `Leaderboard.jsx:39`, `PlayerProfile.jsx:121`, `PlayerProgress.jsx:74`, `TrainingLoad.jsx:43`)
- `profiles` — felhasználói profilok, nevek/e-mailek (`src/pages/Dashboard.jsx:73`, `Profile.jsx:41,66`, `components/TeamMembersPanel.jsx:38`)

**Fogalom röviden:** az **RLS (Row Level Security)** az adatbázis „ajtónállója” — soronként eldönti, ki melyik rekordot láthatja. Ha egy táblán nincs bekapcsolva, akkor **bármelyik bejelentkezett felhasználó a teljes tábla teljes tartalmát elérheti**, függetlenül attól, melyik csapathoz tartozik.

**Miért veszélyes (konkrét példa):**
- A `profiles` tábla neveket és e-mail-címeket tartalmaz. Ha nincs rá szűk RLS, egy másik csapat edzője **lekérheti az összes regisztrált felhasználó nevét és e-mail-címét** (a `TeamMembersPanel.jsx:38` mutatja, hogy a kód profil-adatokat olvas azonosító alapján).
- A `training_exercises` globális könyvtár (a beszúrásnál nincs is `team_id`, lásd `ExerciseLibrary.jsx:152–166`), tehát csapatonként nem is szűrhető. Ha nincs rá RLS, egy tetszőleges felhasználó **globálisan törölhet vagy módosíthat** gyakorlatokat (`deleteExercise`, `ExerciseLibrary.jsx:235`), amivel más csapatok munkáját is tönkreteheti.
- A `user_exercise_favorites` `user_id`-t tartalmaz — RLS nélkül egy felhasználó **más felhasználók kedvenceit** is olvashatná/írhatná.

**A lényeg:** lehet, hogy ezek a táblák a Supabase felületén kézzel be vannak állítva — DE ez a kódból **nem ellenőrizhető és nem reprodukálható**. Ha valaha új környezetbe telepítitek a migrációkból (pl. tesztkörnyezet), ezek a táblák **védelem nélkül** jönnek létre. Egy biztonsági rendszer csak akkor megbízható, ha a védelem verziókövetve, feketén-fehéren le van írva.

**Mit kell tenni:**
1. A Supabase felületén ellenőrizd mind a négy táblát: be van-e kapcsolva az RLS, és milyen policy-k vannak rajta.
2. Ami hiányzik, azt **írd le migrációként** a `supabase/migrations/`-ba (a meglévő `has_team_access` mintát követve, ahol értelmes; a `profiles`-nál pl. „csak a saját profilját + a saját csapata tagjait láthatja”; a `user_exercise_favorites`-nál „csak a saját `user_id`-jét”).
3. A globális `training_exercises`/`exercises` esetén döntsd el tudatosan: olvasás mindenkinek engedett, de **írás/törlés** csak megfelelő jogosultsággal.

**Munka:** ellenőrzés ~1 óra; a hiányzó policy-k megírása + tesztelése ~fél nap.

---

## 🟠 Fontos találatok

### F1 — Néma hibák: elhasalt betöltés = üres lista, nem hibaüzenet

**Hol:** jellemző minta több helyen, pl. `src/pages/ExerciseLibrary.jsx:103–107` (`catch { console.error(...) }` és a lista üresen marad), hasonlóan a legtöbb `fetch...` függvényben (Measurements, Rehabilitation, PlayerProgress stb.).

**Miért veszélyes (konkrét példa):** Ha a Supabase épp nem elérhető (hálózati hiba, karbantartás), a lekérdezés elbukik, a hibát a kód csak a fejlesztői konzolba írja (`console.error`), a felhasználó pedig **üres képernyőt** lát — pont úgy, mintha tényleg nem lenne adat. Egy **gyógytornász** ebből azt a következtetést vonhatja le, hogy a játékosnak **nincs rögzített sérülése/anamnézise**, pedig valójában csak a betöltés hasalt el. Egészségügyi kontextusban ez rossz döntéshez vezethet.

**Mit kell tenni:** minden adatbetöltésnél különítsd el három állapotot: *töltés alatt* / *hiba történt* / *tényleg üres*. Hiba esetén látható, magyar nyelvű üzenet + „Újratöltés” gomb. Az „üres állapot” szövege csak akkor jelenjen meg, ha a lekérdezés tényleg sikerült és 0 sort adott vissza.

**Munka:** ~1 nap (érdemes egy közös segéd-komponenst/hookot csinálni és mindenhol használni).

---

### F2 — Nyers hibaüzenetek `alert()`-ben, nincs globális hibavédő

**Hol:** 80+ `alert()` hívás a kódban (pl. `AttendanceCalendar.jsx:117,139` és `TeamAttendanceCalendar.jsx:233,255`: `alert('... Részletek: ' + errorMessage)`). Az `App.jsx`-ben nincs „error boundary” (globális hibavédő komponens).

**Miért veszélyes:**
- Az `errorMessage` a **nyers adatbázis-hibát** mutatja meg a felhasználónak. Ez zavaró, és néha belső részleteket (tábla/oszlopnevek, korlátozások) szivárogtat, ami támadónak információt ad a rendszer felépítéséről.
- Error boundary hiányában egyetlen váratlan renderelési hiba **fehér képernyőt** (teljes appleállást) okoz a felhasználónál, hibaüzenet nélkül.
- Az `alert()` blokkolja a böngészőt és elavult UX — komoly, egészségügyi adatokat kezelő terméknél nem elfogadható minőség.

**Mit kell tenni:** cseréld a nyers hibákat felhasználóbarát, magyar üzenetekre (a technikai részlet menjen csak a konzolba/naplóba). Az `alert()` helyett egységes „toast”/értesítő komponens. Az `App.jsx` köré tegyél egy React error boundary-t, ami hiba esetén barátságos „Valami hiba történt, töltsd újra” oldalt mutat.

**Munka:** ~1–2 nap (mennyiség miatt, de mechanikus).

---

### F3 — Gyenge jelszószabály, nincs kétfaktoros belépés

**Hol:** `src/pages/Auth.jsx:164` (`minLength={6}`), a szöveg is ezt mondja (`:169`).

**Miért veszélyes:** a 6 karakteres minimum, komplexitási követelmény nélkül, egészségügyi adatokat védő rendszerhez **túl gyenge**. Egy ilyen jelszót (`123456`, `jelszo`) automatizált próbálgatással könnyű feltörni. Ha egy edző fiókját megszerzik, a támadó a teljes csapat egészségügyi adatához hozzáfér.

**Mit kell tenni:** emeld a minimumot legalább 10–12 karakterre; a Supabase Auth beállításaiban kapcsold be a jelszó-erősség / „szivárgott jelszó” ellenőrzést; egészségügyi adatokhoz erősen ajánlott a **kétfaktoros hitelesítés (2FA/MFA)** bekapcsolása legalább az edzők/adminok számára.

**Munka:** kliens-oldali szabály ~10 perc; MFA bevezetése ~1 nap (Supabase támogatja).

---

### F4 — A meghívó-token a címsorban (URL-ben) utazik, és nincs e-mailhez kötve

**Hol:** `src/pages/JoinTeam.jsx` (`/join/:token` útvonal), `src/App.jsx:41`. A token generálása biztonságos (`team_membership_schema.sql:18` — 16 bájt véletlen, 7 nap lejárat, egyszer használható), a beváltás szerveroldali és rendben van (`invite_redemption_rpc.sql`).

**Miért veszélyes (konkrét példa):** Mivel a token a **webcím részeként** utazik (`.../join/abc123...`), ez a teljes cím bekerülhet:
- a felhasználó **böngésző-előzményeibe** (megosztott/céges gépen más is láthatja),
- a szerver / proxy **hozzáférési naplóiba** (a naplókat kezelő személyzet láthatja),
- ha a JoinTeam oldalon bármilyen külső hivatkozás lenne, a **Referer** fejlécen keresztül kiszivároghatna.
Aki megszerzi az élő tokent, az a lejárat előtt **csatlakozhat a csapathoz a meghívóban rögzített szerepkörrel** — a meghívó ugyanis nincs konkrét e-mail-címhez kötve, tehát „aki a linket birtokolja, az beléphet”.

**Mit kell tenni:** rövid távon ez elfogadható kockázat (rövid lejárat + egyszeri használat sokat segít). Erősítésként: (1) kösd a meghívót a címzett e-mail-címéhez (a beváltó függvény ellenőrizze, hogy a belépett user e-mailje egyezik-e); (2) a JoinTeam oldalon kerüld a külső hivatkozásokat / állíts be `Referrer-Policy: no-referrer`-t; (3) elfogadás után azonnal érvénytelenítsd a tokent (ez a `used_at` beállítással már megvalósul — jó).

**Munka:** e-mail-kötés ~fél nap; a többi ~1 óra.

---

## 🟡 Apróságok

### A1 — `has_team_access()` az `anon` szerepnek is meg van adva
`supabase/migrations/20260720120000_team_membership_schema.sql:68` — a függvény `EXECUTE` joga `anon`-ra is ki van osztva. Be nem jelentkezett felhasználónál nincs `auth.uid()`, így a függvény úgyis `false`-t ad, gyakorlati kockázat nincs, de a „csak amennyi kell” elv szerint elég lenne `authenticated`-nek adni. **Munka:** 5 perc.

### A2 — Hibaüzenet elárulja a migrációs fájl nevét a felhasználónak
`src/pages/MacrocyclePlanner.jsx:473` — az `alert()` egy egész „futtasd le a migration-t” útmutatót és fájlnevet mutat a végfelhasználónak. Ez fejlesztői üzenet, nem a felhasználónak való; belső felépítésre utaló infót szivárogtat. Cseréld semleges „a funkció átmenetileg nem elérhető” üzenetre. **Munka:** 10 perc.

### A3 — Hiányzó `.env` esetén az app csendben, működésképtelenül indul
`src/lib/supabase.js:6–10` — ha nincs URL/kulcs, csak egy `console.error` fut le, majd üres kulccsal létrejön a kliens, és minden lekérdezés némán elbukik. Egy telepítőnek nagyon nehéz kideríteni, miért „üres minden”. Érdemes ilyenkor látható, egyértelmű hibaoldalt mutatni. **Munka:** 20 perc.

---

## Kliens-oldali kockázatok — összegzés (amit külön vizsgáltam)

- **XSS (káros kód befecskendezése):** nincs `dangerouslySetInnerHTML` és nincs kézi HTML-beszúrás a kódban → a React alapból megszökteti a szövegeket, így ez a támadási felület **minimális**. ✅
- **`video_url` mező:** csak szövegként tárolódik és beviteli mező értékeként jelenik meg (`Calendar.jsx:1161`, `TacticTemplateEditor.jsx:218`), **nem** ágyazódik be `iframe`-ként és nem renderelődik kattintható linkként → jelenleg nem jelent kockázatot. (Ha később kattintható linket vagy beágyazást csináltok belőle, akkor kell majd ellenőrizni a `http(s)` sémát.) ✅
- **`file_url` (orvosi dokumentumok):** helyesen kezelve — a feltöltés csak az **elérési utat** tárolja (`DocumentUpload.jsx:64`), a megnyitás pedig **aláírt, lejáró linken** át történik (`PlayerProfileRehab.jsx` `openDocument` → `createSignedUrl` → `window.open`). A tárhelyre külön RLS-policy is van (`20260720120500_rehab_module_rls.sql:52–62`). Ez jó gyakorlat. ✅
- **PDF-export (`jspdf` / `html2canvas`):** csak kliens-oldalon, a felhasználó saját, már betöltött adataiból készít PDF-et. Nem küld adatot külső szerverre, nem jelent kiszivárgási kockázatot. ✅
- **Beégetett titkok:** nem találtam `service_role` kulcsot vagy jelszót a kódban. A `dist/` és a `DEPLOYMENT.md` a **publikus** anon kulcsot/URL-t tartalmazza, ez rendben van. ✅

---

## Éles használat valódi egészségügyi adatokkal — mi hiányzik (laikusnak)

Egészségügyi adat a GDPR szerint **„különleges kategória”** (Art. 9), a legszigorúbb védelmet igényli. Mielőtt éles, valódi játékos-adatokkal használnátok, ezek kellenek:

1. **K1 azonnali rendezése** — a mentések eltávolítása a projektmappából. Ez most a legnagyobb kockázat.
2. **Adatfeldolgozói szerződés (DPA) a Supabase-zel** és **EU-s régióban tárolás** — ellenőrizni kell, hogy a projekt EU-ban fut-e. Egészségügyi adatnál ez alap.
3. **Jogalap és beleegyezés** — a játékosoknak (kiskorúaknál a szülőnek) tájékoztatót és hozzájárulást kell adni arról, milyen egészségügyi adatot, miért, meddig tároltok.
4. **Audit-napló** — jelenleg nincs nyoma annak, **ki, mikor nézte meg vagy exportálta** egy játékos orvosi dokumentumát. Egészségügyi adatnál ez elvárás; enélkül egy visszaélés utólag nem bizonyítható.
5. **Törlési folyamat (a „törléshez való jog”)** — legyen az appban működő mód egy játékos és összes adatának végleges törlésére, kérésre.
6. **Titkosított, szabályozott mentés** — a biztonsági mentések titkosítva, hozzáférés-korlátozással, ne fejlesztői gépeken heverjenek.
7. **Erős belépés** — jelszó-erősítés (F3) és 2FA legalább az edzők/adminok számára.
8. **RLS teljes, kódban rögzített lefedettsége** (K2) — hogy a védelem újratelepíthető és auditálható legyen.

**Prioritási sorrend:** először K1 (ma), majd K2 és F1–F3 (élesítés előtt kötelező), utána a GDPR-adminisztráció (DPA, tájékoztató, audit-napló, törlés).

---

*A vizsgálat kizárólag a kódot és a migrációkat elemezte (read-only). A Supabase felületén kézzel beállított RLS-állapotot nem tudtam közvetlenül ellenőrizni — a K2 pontosan erre a „kódból nem látható” bizonytalanságra hívja fel a figyelmet.*
