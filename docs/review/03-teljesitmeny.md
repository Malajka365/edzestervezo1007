# 4. szempont: Teljesítmény és optimalizálás

**Mit jelent ez a laikusnak:** ez a fejezet arról szól, hogy (1) mennyi ideig kell várni, amíg az app egyáltalán betölt a böngészőben, és (2) mennyire pörög/akad a felület, miután már bent vagy. A két dolgot külön kell kezelni, mert más-más okuk van, és más-más javításuk.

Minden javaslatnál jelölöm:
- **FONTOS** = a felhasználó ténylegesen érzi a különbséget (várakozási idő, akadás)
- **„szép lenne"** = mérhető, de a mindennapi használatban valószínűleg fel sem tűnik

---

## Vezetői összefoglaló

| Terület | Jelenlegi állapot | Fő probléma | Várható hatás javítás után |
|---|---|---|---|
| Első betöltés | 1,65 MB JS + 1,24 MB kép egyben | Minden modul kódja + egy nagy PNG letöltődik, mielőtt bármit látnál | kb. **60-70%-kal kisebb** kezdő letöltés |
| Modulváltás | Minden modulra újra lefut az adatlekérés | Nincs semmilyen gyorsítótár, `React.lazy` sincs | modulváltás **1x helyett minden alkalommal** vár szerverre |
| Naptár görgetés | Minden hónap-/hétváltás újratölt mindent | A teljes szezon adatait mindig újra lekéri | érezhető villogás/vártatás hónapváltáskor |
| Adatbázis (RLS) | `has_team_access()` minden sornál lefut | Apró táblák → **valójában nem gond**, lásd lent | nincs teendő, csak egy apró tisztítás javasolt |

---

## 1. Bundle / betöltés (első oldalbetöltés sebessége)

### 1.1 FONTOS — Nincs code splitting: minden modul kódja egyben töltődik be

**Hol:** `src/pages/Dashboard.jsx:6-17` és `src/App.jsx:4-6`

A `Dashboard.jsx` a fájl tetején statikusan importálja mind a 11 modult (Teams, Measurements, TrainingLoad, Leaderboard, PlayerProgress, MacrocyclePlanner, Calendar, TrainingTemplates, Matches, ExerciseLibrary, Rehabilitation), és az `App.jsx` is statikusan importálja a Dashboard-ot és az Auth oldalt.

**Mit jelent ez a gyakorlatban:** amikor egy edző csak be szeretne jelentkezni és megnézni a mai edzést a naptárban, a böngészőnek **le kell töltenie és futtatnia kell** a PDF-exportáló, a grafikonrajzoló és a rehab-modul kódját is — pedig azokat talán meg sem nyitja aznap.

**Javaslat:** `React.lazy()` + `Suspense` minden modulra a `Dashboard.jsx`-ben:

```jsx
const Measurements = lazy(() => import('./Measurements'))
const Leaderboard = lazy(() => import('./Leaderboard'))
// stb. mind a 11 modulra
```

és a renderelésnél `<Suspense fallback={<LoadingSpinner />}>` köré csomagolva (a `LoadingSpinner` komponens már létezik: `src/components/LoadingSpinner.jsx`).

**Munka mennyisége:** kicsi-közepes (kb. 1-2 óra) — mechanikus átalakítás, a meglévő `activeModule === X ? <Y /> : ...` logika megmarad, csak az importok változnak lazy-re.

**Becsült hatás:** a kezdő letöltés JS mérete nagyjából **a jelenlegi 1,65 MB-ról 300-500 KB környékére** csökkenhet (a bejelentkezés + Dashboard váz + Auth), a többi modul csak igény szerint, kattintáskor töltődik be. Ez a leglátványosabb, egyben legolcsóbb javítás a listán.

### 1.2 FONTOS — 1,24 MB-os PNG, miközben van egy 8,5 KB-os SVG változat is a projektben

**Hol:** `src/components/BodyDiagram.jsx:3` — `import bodyDiagram from '../assets/body-diagram.png'`

Ez a legmeglepőbb lelet: a `src/assets/` mappában **már ott van** egy `body-diagram.svg` fájl, mindössze **8,5 KB** méretben, ugyanahhoz a testábrához (ez a rehab-modulban használt sérülés-jelölő testalak). A kód mégis a **1,24 MB-os PNG**-t importálja.

**Javaslat:** cseréld ki a `BodyDiagram.jsx` 3. sorában a `.png` importot `.svg`-re, és ellenőrizd vizuálisan, hogy a rehab-modulban ugyanúgy néz-e ki (SVG-nél a kattintási pontok kiszámítása ugyanúgy működik, mert az a konténer méretéből számol, nem a képfájlból).

**Munka mennyisége:** triviális (percek), de **kép-összehasonlítást igényel** — meg kell nézni, hogy az SVG vizuálisan tényleg megegyezik-e a PNG-vel (elképzelhető, hogy az SVG egy korábbi/eltérő verzió, ezért nincs még bekötve).

**Becsült hatás:** ha az SVG jó, ez önmagában **kb. 1,23 MB-tal** csökkenti a letöltendő adatot minden első betöltésnél — ez majdnem akkora nyereség, mint az összes JS code-splitting együttvéve.

### 1.3 FONTOS — jsPDF, jspdf-autotable és html2canvas mindig letöltődik, pedig csak PDF-exportnál kell

**Hol:** `src/pages/Leaderboard.jsx:14-15` (jsPDF, autoTable), `src/pages/PlayerProgress.jsx:26-28` (jsPDF, autoTable, html2canvas)

Ezek a könyvtárak (PDF-generálás, illetve grafikon képpé alakítása) csak akkor futnak, amikor a felhasználó rákattint a „PDF Exportálás" gombra — mégis a modul betöltésekor rögtön bekerülnek a kódba, mert a fájl tetején vannak importálva.

**Javaslat:** dinamikus import a gombra kattintáskor:

```jsx
const exportToPDF = async () => {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const { default: html2canvas } = await import('html2canvas')
  // ... a jelenlegi logika változatlanul
}
```

**Munka mennyisége:** kicsi (30-60 perc), 2 fájlt érint.

**Becsült hatás:** ha ezzel párhuzamosan a 1.1-es code splitting is megvalósul, ez tovább csökkenti a Leaderboard/PlayerProgress modulok saját chunk-méretét — ezek a könyvtárak (jsPDF + autotable + html2canvas) együtt durván **150-250 KB tömörítve**, amit csak a ténylegesen exportáló felhasználók töltenének le.

### 1.4 „szép lenne" — recharts lazy importja

**Hol:** `src/pages/PlayerProgress.jsx:14-25`

A `recharts` (grafikonkönyvtár) csak a Progresszió modulban használt, de ha az 1.1-es code splitting megvalósul, ez már automatikusan csak akkor töltődik be, amikor a felhasználó megnyitja a Progresszió modult — külön lazy importra nincs is szükség rá, a modul-szintű `React.lazy` ezt megoldja. Ezért ez önmagában nem külön feladat, csak megjegyzés, hogy az 1.1-es pont ezt is lefedi.

---

## 2. Adatlekérdezések (Supabase hívások)

### 2.1 FONTOS — Modulváltáskor minden adat újra letöltődik, nincs semmilyen cache

**Hol:** `src/pages/Dashboard.jsx:321-458` — a modulok feltételes renderelése (`activeModule === 'measurement' ? <Measurements /> : ...`) azt jelenti, hogy amikor elhagysz egy modult, az **teljesen leáll (unmountolódik)**, majd ha visszalépsz rá, **újra felépül és mindent újra lekér**.

Konkrét példa: `src/pages/Measurements.jsx:69-75` — a `useEffect` a `selectedTeam` változásra fut le, de mivel a komponens minden modulváltáskor újraépül, ez gyakorlatilag minden visszalépéskor lefut: 3 külön Supabase hívás (`fetchPlayers`, `fetchExercises`, `fetchMeasurements`), pedig a csapat játékosai és gyakorlatai percek óta nem változtak.

**Mit jelent ez a gyakorlatban:** ha egy edző oda-vissza kattingat a Naptár és a Mérési modul között (ami tipikus munkafolyamat), minden egyes váltásnál újra lekérdezi mind a 3-5 táblát, a `measurements` táblát is (ami 1264+ soros), holott a szűrők nem változtak.

**Javaslat (két szintű megoldás):**
- **Gyors, olcsó javítás:** ne unmountold a modulokat teljesen — pl. a `Dashboard.jsx`-ben CSS-sel rejtsd el az inaktívakat (`display: none`) ahelyett, hogy feltételes renderelés törölné őket. Ez megtartja a komponens állapotát (React nem unmountol), így visszalépéskor nem fut le újra a `useEffect`.
- **Alaposabb megoldás:** a gyakran együtt kellő adatokat (csapat játékosai, gyakorlatok listája) emeld fel a `TeamContext`-be, és ott egyszer, csapatváltáskor töltsd be — minden modul onnan olvasná, nem saját maga kérné le újra.

**Munka mennyisége:** a „display: none" megoldás közepes (fél nap, óvatosan kell tesztelni, mert néhány modul `useEffect`-je `currentDate`-re is figyel, ott ellenőrizni kell, hogy nem fut-e felesleges lekérés háttérben rejtett állapotban is). A context-alapú megoldás nagyobb munka (1-2 nap), de tisztább.

**Becsült hatás:** a leggyakoribb felhasználói mintára (oda-vissza váltás 2-3 modul között egy munkamenetben) ez **érezhetően** gyorsítja a modulváltást — az adatbetöltési villanás/várakozás nagy részét megszünteti.

### 2.2 FONTOS — Naptár: minden hónap-/hétváltás lekéri a teljes szezon adatát újra

**Hol:** `src/pages/Calendar.jsx:67-75`

```js
useEffect(() => {
  if (currentSeason && selectedTeam) {
    loadPlanningData()
    loadTrainingSessions()
    loadMatches()
    loadWeekLoadFactors()
    loadWeekTacticsTechnique()
  }
}, [currentSeason, selectedTeam, currentDate])
```

A `currentDate` szerepel a függőségi listában, tehát **minden alkalommal, amikor a felhasználó a „előző hónap" / „következő hónap" nyílra kattint**, mind az 5 lekérés újra lefut — pedig a `loadTrainingSessions` (127-141. sor) és a `loadMatches` (143-159. sor) a **teljes szezon** dátumtartományára kérdez rá (`gte(season.start_date)` / `lte(season.end_date)`), nem csak a látható hónapra. Vagyis ugyanazt a (potenciálisan sok hónapnyi) adatot tölti le újra és újra, valahányszor lapozol.

**Javaslat:** a szezon-szintű adatokat (edzések, mérkőzések) csak **szezonváltáskor** töltsd újra, ne `currentDate` váltáskor — vedd ki a `currentDate`-et a függőségi listából ott, ahol nincs rá ténylegesen szükség (a heti terhelésfaktorok — `loadWeekLoadFactors`, 161-199. sor — értelemszerűen igen, mert azok hét-specifikusak, de a szezon egészére vonatkozó `trainingSessions`/`matches` nem).

**Munka mennyisége:** kicsi-közepes (1-2 óra), a `useEffect` szétbontása két külön effektre (szezon-szintű vs. hét-szintű adatok).

**Becsült hatás:** a naptárban lapozás (ami tipikusan a leggyakrabban használt modul egyike) **érezhetően simább** lesz, kevesebb a villanás/várakozás lapozáskor.

### 2.3 „szép lenne" — Leaderboard: extra kör-utazás minden ranglista-lekérésnél

**Hol:** `src/pages/Leaderboard.jsx:71` (`fetchLeaderboard` függvényen belül)

```js
.eq('exercise_id', (await supabase.from('exercises').select('id').eq('name', 'Testsúly').single()).data?.id)
```

Ez egy **beágyazott, várakozó (await) lekérdezés** egy másik lekérdezés közepén — minden alkalommal, amikor a ranglista frissül (gyakorlatváltáskor), előbb megkeresi a „Testsúly" nevű gyakorlat ID-ját, csak utána tudja lekérni a testsúly-méréseket. Ez nem klasszikus N+1 (nem játékosonként fut le), hanem egy plusz szekvenciális hálózati kör-utazás minden ranglista-frissítésnél.

**Javaslat:** a „Testsúly" gyakorlat ID-ját cache-eld (pl. `useState` vagy akár a `TeamContext`-ben egyszer lekérve), ne kérdezd le újra minden gyakorlatváltáskor.

**Munka mennyisége:** kicsi (30 perc).

**Becsült hatás:** minimális — egy plusz, gyors (indexelt) lekérdezésről van szó, de mivel szekvenciális (nem párhuzamos), minden ranglista-frissítéshez hozzáad egy hálózati körutat (tipikusan 50-150ms mobil/lassabb neten). Nem érezhető nagy problémaként, inkább tisztább kód + apró nyereség.

### 2.4 „szép lenne" — Leaderboard és PlayerProgress kliens-oldali párosítása (nem valódi N+1, de pazarló)

**Hol:** `src/pages/Leaderboard.jsx:90-114`

A kód lekéri **az összes** testsúly-mérést és **az összes** 1RM-mérést a csapatra, majd JavaScript-ben, játékosonként végigszűri és rendezi mindkét listát (`bodyWeights?.filter(...)`, `measurements?.filter(...)`), hogy megtalálja a legfrissebbet. Ez működik, de adatbázis-oldalon egy `DISTINCT ON (player_id) ... ORDER BY measured_at DESC` lekérdezéssel (vagy egy view-val) ezt egy körben, kevesebb adatátvitellel meg lehetne oldani.

**Javaslat:** ha a csapatok mérete és a mérési előzmények hossza jelentősen nő (több száz mérés/csapat), érdemes egy Postgres view-t vagy RPC függvényt írni, ami szerver oldalon számolja ki „az utolsó mérés gyakorlatonként/játékosonként" adatot. Jelenlegi méretnél (kis csapatok, tucatnyi mérés/gyakorlat) ez **nem sürgős**.

**Munka mennyisége:** közepes (fél nap egy DB view/RPC megírásához és teszteléséhez).

**Becsült hatás:** ma valószínűleg elhanyagolható, mert a szűrt adatmennyiség (egy csapat egy gyakorlatának mérései) kicsi. Csak akkor válik fontossá, ha egy csapat mérési előzménye nagyon hosszúra nő.

### 2.5 „szép lenne" — `select('*')` a nagy `measurements` táblán

**Hol:** `src/pages/Measurements.jsx:118-122`, `src/pages/PlayerProgress.jsx:90-93`

```js
.select(`*, player:players(id, name, jersey_number), exercise:exercises(id, name, unit)`)
```

A `*` mindent lekér a `measurements` sorból, pedig a felület csak néhány mezőt jelenít meg (`value`, `one_rm`, `reps`, `measured_at`, `notes`). Ha a táblában idővel új, nagyobb mezők jelennének meg (pl. hosszabb szöveges napló), ez feleslegesen nagyobbá tenné a válaszokat.

**Javaslat:** sorold fel explicit a szükséges mezőket: `select('id, value, one_rm, reps, measured_at, notes, player:players(id,name,jersey_number), exercise:exercises(id,name,unit)')`.

**Munka mennyisége:** triviális (10 perc), de alacsony kockázatú karbantartás — bármikor megcsinálható.

**Becsült hatás:** a mai oszlopkészlettel elhanyagolható (nincs benne pl. nagy szöveges/JSON mező), inkább jövőbiztosítás, mint azonnali nyereség.

### 2.6 Megjegyzés — TeamContext lekérdezései rendben vannak

**Hol:** `src/context/TeamContext.jsx:36-96`

A `fetchTeams` és a `fetchRoleAndPermissions` két külön, egymás után futó lekérdezés (előbb ki kell derülnie a kiválasztott csapatnak, utána lehet lekérni a szerepkört/jogosultságokat rá) — ez **szükségszerű sorrend**, nem hiba. A `team_module_permissions` tábla is kicsi (csapatonként max ~27 sor, 3 szerepkör × 9 modul), így ez nem jelent terhelést. Itt nincs teendő.

---

## 3. Renderelés (mennyire pörög a felület használat közben)

### 3.1 FONTOS — Nagy lista virtualizáció nélkül a Mérési modulban

**Hol:** `src/pages/Measurements.jsx:565-582`

A mérési táblázat `measurements.map((m) => <tr>...</tr>)` formában **minden** lekért sort egyszerre renderel a DOM-ba, szűrés/lapozás nélkül. Ha egy csapatnak sok mérése van (a leírás szerint a tábla összesen 1264+ sort tartalmaz, egy csapatra szűrve is lehet több száz), és a felhasználó nem használ szűrőt, a böngészőnek **egyszerre több száz `<tr>`** elemet kell felépítenie és a DOM-ba illesztenie.

**Mit jelent ez a gyakorlatban:** a táblázat első megjelenése akadozhat/villoghat nagyobb csapatoknál, és a görgetés is nehezebbé válik régebbi/gyengébb gépeken, telefonokon.

**Javaslat:** vagy (a) alapértelmezett lapozás/laponkénti limit (pl. 50 sor + „Továbbiak betöltése" gomb), vagy (b) egy lista-virtualizáló könyvtár (pl. `@tanstack/react-virtual` vagy `react-window`), ami csak a látható sorokat rendereli ténylegesen a DOM-ba.

**Munka mennyisége:** közepes (fél nap egy egyszerű lapozáshoz, 1 nap egy virtualizált listához).

**Becsült hatás:** nagy (100+ soros) mérési listáknál **érezhetően** gyorsabb megjelenés és simább görgetés. Kis (< 50 soros) listáknál nem lenne észrevehető — érdemes a szűrők alapértelmezett állapotát is átgondolni (pl. legyen alapból az utolsó 30 nap kiválasztva, ne az „összes").

### 3.2 „szép lenne" — Drága számítás minden renderelésnél és minden ponthoz újraszámolva (PlayerProgress)

**Hol:** `src/pages/PlayerProgress.jsx:155-197` (`calculatePHVStatus`) és a felhasználási helyei: `303-341` (Tooltip) és `587-611` (a grafikon minden pontjának színezése)

A `calculatePHVStatus` függvény a teljes mérési sorozaton végigmegy, hogy megtalálja a „csúcsnövekedési" pontot (ez egy sporttudományi számítás a magasságméréseknél). A probléma nem maga a függvény, hanem hogy **nincs `useMemo`-val cache-elve**, és a grafikon **minden egyes pontjának renderelésekor újra lefut** (`dot={(props) => { ... calculatePHVStatus(chartData) ... }}`, 592-611. sor), plusz még egyszer minden Tooltip-megjelenítéskor is (307. sor). Ha egy játékosnak N magasságmérése van, ez gyakorlatilag N-szer számolja ki ugyanazt az N elemű sorozatot minden renderelésnél (a görbe rajzolásakor) — ez nem elképesztően nagy szám (jellemzően tucatnyi mérés/játékos/gyakorlat), de felesleges munka.

Projektszinten egyáltalán **nincs `useMemo` vagy `useCallback` használva** egyetlen page-ben sem (csak az `AnamnesisForm.jsx` komponensben van 6 db, ami más terület) — ez azt jelenti, hogy semmilyen drága számítás nincs cache-elve sehol az áttekintett modulokban.

**Javaslat:** vedd ki a `calculatePHVStatus(chartData)` hívást a dot-renderelő függvényből, számold ki egyszer a komponens tetején `useMemo`-val (`const phvStatuses = useMemo(() => calculatePHVStatus(chartData), [chartData])`), és a dot/tooltip csak az előre kiszámolt tömbből olvasson indexeléssel.

**Munka mennyisége:** kicsi (1-2 óra).

**Becsült hatás:** a mai tipikus adatmennyiségnél (egy játékos egy gyakorlatának mérései, jellemzően < 50 pont) **valószínűleg nem érezhető** a mindennapi használatban — de ha a `PlayerProgress` oldal lassúságra panaszt kapna, ez az első hely, ahol érdemes megnézni.

### 3.3 „szép lenne" — TeamContext értéke nincs memoizálva

**Hol:** `src/context/TeamContext.jsx:158-173`

A `value` objektum minden renderelésnél újra létrejön (`const value = { teams, selectedTeam, ... }`), `useMemo` nélkül. React Context esetén ez azt jelenti, hogy **minden `TeamProvider` renderelés** — pl. amikor bármi változik a context-ben — újrarendereli az összes `useTeams()`-et használó komponenst, akkor is, ha az adott komponens szempontjából releváns érték nem változott.

**Miért nem sorolom FONTOS-nak:** mivel a `Dashboard.jsx` egyszerre csak egyetlen modult renderel (feltételes renderelés, lásd 2.1 pont), a gyakorlatban kevés komponens fogyasztja egyszerre a context-et, így a felesleges renderelések száma ma korlátozott. Ha viszont a 2.1-es javaslat (display:none-os megoldás, hogy több modul egyszerre a DOM-ban maradjon) megvalósul, ez a pont **FONTOS-sá válik**, mert akkor egyszerre több modul is figyelné a context-et.

**Javaslat:** `const value = useMemo(() => ({ teams, selectedTeam, ... }), [teams, selectedTeam, loading, currentUserRole, currentUserPermissions, permissionsLoading, session])`.

**Munka mennyisége:** triviális (15 perc).

**Becsült hatás:** ma minimális, de olcsó biztosíték — érdemes a 2.1-es javaslattal együtt bevezetni.

---

## 4. Adatbázis / RLS oldal

### 4.1 Explicit válasz: kell-e index a `has_team_access()` függvényhez? — **Nem, a mai méreteknél nem szükséges**

**Hol:** `supabase/migrations/20260720120000_team_membership_schema.sql:45-65`

A függvény minden sor-ellenőrzésnél lefut (mert RLS policy-kban van használva `USING (has_team_access(...))` formában — lásd pl. `supabase/migrations/20260720120400_matches_measurement_module_rls.sql:37-53`), és ez elsőre ijesztően hangzik nagy táblákon (mint a 1264+ soros `measurements`). A valóságban viszont:

- a `team_members` táblán van index a `team_id`-ra **és** a `user_id`-ra is (`idx_team_members_team_id`, `idx_team_members_user_id` — a séma-fájl 12-13. sora),
- a `team_module_permissions` táblának `(team_id, role, module_key)` az elsődleges kulcsa, ami maga is index,
- mindkét tábla **csapatonként pár tucat sornál nem nagyobb** (egy csapatnak jellemzően pár tagja van, és 3 szerepkör × 9 modul = 27 jogosultsági sor).

Vagyis a `has_team_access()` minden hívása egy nagyon gyors, indexelt keresés két apró táblában — még akkor is, ha ezt 1000+ alkalommal hívja meg a Postgres egy nagy `measurements` lekérdezésnél, ez összesen is milliszekundumos nagyságrend, nem érezhető a felhasználó számára. **Itt nincs teendő.**

### 4.2 „szép lenne" — a `measurements` RLS policy feleslegesen kerülőúton számolja ki a csapatot

**Hol:** `supabase/migrations/20260720120400_matches_measurement_module_rls.sql:37-41`

```sql
CREATE POLICY "view measurements by module permission" ON public.measurements
  FOR SELECT USING (
    has_team_access((SELECT team_id FROM public.players WHERE id = player_id), 'measurement', 'view')
    OR has_team_access((SELECT team_id FROM public.players WHERE id = player_id), 'stats', 'view')
  );
```

Ez a policy **minden egyes** `measurements` sornál lefuttat egy alkérdést a `players` táblára, hogy kiderítse a csapatot — pedig maga a `measurements` tábla **már tartalmaz egy `team_id` oszlopot** (ezt tudjuk, mert az alkalmazás kódja közvetlenül szűr rá: `src/pages/Measurements.jsx:123` — `.eq('team_id', selectedTeam.id)`, és beszúráskor is közvetlenül állítja: `src/pages/Measurements.jsx:221` — `team_id: selectedTeam.id`). A policy tehát egy már meglévő oszlop helyett egy plusz alkérdéssel számolja ki ugyanazt az értéket, ráadásul **kétszer** (a két `has_team_access` hívás miatt az `OR` két ága miatt).

**Javaslat:**
```sql
CREATE POLICY "view measurements by module permission" ON public.measurements
  FOR SELECT USING (
    has_team_access(team_id, 'measurement', 'view')
    OR has_team_access(team_id, 'stats', 'view')
  );
```
(feltéve, hogy a `measurements.team_id` mindig szinkronban van a `players.team_id`-vel — ezt érdemes egy adatintegritási ellenőrzéssel/constraint-tel is biztosítani, ha még nincs).

**Munka mennyisége:** kicsi (egy migrációs fájl, 15-30 perc + tesztelés, mert RLS policy módosítás — óvatosan, staging környezetben érdemes először).

**Becsült hatás:** a mai adatmennyiségnél (1264+ sor, apró segédtáblák) **elhanyagolható**, mert — mint a 4.1 pontban írtam — a `players` tábla is indexelt a PK-ján (`id`), így az alkérdés is gyors. Inkább tisztább, kevesebb munkát végző lekérdezés, mint érezhető gyorsulás.

### 4.3 „szép lenne" — nincs látható index-terv a `measurements` táblára, mert a tábla létrehozása nincs verziókövetve

**Hol:** a `measurements`, `players`, `exercises` táblák `CREATE TABLE` parancsa **nem található** a repóban (sem a `supabase/migrations/` mappában, sem a gyökérben lévő `SETUP_*.sql` fájlokban — azok más táblákat hoznak létre: `training_templates`, `training_sessions`, `matches`, `training_exercises`).

Ez azt jelenti, hogy ezt a három, a mérési modul szempontjából kulcsfontosságú táblát valószínűleg közvetlenül a Supabase felületén (SQL Editor) hozták létre, verziókövetés nélkül — így **nem tudom innen a kódból ellenőrizni**, hogy van-e index a `measurements(team_id)`, `measurements(player_id, exercise_id)` vagy `measurements(measured_at)` oszlopokon.

**Javaslat:** a Supabase Dashboard → Database → Indexes nézetben ellenőrizni kell, hogy létezik-e index a `measurements` táblán legalább a `team_id` oszlopra (mert erre szűr minden lekérdezés: `Measurements.jsx:123`, `PlayerProgress.jsx:94-95` player_id+exercise_id-re szűr, `Leaderboard.jsx:70,80` szintén team_id-re). Ha nincs, egy egyszerű migráció hozzáadható:
```sql
CREATE INDEX IF NOT EXISTS idx_measurements_team_id ON public.measurements(team_id);
CREATE INDEX IF NOT EXISTS idx_measurements_player_exercise ON public.measurements(player_id, exercise_id);
```
és a jövőben érdemes minden új táblát migrációs fájlban létrehozni, hogy ez visszakövethető legyen.

**Munka mennyisége:** ellenőrzés 10 perc (Supabase Dashboard), ha hiányzik az index, a pótlása is 10 perc + migráció írása.

**Becsült hatás:** **ha valóban hiányzik** az index a `team_id`-n, ez 1264+ soros táblánál már **FONTOS**-sá válna (a lekérdezés teljes táblát olvasna be szűrés helyett) — de mivel Supabase/Postgres alapból nem tesz automatikusan indexet idegen kulcsokra, ez valós kockázat, amit **mindenképpen érdemes leellenőrizni**, még akkor is, ha jelenleg nem tudjuk innen megerősíteni.

---

## Összefoglaló prioritási sorrend (ha csak korlátozott idő van)

1. **PNG → SVG csere** a testábrán (1.2) — percek alatt kb. 1,2 MB megtakarítás
2. **`measurements` tábla index-ének ellenőrzése** a Supabase Dashboardon (4.3) — 10 perc, de ha hiányzik, komoly hatása lehet
3. **`React.lazy` a Dashboard modulokra** (1.1) — fél nap, nagy hatás az első betöltésre
4. **jsPDF/html2canvas lazy import** (1.3) — 1 óra, tovább csökkenti a modul-chunkokat
5. **Naptár felesleges újralekérése lapozáskor** (2.2) — 1-2 óra, érezhető simaság-javulás a leggyakrabban használt modulban
6. **Modulváltás cache/display:none** (2.1) — nagyobb munka, de a mindennapi használat érzetét a legjobban javítja
7. A többi „szép lenne" pont karbantartás jelleggel, amikor úgyis nyúlnak az adott fájlhoz
