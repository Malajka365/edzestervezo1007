# Újratervezés 1. szakasz: Alapok (dizájnrendszer, app-keret, navigáció)

Kapcsolódó vizuális javaslat és kattintható mockup: `docs/redesign/teamflow-redesign.html` (publikálva: https://claude.ai/artifact/Cww8vb5fzEH86oHmkmKUQg). A színek, betűk, térközök és a keret elrendezése onnan veendő, ez a dokumentum a viselkedést és a határokat rögzíti.

## Miért

A TeamFlow (kézilabda, felnőtt csapat; edzők, erőnléti edző, gyógytornász) funkcionálisan sokat tud, de:

- nincs közös dizájnrendszer: minden oldal saját fejlécet, gombot, modalt, fület épít, a színek esetlegesek (pl. a Makrociklus fejlécében 7 különböző gombszín);
- a 12 menüpont egy lapos lista, csoportosítás nélkül;
- a csapatválasztó minden oldal fejlécében külön szerepel, a Kezdőlapon nincs;
- csak sötét téma van, az `index.css`-ben bedrótozva; az Inter font be van állítva, de nem töltődik be;
- mobilon hamburger-menü + dupla görgetés, nincs alsó menüsor;
- a belépő oldalon fejlesztői adatbázisteszt látszik.

Az 1. szakasz célja, hogy minden további szakasz (Ma oldal, összevonások, játékos nézet) egy közös, egységes alapra épüljön. A felhasználó szerint: „jobb kinézetű, funkcionálisan használhatóbb, felhasználóbarátabb” legyen, és ha nem tetszik, vissza lehessen térni az eredetire.

## Eldöntött dolgok (a felhasználótól)

- Sportág: kézilabda. Játékosok: felnőttek (18+).
- A téma a rendszerbeállítást követi, kézzel átváltható (világos / sötét / rendszer).
- A navigáció öt csoportba rendeződik (lásd lent).
- Később lesz játékos szerepkör egyszerűsített nézettel (4. szakasz). Az 1. szakasznak ezt elő kell készítenie, de nem kell megvalósítania.
- A mostani állapot el van mentve: `pre-redesign-2026-10` git tag a `2b2a589` commiton. Minden munka a `claude/website-ui-ux-redesign-115795` ágon megy, a `master` (és így a Vercel éles oldal) csak a felhasználó jóváhagyásával változik.

## Célok

1. **Dizájn tokenek, két témával.** Minden szín CSS változó (`:root` = világos, `[data-theme="dark"]` és `prefers-color-scheme: dark` = sötét), a Tailwind configban szemantikus nevekre képezve. Tokenek a mockupból: `bg`, `surface`, `surface-2`, `line`, `fg`, `muted`, `accent`, `accent-fg`, `accent-soft`, `ok`/`ok-soft`, `warn`/`warn-soft`, `bad`/`bad-soft`, edzéstípus-színek (`t-strength`, `t-ball`, `t-tactic`, `t-match`, `t-rest`). Egy kiemelőszín (kobaltkék); minden más szín jelentést hordoz.
2. **Témaváltás.** Három állapot: rendszer (alapértelmezett), világos, sötét. A választás `localStorage`-ban (`tf-theme`), a `<html>` `data-theme` attribútumán. Egy kis inline szkript az `index.html`-ben beállítja betöltés előtt, hogy ne villanjon. A váltó a profil-menüben / oldalsáv láblécében érhető el.
3. **Betűtípusok.** Barlow Condensed (címek, nagy számok), Figtree (szöveg), IBM Plex Mono (táblázatszámok, dátumok, címkék). Saját hosztolva (`@fontsource` csomagok), latin-ext készlettel, nem Google Fonts CDN-ről.
4. **Közös UI komponensek** a `src/components/ui/` alatt: `Button` (primary / secondary / ghost / danger, sm / md, ikonnal), `IconButton`, `PageHeader` (morzsamenü-felirat, cím, akciók, opcionális fül-sor), `Tabs`, `SegmentedControl`, `Modal`, `Drawer` (oldalpanel), `Field` + `Input` / `Select` / `Textarea`, `Panel` (kártya), `StatusPill`, `Chip`, `Skeleton`, `Spinner` (egyetlen spinner, a mostani három helyett), `EmptyState` és `ConfirmDialog` átállítva az új alapokra, egységes `Table` stílus (osztályok vagy könnyű wrapper). A `react-hot-toast` stílusa a tokeneket használja.
5. **Új app-keret (desktop).** Bal oldalsáv: felül csapatváltó (a mostani `TeamSelector` kiváltása, egyszer, globálisan), alatta „Keresés, parancsok” gomb, majd az öt csoport, alul felhasználó (név/e-mail + **csapatbeli** szerep) és beállítások / téma / kijelentkezés. Fő terület: `PageHeader` + tartalom, egyetlen görgetési konténer.
6. **Navigáció öt csoportban**, a mostani útvonalakkal (slugok nem változnak):
   - Áttekintés: Kezdőlap (`/dashboard`), Mérkőzések
   - Tervezés: Szezonterv (a Makrociklus Tervező új neve), Naptár, Edzéssablonok
   - Edzéstartalom: Gyakorlattár
   - Teljesítmény: Mérések, Ranglista, Progresszió, 1RM táblázat (a 3. szakaszban ezek egy oldallá olvadnak)
   - Csapat: Játékosok (a mostani Csapatok oldal), Egészség (a Rehabilitáció új neve)
   A jogosultság szerinti szűrés (`isModuleVisible`) marad; az üres csoport nem jelenik meg.
7. **Szerepkör szerinti menü előkészítése.** A navigáció egy adatstruktúrából épül (csoportok → elemek, mindegyiknél jogosultsági kulcs), és a szerepkör kiválaszt egy menükészletet. Ma három szerep van (`coach`, `fitness_coach`, `physiotherapist`), ugyanazzal a készlettel; a későbbi `player` szerep külön készletet kap majd anélkül, hogy a keretet át kellene írni.
8. **Mobil keret (lg alatt).** Felső sáv: csapat (váltóval) + kereső ikon. Alsó menüsor 5 elemmel: Kezdőlap, Naptár, Játékosok, Gyakorlattár, „Több” (ez egy alulról felcsúszó lapot nyit a teljes, csoportosított menüvel, a beállításokkal és kijelentkezéssel). Hamburger-menü megszűnik. (A mockup alsó sávja „Mérések”-et mutat a „Több” helyén; ez a dokumentum az irányadó.) Az alsó sáv a jogosultság szerint rejtett elemeket kihagyja, a helyüket a „Több” fedi le.
9. **Parancspaletta (Ctrl/Cmd + K).** Oldalak közti ugrás és néhány navigációs művelet (pl. „Új mérés” = a Mérések oldal megnyitása). Játékos-keresés nincs benne ebben a szakaszban.
10. **Minden oldal átállítása az új alapokra:**
    - saját fejléc helyett `PageHeader`; a `TeamSelector` kikerül az oldalakból (11 oldal);
    - a bedrótozott `slate-*`, `primary-*`, `white` és egyéb színosztályok cseréje tokenes osztályokra, hogy mindkét témában helyes legyen;
    - gombok `Button`-ra, fülek `Tabs`-re / `SegmentedControl`-ra, a meglévő modálok a közös `Modal` keretre (a modálok belső űrlapja maradhat, csak a keret és a gombok egységesek);
    - emoji helyett Lucide ikonok mindenhol, ahol ikonként vagy állapotjelzőként szerepelnek;
    - Recharts grafikonok színei tokenekből (`var(--accent)` stb.), hogy témaváltáskor is olvashatók legyenek;
    - az `h-screen` + sticky fejléc minták megszüntetése, egy görgetési konténer.
11. **Belépő oldal és belépés körüli képernyők.** Az `Auth` újratervezve az új stílusban, a „Adatbázis kapcsolat tesztelése” kapcsoló és a `SupabaseConnectionTest` panel eltávolítva a végfelhasználói felületről. `JoinTeam`, `ErrorBoundary` hibaoldal, az `App.jsx` „Nem érhető el a szerver” képernyője és a `LoadingSpinner` is az új stílusban.
12. **Apró, a keret által érintett javítások:** a profil-menüben a szerepkör a csapatbeli szerepből jön (`TeamContext.currentUserRole` + `ROLES` feliratok), nem a szabadon állítható `profiles.role`-ból; a `Profile` oldal a közös fejlécet kapja (most `<main className="p-6">` wrapper); a nem létező `.btn` osztály használatai megszűnnek; a `.btn-primary` / `.btn-secondary` / `.input-field` / `.card` osztályok vagy megszűnnek, vagy a tokenekre épülnek, hogy ne maradjon két párhuzamos rendszer.

## Nem célok (későbbi szakaszok)

- „Ma” kezdőképernyő tartalma (2. szakasz). Az 1. szakaszban a Kezdőlap csak a keretet és az új stílust kapja, a widgetek maradnak.
- Naptár viselkedésének változása, gyakorlattár gyorsítása, jelenlét modul (2. szakasz).
- Modulok összevonása, egységes játékosprofil saját URL-lel (3. szakasz).
- Játékos szerepkör, egyéni tervek, wellness, sRPE, foglalás, sérüléstörténet (4-5. szakasz).
- Szezonterv mobilbarát átalakítása (5. szakasz). Az 1. szakaszban csak színt/komponenst kap.
- Adatbázis-változás. Ebben a szakaszban nincs migráció.
- Útvonal-változás. A slugok maradnak, csak a menüfeliratok változnak.

## Amit nem szabad elrontani

- Egyetlen meglévő funkció sem szűnhet meg vagy működhet másképp (mentés, törlés, PDF/CSV export, jogosultsági szűrés, meghívás, widgetek testreszabása).
- A jogosultsági logika (`permissions.js`, RLS) nem változik.
- A világos téma nem lehet „félkész”: ha egy oldal átkerül, mindkét témában olvasható legyen. Nem maradhat olyan oldal, ami világos témában sötét blokkokat vagy olvashatatlan szöveget mutat.
- A meglévő tesztek (`npm test`) zöldek maradnak, a `npm run build` hibátlan.
- Teljesítmény: a fontok és a keret nem lassíthatja érezhetően az első betöltést (fontok `font-display: swap`, csak a használt súlyok).

## Kényszerek

- Stack marad: React 18 + Vite 5 + Tailwind 3 + lucide-react + react-router 6 + React Query + react-hot-toast. Új függőség csak indokolt esetben (fontsource csomagok igen; komponenskönyvtár, pl. shadcn/Radix, nem szükséges, de a builder dönthet egy-egy primitív mellett, ha a hozzáférhetőség miatt indokolt, pl. Dialog fókuszkezelés).
- A kód és a felületi szöveg magyar marad; a kódbeli megjegyzések a fájl meglévő nyelvét követik.
- A munka a `claude/website-ui-ux-redesign-115795` ágon, PR-ral a `master`-be. Merge előtt a felhasználó a Vercel preview-n átnézi.

## Kész, ha

- Minden `/dashboard/*` oldal, az `/auth` és a `/join/:token` az új kerettel és komponensekkel jelenik meg, világos és sötét témában is olvasható, 375 px szélességen vízszintes görgetés nélkül (a szándékosan görgethető táblázatokat és a Szezonterv rácsot kivéve).
- Az oldalsáv öt csoportot mutat, a csapatváltó egyszer, felül szerepel, a régi oldalankénti `TeamSelector` eltűnt.
- Mobilon alsó menüsor + „Több” lap működik, hamburger nincs.
- Ctrl/Cmd + K megnyitja a palettát, oldalra ugrás működik billentyűzettel.
- A téma három állapota működik és megmarad újratöltés után, villanás nélkül.
- A kódban nem marad bedrótozott `slate-*` / `bg-slate-900`-féle színosztály az átállított fájlokban, emoji nem szolgál ikonként.
- `npm test` és `npm run build` zöld. Új egységtesztek legalább: a menüstruktúra jogosultság / szerepkör szerinti szűrése, a téma-feloldás (tárolt érték + rendszerbeállítás).

## Rögzített részletek (a tervező döntései, a felhasználó átnézheti)

- **Csapat létrehozása, szerkesztése, törlése.** A globális csapatváltó lenyílója: csapatok listája + „Új csapat létrehozása” (mindenkinek elérhető, a létrehozó lesz a csapat vezetőedzője, ahogy ma). Ez megszünteti a mai zsákutcát: csapat nélküli felhasználónál a Csapatok menüpont rejtett, így most nem tud első csapatot létrehozni. A szerkesztés és a törlés a Játékosok oldalon marad (a `players` jogosultság mögött); a törlés gomb csak a csapat tulajdonosának látszik (`isTeamOwner`), ahogy az adatbázis is engedi. Csapat nélküli állapotban a fő terület egy üres állapotot mutat: „Hozd létre az első csapatodat” vagy „Kérj meghívót az edződtől”.
- **Profil „Szerepkör” mező.** Megmarad, „Titulus” felirattal, szabad szöveges/választós profiladatként (pl. a profiloldalon látszik). A menüben és a jogosultságokban mindig a csapatbeli szerep számít. A `Dashboard.jsx` `profiles.role` feliratkozása megszűnik.
- **PDF exportok.** A képernyőképes exportok (Szezonterv, Progresszió) mindig világos, nyomtatható stílusban készülnek, a témától függetlenül (a rögzítés idejére világos tokenek a rögzített elemen). A tartalom nem változik, csak a háttér és a színek lesznek nyomtatásbarátok.
- **Átadás és ellenőrzés.** Egy ág, egy PR a végén. Közben minden push-ból Vercel preview készül, amit a felhasználó bármikor megnézhet. A témaváltó és a rendszer-követés addig rejtett (fix sötét téma), amíg minden oldal át nem állt; utána kapcsoljuk be. Így egyik preview sem mutat félig világos oldalt.
- **Visszatérés az eredetihez.** A `pre-redesign-2026-10` tag és a változatlan `master` elég. Futás közbeni „klasszikus nézet” kapcsoló nem kell.

## A builderre hagyva

- A komponensek pontos API-ja, fájlszerkezete, a Tailwind token-leképezés módja (CSS változók `rgb(var(--x) / <alpha-value>)` formában vagy hex), a színcsere módja (kézi vagy szkriptelt, fájlonként átnézve).
- A sorrend: javasolt a tokenek + komponensek → keret és navigáció → oldalak egyenként (kis, ellenőrizhető lépésekben, lépésenként működő app).
- A parancspaletta és a „Több” lap pontos megjelenése, a mockup szellemében.
- A Szezonterv sűrű rácsának színezése (a mostani cellaszínek jelentését meg kell tartani, de tokenekre lehet képezni).
