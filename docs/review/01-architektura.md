# TeamFlow – Architektúra átvilágítás (1. és 3. szempont)

**Készült:** 2026-07-20
**Vizsgált verzió:** `master` ág, a "team membership + permission matrix" (PR #1) mergelése után
**Kinek szól:** a megrendelőnek (nem programozó) – ezért minden szakkifejezést egyszerű példával magyarázok.

---

## 1. Rövid összefoglaló (a lényeg 2 percben)

A TeamFlow egy **működő, jól strukturált alap**, amit egy modern, elterjedt eszközkészletre építettek (React + Vite + Supabase + Tailwind). Egy kézilabda-edző csapatait, edzésterveit, méréseit, naptárát és rehabilitációját kezeli, több felhasználóval és szerepkör-alapú jogosultságokkal. Ez önmagában jó hír: nincs benne egzotikus, ritka technológia, egy átlagos React-fejlesztő gyorsan otthon érzi magát benne.

A gond nem a technológia-választásban van, hanem abban, **hogyan van elrendezve a kód**. Öt tünet jelzi, hogy a projekt kinőtte a jelenlegi szerkezetét:

1. **Óriás-fájlok.** A négy legnagyobb oldal (Makrociklus 1735 sor, Naptár 1524, Gyakorlat Könyvtár 1322, Mérések 1194) egyenként egy egész kisebb program. Ezekben minden egy helyen van: adatlekérés, számítási logika, PDF-export, 5-6 felugró ablak és a megjelenítés. Ez lassítja a fejlesztést és növeli a hibázás esélyét.
2. **Nincs "közlekedési rendszer" (routing).** Az app nem valódi URL-ekkel vált modult, hanem egyetlen belső kapcsolóval (`Dashboard.jsx`). Következmény: **nem lehet linket küldeni egy adott oldalra**, a böngésző Vissza gombja nem az elvárt módon működik, és induláskor az egész alkalmazás egyben letöltődik.
3. **Nincs középső "adat-réteg".** A programban **123 helyen, 25 különböző fájlban** hívják közvetlenül az adatbázist. Ugyanazt a játékoslistát legalább 10 fájl külön-külön kéri le. Ha az adatbázis megváltozik, sok helyen kell egyszerre javítani.
4. **Nincs közös komponens-készlet.** A felugró ablakokat (modálokat) **26 helyen, 14 fájlban** kézzel, egyesével rakták össze. Nincs egyetlen újrahasznosított "Modal", "Kártya" vagy "Űrlap" építőelem.
5. **A jogosultság-ellenőrzés féloldalas.** A szerepkör-alapú jogosultság jelenleg főleg csak **elrejti** a menüpontokat, de a legtöbb modul belsejében **nem tiltja le a szerkesztést** – csak a Csapatok oldal ellenőrzi ténylegesen.

Egyik sem "ég a ház" jellegű hiba – az app működik. De ezek olyan **strukturális adósságok**, amelyek minden új funkciónál egyre több időt és kockázatot jelentenek. A jó hír: mind fokozatosan, a működés megszakítása nélkül orvosolható. A javasolt sorrend a lenti fejezetek végén található.

---

## 2. Általános projektkép

### 2.1 Miből áll (a "hozzávalók")

| Réteg | Mit használ | Egyszerű magyarázat |
|---|---|---|
| Felület (frontend) | React 18 + Vite | A React a képernyőt építi fel; a Vite a fejlesztői "motor", ami gyorsan összerakja és futtatja. |
| Megjelenés | TailwindCSS | Stílus-eszköz: a színeket/méreteket rövid "címkékkel" adják meg közvetlenül a kódban. |
| Háttér (backend) | Supabase | Kész felhő-szolgáltatás: adatbázis (PostgreSQL) + belépés (Auth) + fájltárolás (Storage) egyben. Nincs saját szerver-kód, ezt a projekt nem is írta meg – ez egyszerűsítés. |
| Navigáció | react-router-dom | Az oldalak közti közlekedést kezelné – de jelenleg alig használják (lásd 3.2). |
| Grafikonok | recharts | A fejlődési/mérési diagramokhoz. |
| PDF | jspdf + html2canvas | Az edzésterv PDF-be mentéséhez. |

**Nincs TypeScript** (a típus-ellenőrző, ami elkapná az elgépeléseket még futtatás előtt) és **nincs automata teszt**. Ez a fejlesztést gyorsabbá teszi rövid távon, de minden változtatásnál nagyobb a "véletlenül elrontok valami mást" kockázat. Egy ekkora projektnél (kb. 17 000 sor) ez már érezhető.

### 2.2 Mi a fő célja

Kézilabda-edzőknek szánt, **egyben-mindent** menedzsment-eszköz: csapatok és játékosok, éves periodizáció (makrociklus), edzésnaptár, gyakorlat-könyvtár, sablonok, mérkőzések, teljesítménymérés, ranglista, fejlődéskövetés és rehabilitáció – többfelhasználós, szerepkörös hozzáféréssel (edző / erőnléti edző / gyógytornász).

### 2.3 Mennyire átlátható a felépítése

A mappaszerkezet **tiszta és logikus**, ez dicséret:

```
src/
  pages/       – a nagy modul-oldalak (17 db)
  components/  – újrahasznált részek (15 db, pl. naptárak, sablon-szerkesztők)
  context/     – TeamContext.jsx (a globális "közös memória")
  lib/         – supabase.js (kapcsolat) + permissions.js (jogosultsági szabályok)
```

Aki ránéz, kb. kitalálja, mi hol van. A `lib/permissions.js` (56 sor) kifejezetten jól megírt, olvasható, magyar kommentekkel – ez a mintaértékű rész.

**A probléma nem a mappák szintjén van, hanem a fájlokon belül:** néhány fájl aránytalanul nagyra hízott (lásd 2.4), és a felelősségek nincsenek szétválasztva.

### 2.4 Feleslegesen bonyolult / nehezen karbantartható részek

**Az óriás-oldalak.** Nézzük konkrétan, mennyi minden van egyetlen fájlban – `MacrocyclePlanner.jsx` (1735 sor):

- 21 különböző állapot-változó (`useState`) mindjárt a fájl tetején (`MacrocyclePlanner.jsx:23–60`) – ezek együtt kezelése önmagában nehéz.
- Egy nagy, kézzel beírt periodizációs "adat-táblázat" a kódba ágyazva (`trainingCategories`, `MacrocyclePlanner.jsx:63-tól`).
- ~20 különböző művelet-függvény egymás alatt: `fetchSeasons`, `loadSeason`, `updateSeason`, `deleteSeason`, `exportToPDF`, `saveTemplate`, `loadTemplate`, `handleCellClick`, `handleDailyClick`, `savePlanning`… (`MacrocyclePlanner.jsx:221–848`).
- 5 külön felugró ablak (létrehozás / szerkesztés / törlés / sablon mentés / sablon betöltés) ugyanabban a fájlban.

Ugyanez a minta a `Calendar.jsx`-ben (1524 sor), ráadásul egy **automatikus mentés időzítővel** (`saveTimeouts` állapot, `Calendar.jsx:39`), ami a bonyolultság egyik forró pontja: ha itt valami elromlik, nehéz megtalálni, hol.

**Hasonlat:** ez olyan, mint egy konyha, ahol a hűtő, a tűzhely, a mosogató, az éléskamra és az étkezőasztal egyetlen 4 m²-es helyiségbe van bezsúfolva. Minden ott van, működik is – de főzni benne kényelmetlen, és ha ketten dolgoznátok egyszerre, folyton egymásba ütköznétek.

---

## 3. Részletes architektúra-megállapítások

Minden pontnál: **mi a probléma → miért fontos → mit kellene tenni → kb. mekkora munka → milyen hatása lenne.**

### 3.1 Az óriás-oldalakat fel kell darabolni

**Mi a probléma.** 4 fájl 1194–1735 sor közötti, és mindegyik egyszerre csinál 4-5 különböző dolgot (adatlekérés, üzleti logika, több felugró ablak, PDF, megjelenítés). Konkrétan: `MacrocyclePlanner.jsx` 1735 sor, `Calendar.jsx` 1524, `ExerciseLibrary.jsx` 1322, `Measurements.jsx` 1194.

**Miért fontos.** Minél nagyobb egy fájl, annál:
- nehezebb megérteni és biztonságosan módosítani (könnyű véletlenül elrontani egy másik funkciót);
- lassabb benne dolgozni (a fejlesztő és a szerkesztő is);
- nagyobb az esély, hogy két fejlesztő egymás munkáját írja felül.

Automata tesztek hiányában (lásd 2.1) ez a kockázat felerősödik: nincs "biztonsági háló", ami jelezné, ha egy módosítás mást elrontott.

**Mit kellene tenni.** Nem újraírni – **szétszedni**. Egy-egy óriás-oldalból le lehet választani:
- a felugró ablakokat külön komponensekbe (pl. `SeasonEditModal.jsx`, `TemplateModal.jsx`);
- az adatlekérő függvényeket egy "hook"-ba vagy az adat-rétegbe (lásd 3.3);
- a beágyazott adat-táblázatokat (pl. `trainingCategories`) külön adat-fájlba (`lib/`).
Cél: egyetlen oldal-fájl se legyen ~400 sornál hosszabb.

**Kb. mekkora munka.** Fájlonként 1–2 nap egy tapasztalt fejlesztőnek, óvatosan, lépésenként. Négy fájlra összesen ~1–1,5 hét. Fokozatosan végezhető, nem kell egyszerre.

**Milyen hatása.** Sokkal olvashatóbb kód, gyorsabb és biztonságosabb fejlesztés, kisebb hibázási esély. A felhasználó ebből közvetlenül semmit nem lát – ez "belső" befektetés a jövőbe.

### 3.2 A modulváltás nem valódi URL-alapú navigáció

**Mi a probléma.** Az egész alkalmazás egyetlen URL-en (`/dashboard`) fut. A modulok között nem valódi címekkel (pl. `/naptar`, `/meresek`) váltanak, hanem egyetlen belső kapcsoló-változóval: `activeModule` (`Dashboard.jsx:40`). A `Dashboard.jsx` gyakorlatilag egy kézzel írt, több mint 10 ágú elágazással dönti el, melyik modult mutassa (`Dashboard.jsx:320–483`). Minden modul-oldal ebbe az egyetlen fájlba van beimportálva (`Dashboard.jsx:6–17`).

Ráadásul a jelenlegi elágazás **részben duplikált / holt kód**: a modulok egy része a felső elágazásban is szerepel (`Dashboard.jsx:321–342`), majd lentebb, a "home" ágban **még egyszer** ki van írva (`Dashboard.jsx:440–460`) – ez utóbbiak sosem futnak le. Ez zavaró és karbantartási hibaforrás.

**Miért fontos (laikusul).** A valódi URL olyan, mint egy ház szobáinak a saját címe. Ha nincs:
- **Nem lehet linket küldeni.** Nem tudod elküldeni a segédedzőnek, hogy "nézd meg ezt a mérési oldalt" – mindenki a főoldalon landol, és kézzel kell odakattintania.
- **A böngésző Vissza/Előre gombja nem az elvárt módon működik**, és frissítéskor (F5) elveszik, hol jártál.
- **Nem lehet könyvjelzőzni** egy adott modult.
- **Teljesítmény:** mivel minden modul egy csomagba (bundle) van betöltve, az app indulásakor a felhasználó gépe letölti az összes modult (a PDF-készítőt, az összes naptárat stb.) akkor is, ha csak be akar jelentkezni. Ez lassabb első betöltést jelent, főleg mobilon.

Érdemes hozzátenni: az `App.jsx` **már használ valódi routert** (`react-router-dom`), csak épp csupán 4 útvonalra (`/auth`, `/join/:token`, `/dashboard`, `/`). Tehát az eszköz megvan, csak a modulváltásra nem alkalmazzák.

**Az egyszerűség mint előny (a másik oldal).** A mostani megoldásnak van egy előnye is: **egyszerű**. Egy state-változó könnyen érthető, nem kell útvonalakat karbantartani, és belépés-védelemnél nincs esély, hogy valaki "kilinkeljen" egy nem engedélyezett oldalra közvetlen URL-lel. Kis appnál ez teljesen jó döntés. A TeamFlow viszont már kinőtte ezt a méretet.

**Mit kellene tenni.** Fokozatosan átállni valódi útvonalakra (`/dashboard/naptar`, `/dashboard/meresek` stb.), és a modulokat "igény szerint" (lazy loading) betölteni. Első, olcsó lépésként legalább a duplikált/holt elágazást (`Dashboard.jsx:440–480`) ki kell takarítani.

**Kb. mekkora munka.** A holt kód takarítása: pár óra. A teljes URL-alapú átállás lazy loadinggal: ~3–5 nap. A kettő szétválasztható.

**Milyen hatása.** Megoszthatóság (linkelés), helyes Vissza gomb, könyvjelzők, és gyorsabb első betöltés. Ez a felhasználó számára is **közvetlenül érezhető** javulás.

### 3.3 Hiányzik a középső "adat-réteg" (adatlekérés + gyorsítótár)

**Mi a probléma.** A program **123 helyen, 25 fájlban** hívja közvetlenül az adatbázist (`supabase.from(...)`). Nincs közéjük iktatva egy "adat-réteg", ami egy helyen kezelné a lekéréseket. Például a **játékoslistát legalább 10 különböző fájl** kéri le egymástól függetlenül (`Teams.jsx`, `Measurements.jsx`, `Leaderboard.jsx`, `PlayerProgress.jsx`, `PlayerProfile.jsx`, `Rehabilitation.jsx`, `TrainingLoad.jsx`, `TeamMembersPanel.jsx`, `TeamAttendanceCalendar.jsx`, `TeamContext.jsx`).

Az egyetlen globális "közös memória" a `TeamContext.jsx` (183 sor), és az **csak a csapatokat és a jogosultságokat** tartja – a játékosokat, méréseket, gyakorlatokat nem. Nincs **gyorsítótár (cache)**: ha ide-oda kattintasz a modulok között, ugyanaz az adat újra és újra letöltődik.

**Miért fontos (laikusul).**
- **Karbantartás:** ha az adatbázisban átnevezel egy mezőt vagy változik a lekérdezés, most **10+ helyen** kell ugyanazt átírni – könnyű kihagyni egyet, és akkor az az oldal elromlik.
- **Sebesség / adatforgalom:** cache nélkül a modulváltás minden alkalommal újraletölti ugyanazt (pl. a játékoslistát). Ez lassabb élmény és több adatforgalom, főleg mobilon.
- **Következetlenség:** mivel mindenki kicsit másképp kéri le ugyanazt, előfordulhat, hogy két oldal enyhén eltérő adatot mutat.

**Hasonlat:** most minden szakács maga megy le a piacra ugyanazért a paradicsomért, ötpercenként. Egy "adat-réteg" olyan, mint egy közös éléskamra + beszerző: egyszer hozza be, mindenki onnan veszi, és tudja, mi van készleten.

**Mit kellene tenni.** Két szint:
1. Minimum: a gyakran használt adatokhoz (játékosok, gyakorlatok) **közös lekérő függvények** egy `lib/api/` mappában, hogy egy helyen legyen a logika.
2. Ideális: egy kész könyvtár, ami a lekérést + gyorsítótárat együtt adja (pl. **TanStack Query / React Query**). Ez iparági bevett megoldás pont erre.

**Kb. mekkora munka.** Az 1. szint fokozatosan, modulonként bevezethető: ~3–4 nap. A React Query bevezetése + a legfontosabb lekérések átállítása: ~1 hét, de nagy hosszú távú megtérüléssel.

**Milyen hatása.** Kevesebb duplikáció, gyorsabb app, kevesebb hiba adatbázis-változáskor. A React Query "ingyen" ad automatikus újratöltést, betöltés-jelzést és hibakezelést is.

### 3.4 Nincs közös komponens-készlet – sok az inline duplikáció

**Mi a probléma.** Nincs `components/ui/` réteg az újrahasznált apró építőelemekhez (Modal, Gomb, Kártya, Űrlapmező). A felugró ablakokat **26 helyen, 14 fájlban** kézzel, egyesével rakták össze (a `fixed inset-0 … z-50 …` háttér-overlay mintát ennyiszer másolták be). Minden Makrociklus-, Mérés-, Gyakorlat- és Csapat-oldalon újra megírják ugyanazt a modál-vázat.

Van részleges jó megoldás: az `index.css`-ben létezik néhány közös stílus-osztály (`.btn-primary`, `.btn-secondary`, `.card`, `.input-field` – `index.css:30–46`). Ez jó irány, de csak a stílust fedi le, magát a **szerkezetet** (pl. egy modál felépítését, bezárás-logikáját) nem.

**Miért fontos (laikusul).** Ha 26 helyen van külön "ugyanaz" a felugró ablak:
- egy dizájn-változtatás (pl. lekerekítettebb sarok, más bezárás-gomb) 26 helyen kézi munka;
- könnyen **elcsúsznak egymástól** (az egyik modál kicsit másképp néz ki/viselkedik, mint a másik);
- a hibákat (pl. billentyűzettel nem lehet bezárni) 26-szor kell külön javítani.

**Mit kellene tenni.** Kiemelni 4-5 közös alap-komponenst (`Modal`, `Button`, `Card`, `FormField`, `ConfirmDialog`) egy `components/ui/` mappába, és fokozatosan lecserélni rájuk a másolatokat. Új funkciónál már ezeket használni.

**Kb. mekkora munka.** Az alap-komponensek megírása: ~2 nap. A meglévők fokozatos lecserélése: menet közben, oldalanként pár óra (nem kell egyszerre).

**Milyen hatása.** Egységesebb kinézet, gyorsabb új-funkció-fejlesztés, egy helyen javítható hibák. Ez egyben a 3.1-es fájldarabolást is támogatja.

### 3.5 A jogosultság-ellenőrzés féloldalas (következetességi rés)

**Mi a probléma.** A szerepkör-alapú jogosultsági rendszer (`lib/permissions.js`, `TeamContext.jsx`) jól van megtervezve, de a felhasználásban rés van. A `canEditModule(...)` függvény – ami eldönti, hogy valaki **szerkeszthet-e** egy modult – jelenleg **kizárólag a `Teams.jsx`-ben** van használva (`Teams.jsx:27, 343, 389, 429`). A többi modul (Naptár, Makrociklus, Mérések, Gyakorlat Könyvtár stb.) belsejében **nincs** szerkesztés-tiltás.

A `Dashboard.jsx` a jogosultságot csak arra használja, hogy **elrejtse** a menüpontokat (`Dashboard.jsx:215–220`, `isModuleVisible`). Vagyis: egy "csak megtekintés" jogú felhasználónál a menü helyesen szűkül, de ha valamiért mégis egy szerkeszthető modulba jut, ott a legtöbb helyen **tud is szerkeszteni**.

**Miért fontos.** A "megtekint / szerkeszt" megkülönböztetés jelenleg főleg vizuális, nem mindenütt valódi korlát. Egy gyógytornász, akinek csak nézési joga lenne a mérésekhez, a Mérések modulban valószínűleg módosítani is tudna. Ez adatbiztonsági és adatintegritási kockázat, ha a csapatban tényleg különböző jogú emberek vannak.

*(Megjegyzés: ez részben biztonsági téma, ami átnyúlik a review más szempontjaiba; itt architekturális következetlenségként jelzem. A valódi védelmet egyébként az adatbázis oldali szabályoknak – Supabase RLS – kell adnia, mert a böngészőben futó ellenőrzés önmagában megkerülhető. Az RLS meglétét ez az átvilágítás nem ellenőrizte – lásd 5. pont.)*

**Mit kellene tenni.**
1. Minden szerkesztő-modulban a szerkesztő gombokat/mezőket a `canEditModule(...)` mögé tenni (ugyanúgy, ahogy a `Teams.jsx` már csinálja).
2. Meggyőződni róla, hogy az adatbázis oldalon (Supabase RLS) is le van tiltva, amit nem szabad – ez a valódi biztonsági határ.

**Kb. mekkora munka.** A böngésző-oldali gombtiltás modulonként ~fél nap. Az RLS-ellenőrzés külön, adatbázis-oldali feladat.

**Milyen hatása.** Valódi, nem csak látszólagos szerepkör-védelem; kevesebb esély véletlen vagy szándékos adatmódosításra rossz jogosultsággal.

### 3.6 Nincs hibakezelési háló (Error Boundary) és típus-védelem

**Mi a probléma.** Nincs sehol **Error Boundary** (a `src`-ben egyetlen `ErrorBoundary`/`componentDidCatch` sincs). Ez egy "biztonsági háló" React-ben: ha egyetlen komponens elszáll (pl. hiányzó adat miatt), akkor **most az egész alkalmazás fehér képernyőre válthat**, nem csak az a rész. Emellett nincs TypeScript és nincs automata teszt (lásd 2.1).

A hibakezelés jelenleg fájlonként `try/catch` + `console.error` – vagyis a hiba a fejlesztői konzolba kerül, a felhasználó gyakran csak azt látja, hogy "nem történik semmi".

**Miért fontos.** Egyetlen apró adathiba (pl. egy játékosnál hiányzó születési dátum) elvben leviheti a teljes felületet, ahelyett hogy csak az adott kártya jelezne hibát. A felhasználó pedig nem kap értelmes visszajelzést.

**Mit kellene tenni.** Legalább egy globális Error Boundary a `Dashboard` köré, felhasználóbarát hibaüzenettel ("Hoppá, valami hiba történt, töltsd újra"). Hosszabb távon érdemes megfontolni a TypeScript fokozatos bevezetését és néhány alap-tesztet a legkritikusabb számításokhoz (pl. 1RM kalkulátor, mérési statisztikák).

**Kb. mekkora munka.** Error Boundary: fél nap. TypeScript/tesztek: nagyobb, stratégiai döntés (hetek), nem sürgős, de fontolandó.

**Milyen hatása.** Robusztusabb app, ami egy hibától nem áll le teljesen, és értelmes üzenetet ad.

---

## 4. Javasolt sorrend (mit érdemes előbb)

A "kevés munka / nagy haszon" elv szerint:

1. **Gyors takarítás (pár óra):** a `Dashboard.jsx` duplikált/holt elágazásának eltávolítása (3.2).
2. **Error Boundary bevezetése (fél nap):** azonnali robusztusság-nyereség (3.6).
3. **Közös UI-komponensek (2 nap):** `Modal`, `Button`, `Card`, `FormField` – ezekre később minden más épül (3.4).
4. **Adat-réteg / React Query bevezetése (1 hét):** a legnagyobb hosszú távú megtérülés (3.3).
5. **Óriás-oldalak fokozatos darabolása (1–1,5 hét, elnyújtva):** a 3. és 4. lépésre támaszkodva sokkal könnyebb (3.1).
6. **Valódi URL-navigáció + lazy loading (3–5 nap):** felhasználó számára is látható javulás (3.2).
7. **Jogosultság-ellenőrzés kiterjesztése minden modulra + RLS-audit (folyamatosan):** biztonsági következetesség (3.5).

Fontos: **egyik lépés sem igényli az app leállítását vagy újraírását.** Mind fokozatosan, a meglévő működés mellett végezhető.

---

## 5. Feltételezés vs. biztos megállapítás

**Biztos megállapítások (a kódból közvetlenül igazolva):**
- A stack pontosan a `package.json` szerinti; nincs TypeScript, nincs teszt-keretrendszer. **Biztos.**
- Fájlméretek: MacrocyclePlanner 1735, Calendar 1524, ExerciseLibrary 1322, Measurements 1194 sor. **Biztos (sorszámlálás).**
- 123 közvetlen `supabase.from(...)` hívás 25 fájlban; a "players" táblát 10 fájl kéri le külön. **Biztos (kód-keresés).**
- 26 kézzel írt modál-overlay 14 fájlban; nincs `components/ui/` réteg. **Biztos.**
- A modulváltás egyetlen `activeModule` state-tel megy, nem URL-lel; a `Dashboard.jsx` alján duplikált/holt elágazás van. **Biztos (`Dashboard.jsx:320–483`).**
- `canEditModule` csak a `Teams.jsx`-ben használt; máshol nincs böngésző-oldali szerkesztés-tiltás. **Biztos (kód-keresés).**
- Nincs Error Boundary a `src`-ben. **Biztos.**
- `TeamContext` csak csapatot + jogosultságot tart, adat-cache nincs. **Biztos (`TeamContext.jsx` teljes átolvasás).**

**Feltételezések / nem teljeskörűen ellenőrzött (érdemes külön megnézni):**
- **Az adatbázis-oldali biztonság (Supabase RLS).** Ez az átvilágítás a frontend-kódra fókuszált; nem ellenőriztem, hogy a Supabase-ben be vannak-e kapcsolva a soronkénti hozzáférési szabályok (RLS). Ha nincsenek, a 3.5-ös jogosultsági rés valódi biztonsági kockázat. **Feltételezés – külön ellenőrzendő.**
- **A teljesítmény-hatás konkrét mértéke** (mennyivel lassabb az egybecsomagolt indulás, mennyi felesleges újralekérés van futás közben) becslés a szerkezetből, nem mérés. **Feltételezés.**
- A két giant fájlt (Makrociklus, Naptár) reprezentatív részletekben olvastam át, nem soronként végig; a többi óriás-fájl (Mérések, Gyakorlat Könyvtár) szerkezetét a méret- és mintázat-egyezés alapján vetítettem ki. A megállapítások mintázat-szintűek, nem minden egyes sorra kiterjedők. **Részleges mintavétel.**
