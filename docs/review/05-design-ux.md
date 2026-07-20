# TeamFlow — Design és UX átvilágítás (kódoldali review)

Ez az áttekintés a forráskódból (JSX/Tailwind) készült, élő böngésző nélkül. A vizuális pontosságot (pixelre pontos megjelenés, animációk finomsága) élő teszttel is érdemes ellenőrizni — ahol ez fontos, külön jelzem.

Súlyozás: **Zavaró** = a felhasználó ténylegesen elakad vagy megzavarodik tőle, sürgősen javítandó. **Fejlesztendő** = működik, de rontja az élményt. **Finomítás** = kozmetikai/apró javítás.

---

## 1. ZAVARÓ hibák

### 1.1 Mobilon a legtöbb modulból nem lehet visszalépni a menübe
`src/pages/Dashboard.jsx:319-343` — A modult megjelenítő kód egy if/else-if láncot használ: ha `activeModule` értéke `rehab`, `macrocycle`, `teams`, `calendar`, `measurement`, `leaderboard`, `exercises`, `templates`, `matches`, `trainingload` vagy `progress`, akkor a program **csak magát a modult** rajzolja ki (pl. `<Teams />`), és **kihagyja a közös fejlécet**. A hamburger-menü gomb (mobilon a menü megnyitásához, `Menu` ikon) viszont **kizárólag** ebben a közös fejlécben létezik (`Dashboard.jsx:349-354`), ami csak akkor jelenik meg, ha a modul `home` vagy `profile`.

Ellenőriztem: egyik almodul-oldal (Teams.jsx, Calendar.jsx, Measurements.jsx stb.) sem tartalmaz saját hamburger-gombot — csak a Dashboard.jsx-ben van ilyen ikon a teljes `src/pages` mappában.

**Gyakorlati következmény**: mobil nézetben, ha a felhasználó pl. a "Csapatok" modulra kattint, az oldalsáv bezáródik, és **nincs mód újra megnyitni** — a felhasználó zsákutcába kerül, csak böngésző-vissza gombbal vagy oldal-újratöltéssel tud kimenekülni. Ez minden olyan mobilos felhasználót érint, aki a Dashboard főoldaláról vagy Profilról bármelyik másik 10 modulba lép.

Ezt élesen látni kellene egy telefonon/keskeny nézetben tesztelve is, de a kódból ez egyértelműen levezethető hiba, nem feltételezés.

**Javaslat**: a hamburger-gombot (és ideális esetben az egész fejlécet: oldalcím + TeamSelector) emeld ki a Dashboard szintjére úgy, hogy AZ MINDEN modulnál látszódjon, ne csak `home`/`profile` esetén. Legegyszerűbb: szüntesd meg a duplikált if-láncot (lásd 1.2), és mindig a közös `<header>` + `<main>{modul}</main>` szerkezetet használd.

### 1.2 Halott, soha le nem futó kód a routingban
`src/pages/Dashboard.jsx:440-458` — A `home`/`profile` ághoz tartozó blokkban van egy második ellenőrzés-sorozat (`{activeModule === 'teams' && <Teams />}`, `{activeModule === 'macrocycle' && <MacrocyclePlanner />}` stb.), ami **soha nem tud lefutni**, mert ha `activeModule` ezek egyike lenne, az 1.1-ben leírt külső if-lánc már korábban elkapta és kiléptette volna az egész ágból. Ez nem közvetlen felhasználói UX-hiba, de megtévesztő a jövőbeli fejlesztésnél (valaki itt próbálna módosítani egy modult, és nem értené, miért nincs hatása) — ezt jeleztem is a fejlesztői oldalnak, mert ez okozta valószínűleg az 1.1-es hibát is (a két routing-ág szétvált egymástól, és a fejléc csak az egyikbe került be).

**Javaslat**: egyetlen, egységes routing-szerkezetre cserélni: mindig fejléc + a kiválasztott modul komponens, felesleges duplikáció nélkül.

### 1.3 "Amnézis" — helytelen és következetlen orvosi terminológia
A helyes magyar szakkifejezés **"Anamnézis"** (kórelőzmény felvétele), ez viszont a teljes rehabilitációs modulban következetesen **"Amnézis"**-ként jelenik meg (ami valójában "amnézia", azaz emlékezetkiesés — teljesen más, és zavaró jelentésű egy sportolóknak/szülőknek szóló felületen):

- `src/components/DocumentUpload.jsx:185` — legördülő opció felirata: "Amnézis"
- `src/components/AnamnesisForm.jsx:125` — mentés utáni visszajelzés: `alert('✅ Amnézis sikeresen mentve!')`
- `src/components/AnamnesisForm.jsx:194` — form címe: "Amnézis szerkesztése" / "Új amnézis"
- `src/pages/Rehabilitation.jsx:121` — fő navigációs fül felirata: "Amnézis"
- `src/pages/Rehabilitation.jsx:232` — statisztika felirat: "Amnézissal"
- `src/pages/PlayerProfileRehab.jsx:101,180,218,221` — törlési visszajelzés és szekciócímek

A teljes kódbázisban **sehol** nem szerepel a helyes "Anamnézis" alak — ez tehát nem elgépelés egy helyen, hanem következetesen rossz elnevezés az egész modulban (fül, gombok, form, visszajelzések). Mivel ez orvosi/egészségügyi kontextusban jelenik meg, komoly bizalmi/hitelességi probléma.

**Javaslat**: egy `Anamnézis` → keresés-csere az összes megjelenített szövegen (a `value="anamnézis"` DB-kulcsokat/enumokat NE bántsd, csak a látható feliratokat, hacsak nincs adatbázis-oldali migrálás is tervben).

### 1.4 `alert()` és `confirm()` böngésző-dialógusok mindenhol
Megerősítve: **82 db `alert()` és 15 db `confirm()` hívás**, összesen 97 előfordulás, 19 fájlban (pl. `src/pages/Calendar.jsx`, `MacrocyclePlanner.jsx`, `Measurements.jsx`, `ExerciseLibrary.jsx`, `Teams.jsx`, `Matches.jsx`, `TrainingLoad.jsx`, `Leaderboard.jsx`, `PlayerProgress.jsx`, `PlayerProfileRehab.jsx`, és a `TeamMembersPanel.jsx`, `AttendanceCalendar.jsx`, `TeamAttendanceCalendar.jsx`, `DocumentUpload.jsx`, `QuickAddTrainingModal.jsx`, `TrainingSessionModal.jsx`, `TrainingLocations.jsx`, `AnamnesisForm.jsx` komponensekben).

A projektben **nincs semmilyen toast/notification könyvtár** telepítve (nincs `react-hot-toast`, `sonner`, saját Toast komponens sem található). Ez azt jelenti, hogy minden mentés/törlés/hiba után a böngésző natív, blokkoló felugró ablaka jelenik meg — ez megállítja a teljes UI-t, nem stílusozható, mobilon esetlenül jelenik meg, és 2000-es évekbeli hatást kelt (ahogy a feladat is jelezte).

Ellenpélda, ami jól működik: `src/pages/JoinTeam.jsx` — itt egy állapotgép (`loading`/`confirm`/`joining`/`success`/`error`) és inline szöveges visszajelzés kezeli a folyamatot, `alert()` nélkül. Érdemes ezt a mintát skálázni az egész alkalmazásra.

**Javaslat**: vezess be egy könnyű toast-rendszert (pl. saját kis komponens vagy `react-hot-toast`), és a törlés-megerősítéseket cseréld natív `confirm()` helyett egy stílusozott modal-dialógusra (a projektben már van modal minta, pl. `TrainingSessionModal.jsx`, `QuickAddTrainingModal.jsx` — ezek újrahasznosíthatók megerősítő ablaknak is).

---

## 2. FEJLESZTENDŐ

### 2.1 Túl sok, jelentés nélküli accent szín a Dashboardon
`src/pages/Dashboard.jsx:128-213` — a 12 modulkártya **10 különböző** Tailwind színt használ: `blue-500` (Dashboard), `green-500` (Csapatok), `purple-500` (Makrociklus), `indigo-500` (Naptár), `purple-600` (Gyakorlat Könyvtár), `teal-500` (Edzéssablonok), `pink-500` (Mérkőzések), `orange-500` (Mérési modul), `cyan-500` (1RM Kalkulátor), `yellow-500` (Ranglista), `green-500` (Progresszió — ismétlődik!), `red-500` (Rehabilitáció). Két külön lila árnyalat (`purple-500`/`purple-600`) és a `green-500` kétszeri felhasználása arra utal, hogy a színek nem tudatos rendszer szerint lettek kiosztva, hanem "amelyik még nem volt használva".

Ez nem segíti a tájékozódást (a szín nem hordoz jelentést: miért piros a Rehabilitáció, miért sárga a Ranglista?), és vizuálisan zajos, "konfetti" hatású főoldalt eredményez.

**Javaslat**: csoportosítsd a modulokat 3-4 funkcionális kategóriába (pl. Tervezés=kék/indigo család, Mérés/Teljesítmény=zöld/teal család, Csapat/Szociális=lila család, Egészség=piros/rózsaszín), és csak ezeken belül variálj árnyalatot. Ez 10 helyett kb. 4 alapszínre csökkentené a palettát, miközben modulonként még mindig megkülönböztethető marad.

### 2.2 Négy hatalmas, tab nélküli monolit-oldal
Ellenőriztem: `Calendar.jsx` (1524 sor), `MacrocyclePlanner.jsx` (1735 sor), `Measurements.jsx` (1194 sor), `ExerciseLibrary.jsx` (1322 sor) egyikében sincs semmilyen belső tab/view-mode state (`activeTab`, `viewMode` stb. minta egyikben sem található) — vagyis ezek tényleg egyetlen, folytonosan görgetett képernyőként épülnek fel, nem belső fülekre bontva. Egy ekkora JSX-fa jellemzően azt jelenti, hogy a felhasználó egyetlen oldalon szembesül a szűrőkkel, listákkal, szerkesztő űrlapokkal és statisztikákkal egyszerre — ez kognitív túlterhelést okoz, főleg laikus edzőknek.

**Javaslat**: vezess be belső tab-szerkezetet (pl. Measurements: "Rögzítés" / "Történet" / "Összehasonlítás" fülek; MacrocyclePlanner: "Áttekintés" / "Ciklus szerkesztő" / "Sablonok"). Ez kódszinten is könnyen hozzáadható state-tel, nem igényel architektúra-váltást.

*Ezt élő nézetben érdemes megerősíteni — a kód mennyisége nem garantálja, hogy vizuálisan is zsúfolt (lehet, hogy jól tagolt kártyákra van bontva scrollal), de a tab hiánya önmagában is arra utal, hogy nincs "elrejtett" tartalom, minden állandóan látható.*

### 2.3 Mobil-reszponzivitás nagyon egyenetlen
Megszámoltam az `sm:`/`md:`/`lg:`/`xl:` Tailwind prefixek előfordulását fájlonként. Több **kritikus, első benyomást adó** oldalon **nulla** reszponzív jelölő van:

- `src/pages/Auth.jsx` (bejelentkezés/regisztráció — ez az ELSŐ képernyő, amit minden felhasználó lát!)
- `src/pages/JoinTeam.jsx` (meghívó elfogadása)
- `src/pages/Profile.jsx`
- `src/components/TeamMembersPanel.jsx` (tagok + jogosultsági mátrix)
- `src/components/AttendanceCalendar.jsx`, `TeamAttendanceCalendar.jsx` (676 sor — jelenléti naptár)
- `src/components/BodyDiagram.jsx`, `DocumentUpload.jsx`, `TrainingSessionModal.jsx`, `QuickAddTrainingModal.jsx`

(Ezzel szemben pl. `Teams.jsx` és `MacrocyclePlanner.jsx` 14-14 reszponzív jelölőt tartalmaz, `Measurements.jsx` 13-at — ott legalább van törekvés a mobil-alkalmazkodásra.)

Fontos: a nulla reszponzív jelölő nem jelenti automatikusan, hogy tört a mobil nézet (lehet, hogy a flex/grid alapból is jól viselkedik), de nagy eséllyel azt jelenti, hogy **fix szélességű elemek, egymás mellé rendezett gombok/mezők** kis képernyőn összecsúszhatnak. Az Auth.jsx esete a legsúlyosabb, mert ez a beléptető kapu — ha itt gond van, a felhasználó soha nem jut tovább.

**Javaslat**: élő mobil teszttel (pl. Chrome DevTools 375px szélesség) validáld sorban ezeket a fájlokat, kezdve az Auth.jsx-szel.

### 2.4 Jogosultsági mátrix táblázat mobilon
`src/components/TeamMembersPanel.jsx:210-211` — a jogosultsági mátrix egy natív `<table>`, `overflow-x-auto` wrapperben (ez a minimális védelem megvan, tehát nem törik el, csak oldalra görgethető lesz). Nincs viszont kártya-alapú alternatív nézet kis képernyőre, és a fájlban egyáltalán nincs `sm:`/`md:` prefix — apró cellák, oldalra görgetés várható telefonon egy amúgy is sűrű adattáblánál (szerepek × modulok mátrix).

A `Measurements.jsx` ezzel szemben következetesen `overflow-x-auto` wrapperbe teszi mindhárom táblázatát (`Measurements.jsx:509,523,921,924,971,1022`) — ugyanez a minimál-védelem megvan itt is, csak reszponzív finomítás nélkül.

**Javaslat**: a jogosultsági mátrixnál fontold meg mobilon egy "egy szerep = egy kártya, benne a modulok legördülőkkel" elrendezést tábla helyett.

### 2.5 Betöltés-visszajelzés kétféle mintája
Van egy dedikált `LoadingSpinner` komponens (`src/components/LoadingSpinner.jsx` — teljes képernyős, `Loader2` ikonnal), amit 13 fájl használ. Emellett **13 helyen** egyszerű `"Betöltés..."` szöveg jelenik meg spinner nélkül (pl. `AttendanceCalendar.jsx:220`, `TeamMembersPanel.jsx:170`, `TeamSelector.jsx:13`, `Leaderboard.jsx:326`, `PlayerProfile.jsx:289`, `Rehabilitation.jsx:273`, `TrainingLoad.jsx:282` stb.) — ez inline, kisebb betöltéseknél (pl. egy panel frissítésekor) érthető, hogy nem akarunk teljes képernyős spinnert, de vizuálisan következetlen: van ahol pörgő ikon, van ahol csak szürke szöveg villan fel.

**Javaslat**: hozz létre egy kis, inline "MiniSpinner" változatot ugyanabból az ikonból, és azt használd konzekvensen a beágyazott (nem teljes oldalas) betöltéseknél a puszta szöveg helyett.

### 2.6 Onboarding-checklist statikus, nem követi a valós állapotot
`src/pages/Dashboard.jsx:417-436` — a "🚀 Következő lépések" kártya (csapat létrehozása, edzésterv készítése, mérés rögzítése) egy jó ötlet első használatra, de a kód szerint ez egy **statikus lista**, nincs hozzá állapotkövetés (pl. pipa, ha már van csapat) — a tapasztalt felhasználónak is örökké ugyanazt a "kezdő" listát mutatja a Dashboard.

**Javaslat**: kösd az egyes pontokat egyszerű feltételekhez (pl. van-e már csapat/játékos a `TeamContext`-ben), és pipáld/rejtsd el a teljesített lépéseket, vagy egyáltalán ne jelenjen meg a kártya, ha a felhasználónak már van aktív csapata.

---

## 3. FINOMÍTÁS

### 3.1 Apró class-hiba
`src/pages/JoinTeam.jsx:93` — `className="btn btn-primary w-full"`. A `btn` osztály nincs definiálva sehol (`src/index.css`-ben csak `.btn-primary`, `.btn-secondary`, `.input-field`, `.card` létezik) — nem okoz látható hibát, mert a `btn-primary` megvan mellette, de felesleges/megtévesztő maradvány kód.

### 3.2 Komponens-osztályok használata összességében rendben
Az `index.css`-ben definiált `.btn-primary` / `.btn-secondary` / `.card` / `.input-field` osztályok a legtöbb oldalon következetesen megjelennek — ez jó alap. A gombok egy része viszont továbbra is teljesen inline Tailwind-del épül (pl. egyedi színes akció-gombok modulkártyákon, fejlécekben) — ez elfogadható, amíg ezek valóban egyedi, kontextusfüggő gombok, nem duplikált elsődleges/másodlagos gomb-logika.

### 3.3 Pozitív példa: JoinTeam.jsx folyamat
`src/pages/JoinTeam.jsx` egy jól megtervezett, rövid folyamat: token beolvasása → egyetlen megerősítő kattintás → automatikus átirányítás sikeres csatlakozás után (1,5 mp késleltetéssel, `setTimeout(() => navigate('/dashboard'), 1500)`), érthető hibaüzenetekkel (lejárt/felhasznált/érvénytelen meghívó külön szöveggel). Ezt érdemes mintaként használni a többi folyamat (játékosfelvétel, mérés rögzítése) egyszerűsítésénél.

---

## Amit kódból nem lehet biztosan megítélni

- **Tényleges vizuális törés mértéke mobilon** — a reszponzív jelölők hiánya erős jelzés, de csak élő böngészőben (pl. 375px szélesség) dől el, hogy ténylegesen egymásra csúsznak-e elemek, vagy a flex/grid alapból túléli.
- **A 4 nagy oldal (Calendar, MacrocyclePlanner, Measurements, ExerciseLibrary) tényleges vizuális zsúfoltsága** — a sok kód nem feltétlenül jelent zsúfolt képernyőt, ha jól van kártyákra/szekciókra tagolva látványban; ezt élő nézetben kell megerősíteni.
- **Betűtípus- és térköz-skála pontos konzisztenciája** (pl. az összes `text-sm`/`text-lg` méret ténylegesen egységes vizuális ritmust ad-e) — ez leginkább vizuálisan, egymás mellé rakott képernyőkön ítélhető meg.
- **Animációk/átmenetek finomsága** (pl. sidebar `transition-transform duration-300`) — csak élőben érzékelhető, hogy megfelelő sebességű-e.
- **A színkontraszt tényleges akadálymentességi megfelelése** (WCAG) a slate-900 alapon — ehhez kontrasztmérő eszköz kell élő nézeten.
