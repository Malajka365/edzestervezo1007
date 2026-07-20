# Kódminőség átvilágítás — TeamFlow (2. szempont)

> Ez a dokumentum a `src/` mappa (pages, components, context, lib) kódminőségi
> átvilágítását tartalmazza. A cél: laikus (nem programozó) megrendelő számára
> érthetően bemutatni, hol vannak konkrét hibák, kockázatos megoldások,
> ismétlődő kódrészletek és következetlenségek — fájl:sor pontossággal, hogy
> egy fejlesztő könnyen megtalálja őket.
>
> Jelmagyarázat: 🔴 **Kritikus** — hibát/adatvesztést okozhat, sürgős.
> 🟠 **Fontos** — érdemes hamarosan javítani, de nem tűz-sürgős.
> 🟡 **Apróság** — kozmetikai / karbantarthatósági észrevétel.

---

## Vezetői összefoglaló

A TeamFlow egy React + Supabase alkalmazás, ahol a funkciók nagy része jól
követhető, egyszerű mintákat követ (form → mentés → adatbázis hívás). A fő
problémák nem "az app el fog romlani" jellegűek, hanem **következetlenségek
és felhasználói élményt rontó megoldások**, amik hosszú távon hibákhoz és
karbantartási nehézségekhez vezetnek:

1. **A böngésző natív `alert()`/`confirm()` ablakait használja a program szinte
   mindenhol** (82 `alert()` és 15 `confirm()` hívás, 26+ fájlban) — ezek
   csúnyák, nem branded, és mobilon rosszul néznek ki.
2. **A háttérben történő adatlekérések (fetch) hibáit a program elnyeli** —
   ha pl. nem sikerül betölteni a játékosokat internetkiesés miatt, a
   felhasználó csak egy üres listát lát, hibaüzenet nélkül (102 helyen).
3. **Van egy konkrét, reprodukálható hiba** a Csapatok oldalon: ha új
   játékost veszünk fel mezszám nélkül, az adatbázis-mentés elszállhat.
4. **Rengeteg szó szerint másolt kódblokk** van két-két fájl között
   (pl. jelenlét-naptár komponensek, PDF-exportok) — ha egy hibát csak az
   egyikben javítanak ki, a másikban tovább él.
5. A `Dashboard.jsx`-ben van egy kb. 40 soros **halott kódrész**, ami soha nem
   fut le (a fejlesztő valószínűleg elfelejtette törölni egy átalakítás
   után).

Ezek egyike sem az alkalmazást azonnal használhatatlanná tévő hiba, de együtt
jelentősen megnövelik a jövőbeli hibák és a karbantartás költségét.

---

## 1. Konkrét hibák és kockázatos megoldások

### 🔴 1.1 Üres mezszám mentése integer mezőbe — `src/pages/Teams.jsx`

**Hol:** `handleCreatePlayer` (114-136. sor) és `handleUpdatePlayer`
(138-166. sor), a `playerForm` állapot alapértéke a 38-44. sorban:

```js
const [playerForm, setPlayerForm] = useState({
  name: '',
  birth_date: '',
  position: '',
  jersey_number: '',   // <- üres string, nem kötelező mező (nincs "required")
  notes: '',
})
```

A mentéskor (117. sor) a teljes `playerForm` objektum egy az egyben bekerül
az `insert()`-be:

```js
.insert([{ ...playerForm, team_id: selectedTeam.id }])
```

**Mi a probléma:** A mezszám mező (598-606. sor) `type="number"`, de nincs
kitöltésre kényszerítve. Ha az edző új játékost visz fel mezszám nélkül,
a `jersey_number` értéke `""` (üres szöveg) marad, és ez kerül az
adatbázisba. Ha az oszlop típusa egész szám (integer) — ami tipikus egy
"mezszám" mezőnél, és a lista rendezése is (`order('jersey_number')`,
63-64. sor) erre utal — a Supabase/Postgres el fogja utasítani a mentést egy
kriptikus hibaüzenettel, amit a felhasználó `alert('Hiba történt a játékos
létrehozásakor')` formájában lát, információ nélkül, hogy *miért*.

**Miért fontos:** Ez egy nagyon gyakori művelet (új játékos felvétele), és a
mezszám tényleg opcionális adat egy csapatnál (pl. még nincs kiosztva).
Emiatt reális, hogy edzők rendszeresen belefutnak ebbe anélkül, hogy tudnák,
miért nem sikerül a mentés.

**Mit kellene tenni:** Mentés előtt az üres `jersey_number`-t (és hasonló
opcionális szám mezőket) `null`-ra kell konvertálni, ahogy ezt a
`src/pages/Matches.jsx` 408-411. sora helyesen csinálja:

```js
our_score: formData.our_score === '' ? null : parseInt(formData.our_score),
```

**Becsült munka:** 15 perc (2 helyen kell javítani: create és update).
**Hatás, ha nem javítják:** Edzők rendszeresen hibaüzenetet kapnak
mezszám nélküli játékos felvitelekor, ok nélkül újra és újra próbálkoznak.

---

### 🟠 1.2 A böngésző natív `alert()` / `confirm()` ablakainak túlzott használata

**Hol:** 82 `alert()` hívás 25 fájlban, 15 `confirm()` hívás 15 fájlban.
Néhány példa: `src/pages/MacrocyclePlanner.jsx` (15 db!), `src/pages/
Measurements.jsx` (10 db), `src/components/AttendanceCalendar.jsx`,
`src/components/TeamAttendanceCalendar.jsx`, `src/pages/ExerciseLibrary.jsx`,
`src/pages/Teams.jsx`, `src/components/TeamMembersPanel.jsx` stb. — gyakorlatilag
minden olyan oldal, ahol mentés/törlés van.

**Mi a probléma:** A böngésző beépített `alert()` és `confirm()` ablakai
csúnyák, nem illeszkednek az app dizájnjához (sötét, letisztult felület),
mobil böngészőkben kellemetlenül jelennek meg, és blokkolják a teljes
oldalt (a felhasználó semmi mást nem tud csinálni, amíg be nem zárja).
A `confirm()` törlés-megerősítés ("Biztosan törölni szeretnéd?") szövege sem
testre szabható stílusban, ami különösen kockázatos művelet (törlés) esetén
nem ideális.

**Miért fontos:** Nem hibát okoz, de a felhasználói élményt jelentősen rontja,
és "amatőr" benyomást kelt egy egyébként igényesen megépített felületen.

**Mit kellene tenni:** Egy közös, app-stílusú Modal/Toast komponens
bevezetése (pl. "Toast" a sikeres/hiba üzenetekhez, "ConfirmDialog" a
törlésekhez), amit minden oldal ugyanúgy importál. Ez egyben a lenti (2.
pont) kódismétlést is orvosolná.

**Becsült munka:** Közepes (1-2 nap): 1 közös komponens megírása + az
összes hívás lecserélése rá.
**Hatás:** UX javulás, konzisztensebb megjelenés, könnyebb jövőbeli
karbantartás.

---

### 🟠 1.3 Fetch-hibák néma elnyelése — szinte az egész `src/`

**Hol:** 102 helyen fordul elő olyan `catch (error) { console.error(...) }`
blokk, ami **nem** jelez semmit a felhasználó felé — csak a böngésző fejlesztői
konzoljára írja ki a hibát, amit egy edző soha nem lát. Példák:
`src/context/TeamContext.jsx` `fetchTeams()` (56-60. sor), `src/pages/
Teams.jsx` `fetchPlayers()` (68-72. sor), `src/pages/Rehabilitation.jsx`
`fetchPlayers()` (60-64. sor), és gyakorlatilag minden `fetchXxx()` függvény
az összes oldalon.

**Mi a probléma:** Ha megszakad az internetkapcsolat, lejár a munkamenet,
vagy hibázik egy lekérdezés, a felhasználó egyszerűen egy üres listát vagy
"Nincs adat" állapotot lát — nincs jelzés arról, hogy *hiba történt*,
szemben azzal, hogy *tényleg nincs adat*. Ez különösen zavaró lehet, mert a
mentési/törlési műveletek (a fenti 1.2 pont) **igen** kapnak `alert()`
hibaüzenetet, tehát a program következetlen: van, ahol szól, van ahol nem.

**Miért fontos:** A felhasználó nem tudja megkülönböztetni "üres az adat"
és "hiba történt, próbáld újra" eseteket, ami félrevezető lehet (pl. azt
hiheti, tényleg nincs egy csapatban játékos, holott csak nem töltődött be
a lista).

**Mit kellene tenni:** Legalább a kritikusabb fetch-eknél (csapatok,
játékosok, jogosultságok betöltése) egy egyszerű hibaállapot/üzenet
megjelenítése ("Nem sikerült betölteni az adatokat, próbáld újra").

**Becsült munka:** Közepes-nagy, mert sok helyen kell módosítani; érdemes
fokozatosan, a legfontosabb oldalakkal kezdeni (Csapatok, Naptár,
Dashboard).
**Hatás:** Kevesebb "miért üres ez?" jellegű támogatási kérdés.

---

### 🟡 1.4 Halott (soha le nem futó) kódrész — `src/pages/Dashboard.jsx`

**Hol:** A `DashboardContent` komponensben két, egymást kizáró elágazás van:
egy nagy `? :` lánc a 321-343. sorban (ami külön, header nélkül jeleníti meg
a `Teams`, `MacrocyclePlanner`, `Calendar`, `Measurements`, `Leaderboard`,
`ExerciseLibrary`, `TrainingTemplates`, `Matches`, `TrainingLoad`,
`PlayerProgress`, `Rehabilitation` modulokat), és emellett, a `main` tag-en
belül, egy **második**, ugyanezekre a modulokra vonatkozó feltétel-sorozat
a 440-458. sorban (`{activeModule === 'teams' && <Teams />}` stb.).

**Mi a probléma:** Mivel a felső `? :` lánc már lefedi ugyanazokat az
`activeModule` értékeket, a 440-458. sorban lévő blokk **soha nem tud
lefutni** — ha pl. `activeModule === 'teams'`, a kód már a 325-326. sornál
visszatér, a lenti kódig el sem jut a program. Ez nem okoz látható hibát,
de megtévesztő és felesleges kód, ami megnehezíti a jövőbeli módosítást
(egy fejlesztő könnyen azt hiheti, hogy a lenti blokk módosítása hatással
lesz valamire, pedig nem).

**Mit kellene tenni:** A lenti, soha le nem futó blokk törlése, vagy — ha a
szándék az volt, hogy bizonyos modulok (pl. `teams`) *is* megkapják a közös
fejlécet/TeamSelector-t — akkor a felső lista átgondolása.

**Becsült munka:** 10 perc (törlés), de érdemes megérteni előbb, hogy
szándékos volt-e valamikor (git history), mielőtt törlik.
**Hatás:** Tisztább, érthetőbb kód, kisebb tévedés-kockázat jövőbeli
módosításkor.

---

## 2. Ismétlődő logika (kódduplikáció)

### 🟠 2.1 `AttendanceCalendar.jsx` és `TeamAttendanceCalendar.jsx` — majdnem szó szerint másolat

**Hol:** `src/components/AttendanceCalendar.jsx` (388 sor) és
`src/components/TeamAttendanceCalendar.jsx` (676 sor).

**Mi ismétlődik:** A `getStatusColor()`, `getStatusLabel()` függvények
karakterről karakterre azonosak mindkét fájlban. A `handleSave()` és
`handleDelete()` logika (üres mezők `null`-ra konvertálása, insert/update
elágazás, `alert()` hívások) szinte szóról szóra megegyezik. A modal form
(dátum, státusz, edzés jellege, időpont, megjegyzés mezők) is duplikált.

**Miért fontos:** Ha egy hibát csak az egyik fájlban javítanak (pl. a fenti
1.1-hez hasonló üres-mező problémát), a másik fájlban tovább él a hiba.
Jelenleg is már két, egymástól kicsit eltérő verziója van ugyanannak a
logikának, ami azt jelzi, hogy már most is "szétcsúsztak" egymástól.

**Mit kellene tenni:** A közös logikát (`getStatusColor`, `getStatusLabel`,
mentés/törlés hívások) egy közös helyre (pl. `src/lib/attendance.js`)
kiszervezni, a két komponens csak a megjelenítésben térjen el (egyéni
játékos nézet vs. csapat-naptár nézet).

**Becsült munka:** Közepes (fél nap).
**Hatás:** Kevesebb duplikált hiba a jövőben, könnyebb karbantartás.

---

### 🟠 2.2 PDF export kód másolva — `Leaderboard.jsx` és `TrainingLoad.jsx`

**Hol:** `src/pages/Leaderboard.jsx` `exportToPDF()` (141-237. sor) és
`src/pages/TrainingLoad.jsx` `exportToPDF()` (123-197. sor).

**Mi ismétlődik:** Mindkettő ugyanazt a `jsPDF` + `autoTable` mintát
használja: cím/alcím generálás, azonos `headStyles`/`bodyStyles` színkódok
(`fillColor: [59, 130, 246]`), azonos hibaágak (`console.error` +
`alert('Nincs exportálható adat!')` / `alert('Hiba történt a PDF
exportálás során!')`), azonos fájlnév-generálási minta.

**Mit kellene tenni:** Egy közös `src/lib/pdfExport.js` segédfüggvény,
ami a táblázat fejlécét, stílusát és a fájlmentést egységesen kezeli,
paraméterként kapva a konkrét adatokat.

**Becsült munka:** Kicsi-közepes (2-3 óra).
**Hatás:** Egységes PDF-kinézet, kevesebb duplikált kód.

---

### 🟡 2.3 Form-modál minta ismétlődik szinte minden oldalon

**Hol:** `src/pages/Teams.jsx`, `src/pages/Matches.jsx`
(`MatchModal`), `src/pages/TrainingTemplates.jsx` (`TemplateModal`),
`src/components/TrainingLocations.jsx`, `src/components/
TrainingSessionModal.jsx` stb.

**Mi ismétlődik:** A "fixed inset-0 bg-black/50 flex items-center
justify-center z-50" overlay-minta, a fejléc + X gomb, a `useState`
alapú form kezelés, a "Mégse" / "Mentés" gombpár — ez majdnem minden
modálban egy az egyben ugyanaz (CSS class-ok szintjéig).

**Mit kellene tenni:** Egy közös `<Modal>` wrapper komponens bevezetése
(fejléc, bezárás, tartalom slot), amit minden form modál újrahasznosít.
Ez nem sürgős, de közepes távon jelentősen csökkentené a kódmennyiséget és
egységesítené a megjelenést.

**Becsült munka:** Nagy (a sok modál átalakítása miatt), de fokozatosan is
végezhető.
**Hatás:** Karbantarthatóság, kisebb bundle méret, konzisztensebb UI.

---

## 3. Következetlenségek

### 🟠 3.1 Kétféle megoldás ugyanarra a problémára: üres szám mező kezelése

Ahogy az 1.1 pontban részletezve: a `src/pages/Matches.jsx` (408-411. sor)
és a `src/components/AttendanceCalendar.jsx` / `TeamAttendanceCalendar.jsx`
(pl. `event_time: formData.event_time || null`) **helyesen** null-ra
konvertálja az üres opcionális mezőket mentés előtt, míg a
`src/pages/Teams.jsx` és a `src/pages/Measurements.jsx` egyes formjai
(pl. `handleCreateMeasurement`, 209-243. sor: a `value` mező nyers stringként
kerül be) ezt nem teszik meg következetesen. Ez azt jelzi, hogy nincs egy
közös, mindenhol használt "form → adatbázis" segédfüggvény, hanem
fájlonként újra kitalálják a megoldást — ebből fakadnak az 1.1-hez hasonló
hibák.

**Mit kellene tenni:** Egy közös helper (`cleanFormData(data, numericFields)`)
bevezetése, amit minden form-mentés használ.

---

### 🟡 3.2 Vegyes hibakezelési stílus: van ahol `alert()`, van ahol csak `console.error`

Ahogy az 1.2 és 1.3 pontokban leírva, ugyanabban a fájlban is előfordul,
hogy a mentés/törlés hibája `alert()`-tel jelenik meg, míg a betöltés
(fetch) hibája néma marad. Ez nem egyetlen fájl hibája, hanem az egész
kódbázisra jellemző következetlenség — érdemes egy egységes "hiba
megjelenítési szabályzatot" kialakítani (pl. minden felhasználó által
kezdeményezett művelet — mentés, törlés, feltöltés — hibája látható legyen,
minden háttérben történő betöltés hibája legalább egy diszkrét "Hiba
történt a betöltés során" üzenetet kapjon az adott kártyán/listán).

---

### 🟡 3.3 Névadási keveredés: magyar és angol azonosítók egymás mellett

**Hol:** Általánosan jellemző a kódbázisra — pl. `src/components/
AttendanceCalendar.jsx` 143-152. sor: a `status` mező értékei magyarul
vannak tárolva (`'jelen'`, `'hiányzik'`, `'beteg'`, `'sérült'`, `'egyéb'`),
míg a JavaScript változó- és függvénynevek angolul (`getStatusColor`,
`getStatusLabel`, `handleSave`). Hasonlóan az `AnamnesisForm.jsx`-ben az
adatbázis mezők egy része magyar értékkészletű enum (pl.
`sleep_position: 'has'`).

**Miért nem kritikus, de érdemes tudni:** Ez működik, és nem hibát okoz,
de megnehezíti egy új fejlesztő (vagy AI-alapú kódolóeszköz) számára a
kód megértését, mert nem lehet kitalálni angol névből, hogy milyen magyar
érétkeket vár egy mező. Hosszabb távon egy közös, dokumentált "enum
szótár" (pl. `src/lib/constants.js`) segítene, ami egy helyen sorolja fel
az összes ilyen magyar értékkészletet.

---

### 🟡 3.4 Dátumformázás következetes, de szétszórt

**Pozitívum:** A `toLocaleDateString('hu-HU')` formázás egységesen van
használva a legtöbb helyen (jó following!). Viszont ez a hívás
(`new Date(x).toLocaleDateString('hu-HU', {...})`) szinte minden fájlban
külön van megírva, egyedi opciókkal — egy közös `formatDate(date, style)`
segédfüggvény (`src/lib/`) csökkentené az ismétlődést, és egy helyen
lehetne módosítani, ha a formátumon változtatni kellene.

---

## 4. Elavult / törékeny megoldások

### 🟡 4.1 `window.confirm()` / `window.alert()` közvetlen használata

Lásd 1.2 pont — ez egy elavultnak számító minta modern webalkalmazásokban,
mert blokkoló, nem stílusozható, és teszteléskor/automatizáláskor is
problémás (a Playwright/Cypress-szerű tesztek natív dialógusokat nehezebben
kezelnek).

### 🟡 4.2 Index-alapú `key` prop listákban

**Hol:** Több helyen `key={index}`, `key={idx}` vagy `key={i}` szerepel
listák renderelésénél tömb-index alapján, ahelyett hogy egyedi
azonosítót (pl. adatbázis `id`) használnának. Példák:
`src/pages/Calendar.jsx` (757, 781, 878, 902. sor),
`src/pages/MacrocyclePlanner.jsx` (1145, 1166, 1187. sor),
`src/pages/ExerciseLibrary.jsx` (12+ helyen),
`src/components/TeamAttendanceCalendar.jsx` (362, 376, 399, 427, 439, 460,
498. sor).

**Mi a probléma:** Ha egy ilyen lista elemei törlődnek/átrendeződnek
(pl. jelenlét-bejegyzések egy napon), React összekeverheti, melyik DOM-elem
melyik adathoz tartozik, ami furcsa vizuális hibákhoz (pl. rossz elem villan
fel törléskor) vagy elavult adat megjelenítéséhez vezethet. A legtöbb
esetben itt viszonylag rövid, ritkán változó listákról van szó (pl. "napi 3
jelenlét"), így a gyakorlati kockázat alacsony, de jó gyakorlat lenne
mindenhol egyedi `id`-t használni, ahol az elérhető (pl.
`att.id` a `dayAttendance.map((att, i) => ...)` helyett).

**Becsült munka:** Kicsi, soronként pár perc, összesen 1-2 óra az egész
kódbázisra.

### 🟡 4.3 `GymTemplateEditor` / `BallTemplateEditor` belső state szinkronizációs kockázat

**Hol:** `src/components/GymTemplateEditor.jsx` (5. sor) és
`src/components/BallTemplateEditor.jsx` (5-11. sor): mindkettő
`useState(templateData?.exercises || [])` mintával inicializálja a saját
belső állapotát a `templateData` propból, de utána **nem** figyeli, ha a
szülő komponens (`TrainingTemplates.jsx`) frissíti a `templateData` propot
kívülről.

Jelenleg ez a gyakorlatban nem okoz hibát, mert a szülő modál minden
megnyitáskor újra létrejön (nincs perzisztens állapot), így a kezdőérték
mindig friss. **Ez viszont törékeny minta**: ha a jövőben valaki úgy
módosítja a `TrainingTemplates.jsx`-t, hogy a modál komponens megmarad és
csak a `template` prop változik (pl. "Előző/Következő sablon" gombokkal),
a szerkesztő komponensek "beragadnak" a régi adatnál. Érdemes megjegyezni
kódkommentben, vagy egy `useEffect`-tel szinkronizálni a propot az állapotba.

**Becsült munka:** Kicsi, ha most javítják; nagyobb, ha csak a hiba
jelentkezése után derül ki.

---

## Összegzés — javasolt prioritási sorrend

| # | Téma | Súly | Becsült munka |
|---|------|------|----------------|
| 1 | Üres mezszám mentése (`Teams.jsx`) | 🔴 Kritikus | 15 perc |
| 2 | Halott kód (`Dashboard.jsx`) | 🟡 Apróság | 10 perc |
| 3 | `alert()`/`confirm()` lecserélése saját komponensre | 🟠 Fontos | 1-2 nap |
| 4 | Fetch-hibák láthatóvá tétele | 🟠 Fontos | folyamatos, fokozatos |
| 5 | Attendance-naptár duplikáció összevonása | 🟠 Fontos | fél nap |
| 6 | PDF export duplikáció összevonása | 🟠 Fontos | 2-3 óra |
| 7 | Közös form-mentés helper (üres→null) | 🟠 Fontos | fél nap |
| 8 | Modál-komponens egységesítése | 🟡 Apróság (nagy volumen) | több nap, fokozatos |
| 9 | `key={index}` cseréje egyedi id-ra | 🟡 Apróság | 1-2 óra |

A lista tetején lévő 1-2 tétel gyors, kis kockázatú javítás. A 3-7 tételek
egy nagyobb "kódtisztítási" nekifutás részeként érdemesek, mert egymással
összefüggenek (közös helperek/komponensek bevezetése egyszerre több
duplikációt is megszüntet).
