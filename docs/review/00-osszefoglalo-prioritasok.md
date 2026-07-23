# TeamFlow — Teljes projekt-review: összefoglaló és prioritási terv

*Készült: 2026-07-20. Öt szakosított AI-agent vizsgálata alapján (architektúra: Opus · kódminőség: Sonnet · teljesítmény: Sonnet · biztonság: Opus · design/UX: Sonnet), a végső szintézist a Fable orchestrátor készítette.*

Részletes jelentések:
- [01-architektura.md](01-architektura.md)
- [02-kodminoseg.md](02-kodminoseg.md)
- [03-teljesitmeny.md](03-teljesitmeny.md)
- [04-biztonsag.md](04-biztonsag.md)
- [05-design-ux.md](05-design-ux.md)

---

## Általános kép, laikusul

A TeamFlow egy **jó alapokon álló, működő** alkalmazás: modern eszközökre épül (React + Supabase), a mappaszerkezet tiszta, és a most elkészült csapattagság/jogosultság rendszer adatbázis-szinten is véd. A fő gyengeségei nem "el van rontva" típusúak, hanem **"így nőtt, és most már rendet kell rakni"** típusúak: négy hatalmas fájl, amiben minden egyben van; kb. 100 helyen elnyelt hibaüzenet; 2005-ös stílusú felugró ablakok; és egy-két valódi biztonsági rés.

---

## 1. KRITIKUS (azonnal)

### K1. Adatbázis-mentés egészségügyi adatokkal a projekt mappában ✅ JAVÍTVA
- **Mi:** Az `sb_letoltes/` mappa a teljes adatbázis-mentést és a feltöltött orvosi dokumentumokat tartalmazza, és nem volt kizárva a git-ből — egy óvatlan `git add -A` + push nyilvánosságra hozta volna a játékosok egészségügyi adatait.
- **Státusz:** A review során azonnal javítva (`.gitignore`-ba került). **Javaslat:** a mappát idővel költöztesd a projekten kívülre (pl. Dokumentumok/Backups), a repo-ban semmi keresnivalója.
- **Munka:** kész / 2 perc a költöztetés. **Hatás:** adatvédelmi katasztrófa elkerülése.

### K2. Négy adatbázis-tábla védelme nincs verziókövetve ✅ JAVÍTVA (2026-07-20, migráció: 20260720121000)
- **Mi:** A `training_exercises`, `exercises`, `user_exercise_favorites`, `profiles` táblákra egyik migrációs fájl sem ír RLS-védelmet (RLS = az adatbázis sorszintű "ki mit láthat" szabályai). Lehet, hogy a Supabase felületén kézzel be vannak állítva — de ez a kódból nem ellenőrizhető, és egy új környezetbe telepítésnél elveszne. A `profiles`-nál pl. az a kockázat, hogy bárki kiolvashatná az összes felhasználó nevét/e-mail címét.
- **Mit tenni:** egy migrációs fájlban rögzíteni mind a négy tábla RLS-ét (a meglévő minta másolható), majd élesben ellenőrizni.
- **Munka:** ~1-2 óra. **Hatás:** adatszivárgás-kockázat megszűnik, telepítés reprodukálható.

### K3. Mobilon 10 modulból nem érhető el a menü
- **Mi:** A `Dashboard.jsx` 319-343. sora miatt a legtöbb modul-képernyőn mobilon nincs hamburger-menü — a felhasználó beragad, nem tud másik modulra váltani. Ugyanennek a hibának a párja egy halott (soha le nem futó) kódblokk a 440-458. sornál.
- **Mit tenni:** a fejléc-logika egységesítése + a halott blokk törlése.
- **Munka:** ~1-2 óra. **Hatás:** mobilon használhatóvá válik az app.

---

## 2. GYORS GYŐZELMEK (kis munka, nagy hatás)

### GY1. 1,2 MB-os kép lecserélése a már létező 8,5 KB-os SVG-re
- A `BodyDiagram.jsx` egy 1,24 MB-os PNG-t tölt be, miközben **ugyanabban a mappában ott van** a 8,5 KB-os SVG változat. Egy import-sor cseréje ⇒ az app letöltési mérete kb. 40%-kal csökken. **Munka:** 10 perc.

### GY2. "Amnézis" → "Anamnézis" elírás javítása
- A rehab modulban következetesen rosszul szerepel az orvosi szakszó (4 fájl, 8+ hely: `DocumentUpload.jsx`, `AnamnesisForm.jsx`, `Rehabilitation.jsx`, `PlayerProfileRehab.jsx`). Gyógytornász felhasználónál ez azonnali hitelesség-vesztés. **Munka:** 15 perc (keresés-csere + a DB `category` értéknél óvatosan).

### GY3. Üres mezszám hibája új játékos felvételekor
- `Teams.jsx`: ha a mezszámot üresen hagyod, a mentés elhasal (üres szöveg megy szám típusú mezőbe). A helyes minta már megvan a `Matches.jsx`-ben (üres → null) — csak át kell venni. Ugyanezt a mintát érdemes végignézni az összes űrlapon. **Munka:** ~1 óra.

### GY4. Code splitting (az app "szeletelt" betöltése)
- Most az egész app egyetlen 1,65 MB-os JS csomag — a bejelentkező képernyőhöz is letöltődik a naptár, a PDF-készítő, minden. `React.lazy`-vel modulonként szeletelve az első betöltés drasztikusan gyorsul (különösen mobilon/gyenge neten). A PDF-könyvtárak (jspdf, html2canvas) csak export gombnyomásra töltődjenek. **Munka:** ~fél nap. **Hatás:** első betöltés akár 60-70%-kal kisebb.

---

## 3. KÖZÉPTÁVÚ (stabilitás és karbantarthatóság)

### KT1. Hibakezelés rendbetétele: néma hibák + alert-ek kiváltása
- **Mi:** ~102 helyen a sikertelen adatbetöltés csak a fejlesztői konzolba ír, a felhasználó üres listát lát (azt hiheti: nincs adat, pedig hiba volt — egészségügyi adatoknál ez félrevezető is lehet). Emellett 82 `alert()` + 15 `confirm()` böngésző-popup adja a visszajelzést.
- **Mit tenni:** egy toast-értesítő könyvtár bevezetése (pl. `react-hot-toast`, pár soros beállítás), majd fokozatosan: hiba esetén látható hibaüzenet + "Újra" gomb; a törlés-megerősítések saját modálba.
- **Munka:** alaprendszer fél nap, teljes átállás 2-3 nap fokozatosan. **Hatás:** megbízhatóbb, professzionálisabb élmény.

### KT2. A négy óriásfájl darabolása
- `MacrocyclePlanner.jsx` (1735 sor), `Calendar.jsx` (1524), `ExerciseLibrary.jsx` (1322), `Measurements.jsx` (1194) — mindegyik egyben tartalmaz adatlekérést, üzleti logikát, 5-6 felugró ablakot és megjelenítést. Ez most is működik, de minden módosítás kockázatos és lassú bennük.
- **Mit tenni:** fokozatosan, mindig amikor épp hozzányúlsz: a modálokat külön komponensbe, az adatlekérést külön hook-ba (`useCalendarData` stb.). Nem egyszerre — fájlonként, alkalmanként.
- **Munka:** fájlonként 0,5-1 nap, elosztva. **Hatás:** gyorsabb fejlesztés, kevesebb új hiba.

### KT3. Közös adat-réteg (React Query)
- 123 közvetlen adatbázis-hívás 25 fájlban; a játékoslistát 10 különböző fájl kéri le újra; modulváltáskor minden újratöltődik. A `@tanstack/react-query` bevezetése cache-t, automatikus újratöltést és egységes hibakezelést ad.
- **Munka:** ~2-3 nap fokozatosan (modulonként átállítható). **Hatás:** érezhetően gyorsabb modulváltás, kevesebb duplikált kód.

### KT4. Duplikált komponensek összevonása
- `AttendanceCalendar` ↔ `TeamAttendanceCalendar` (szinte azonos), PDF-export logika (`Leaderboard` ↔ `TrainingLoad`), 26 kézzel írt modál. Közös `components/ui/` készlet (Modal, Button, EmptyState) kiemelése. **Munka:** 1-2 nap. **Hatás:** fele annyi kód, egységes kinézet.

### KT5. Jogosultság-UI befejezése
- A "megtekintő" szerepű tag (pl. gyógytornász a mérési modulban) most is látja a szerkesztő gombokat — a mentés az adatbázison elbukik (az védve van), de a felület nem mondja meg, miért. A `canEditModule` segédfüggvény készen van, csak a Csapatok oldalon van bekötve — a többi 8 modulba is be kell. **Munka:** ~1 nap. **Hatás:** érthető, frusztráció-mentes élmény vendég-szerepkörrel.

---

## 4. DESIGN ÉS UX JAVÍTÁSOK

### D1. Reszponzivitás pótlása a kritikus képernyőkön
- Az `Auth.jsx` (a belépő képernyő!), `JoinTeam.jsx`, `Profile.jsx`, `TeamMembersPanel.jsx` egyáltalán nem tartalmaz mobil-töréspontokat. A jogosultsági mátrix táblázata mobilon csak oldalra görgethető. **Mit tenni:** mobil-first átnézés, a mátrixhoz mobilon kártyás nézet. **Munka:** 1-2 nap.

### D2. Színrendszer egyszerűsítése
- A Dashboard modul-kártyái 10 különböző színt használnak jelentés nélkül. Javaslat: 3-4 funkcionális kategória-szín (pl. csapatkezelés = kék, tervezés = lila, mérés/statisztika = zöld, rehab = piros). **Munka:** fél nap.

### D3. Betöltés-jelzés egységesítése
- Kétféle minta keveredik (LoadingSpinner komponens vs. csupasz "Betöltés..." szöveg 13 helyen). Egy közös minta (skeleton vagy spinner) mindenhova. **Munka:** fél nap.

### D4. Üres állapotok és első használat
- Friss regisztráció után több képernyő csak üres — nincs útmutatás. A Dashboard-on már van "Következő lépések" blokk (jó!), de a moduloknál üres-állapot + "Hozd létre az elsőt" gomb kellene. **Munka:** ~1 nap.

---

## 5. KÉSŐBBI, OPCIONÁLIS

- **URL-alapú navigáció** (react-router route-ok a modulokra): linkelhetőség, működő Vissza gomb, és a code splitting természetes alapja. Nagyobb átalakítás (~2-3 nap), a code splitting (GY4) nélkül is elindítható, de hosszabb távon ez a helyes irány.
- **TypeScript fokozatos bevezetése**: új fájlok TS-ben, a régiek maradnak — sok null/undefined hibát a gépelés közben fogna meg.
- **Automata tesztek** legalább a jogosultsági logikára és a kritikus űrlapokra.
- **Éles/GDPR-csomag** (ha valódi játékosadatokkal, több klubbal élesedik): Supabase DPA + EU-régió ellenőrzés, audit-napló, adattörlési folyamat, titkosított automatikus mentés, erősebb jelszó-szabály (min. 10 karakter) vagy 2FA.
- **Meghívó-token szigorítás**: e-mail-címhez kötött meghívó, rövidebb lejárat.

---

## „Ha csak 5 dolgot javítanék először, ezek lennének…"

1. **A négy védtelen adatbázis-tábla RLS-e (K2)** — ez az egyetlen maradék valódi biztonsági rés; egészségügyi adatokat kezelő appnál ez nem várhat. *(1-2 óra)*
2. **A mobil menü-hiba (K3)** — enélkül az app mobilon gyakorlatilag használhatatlan, pedig az edzők jellemzően telefonról használnák a pálya széléről. *(1-2 óra)*
3. **Az 1,2 MB-os kép cseréje SVG-re (GY1)** — 10 perc munka, az egész app érezhetően gyorsabban tölt be. *(10 perc)*
4. **"Amnézis" → "Anamnézis" (GY2)** — apróság, de szakmai hitelesség-kérdés a gyógytornász felhasználók felé. *(15 perc)*
5. **Toast-értesítések bevezetése + a néma hibák láthatóvá tétele (KT1 első fele)** — ettől lesz az app "megbízható" érzetű: a felhasználó mindig tudja, sikerült-e amit csinált. *(fél nap az alap, aztán fokozatosan)*

Ez az öt együtt nagyjából **egy napnyi munka**, és a biztonság + mobil-használhatóság + sebesség + hitelesség négyeséből mindegyiken érdemben javít.
