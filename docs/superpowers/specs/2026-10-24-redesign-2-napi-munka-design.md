# Újratervezés 2. szakasz: Napi munka

Előzmény: az 1. szakasz (dizájnrendszer, új menü, mobil, `docs/superpowers/specs/2026-10-20-redesign-1-alapok-design.md`) kész, a `claude/website-ui-ux-redesign-115795` ágon, PR #2. Erre épül.
Vizuális referencia a Kezdőlaphoz: `docs/redesign/kezdolap-widgetek.html` (publikálva: https://claude.ai/artifact/CvfYfVa1hXU8QsDaMuSStK) — a felhasználó jóváhagyta.

## Miért

Az edző napi munkája most szétszórt: a mai edzést a naptárban kell megkeresni, a jelenlét a rehab modulban van elrejtve, edzést csak a napi nézetből lehet létrehozni, a gyakorlattár lassan tölt, és sehol nem látszik egyben, ki bevethető. A Kezdőlap widgetes, de csak fel/le nyilakkal rendezhető, nem méretezhető és nem állítható be.

A felhasználó célja: a Kezdőlapot mindenki (vezetőedző, erőnléti edző, gyógytornász) a saját igénye szerint, a lehető legnagyobb szabadsággal rakhassa össze, és a napi teendők (mai edzés, jelenlét, ki bevethető) egy-két kattintásra legyenek.

## Eldöntött dolgok (a felhasználótól)

- A Kezdőlap **marad widgetes és moduláris**; a widgetek húzással rendezhetők, átméretezhetők, egyenként beállíthatók; felhasználónként saját elrendezés, szerepkör szerinti alap-elrendezéssel. A prototípus szerinti működés és widget-kínálat jóváhagyva.
- **Nincs külön „Ma” oldal**, a menüben Kezdőlap marad. A **„Mai edzés” külön, részletes oldal** lesz, amire a Mai edzés widget visz.
- A meglévő modulok (Mérések, Egészség az anamnézissel, dokumentumokkal, testtérképpel) a helyükön maradnak, változatlan működéssel.
- A 2. szakasz hat része: (1) Kezdőlap widgetek, (2) Mai edzés oldal, (3) Naptár: edzés bármely nézetből, (4) Gyakorlattár gyorsítása, (5) elérhetőségi státusz, (6) Jelenlét külön menüpont.

## Célok

### 1. Kezdőlap: testreszabható widget-rács

- **Rács:** 4 oszlop asztalon, 2 oszlop tableten (860 px alatt), 1 oszlop telefonon (520 px alatt). Widget-méret: szélesség 1–4 oszlop, magasság 1–3 sor (egy sor ~132 px), a rács „sűrű” kitöltéssel (nincs lyuk). Telefonon minden widget teljes szélességű, a sorrend azonos az asztalival.
- **Szerkesztés mód** a Kezdőlap fejlécében („Szerkesztés” → „Kész”). Szerkesztésben: fogantyú a húzáshoz, sarok-fogantyú a méretezéshez (oszlop/sor rácsra pattan, a widget saját minimum-méretéig), X az eltávolításhoz, „Widget hozzáadása” és „Alaphelyzet” gomb. Billentyűzettel is rendezhető (a drag-and-drop könyvtár akadálymentes módjával). Telefonon húzással rendezhető, méretezni nem kell.
- **Widget-beállítások:** fogaskerék minden olyan widgeten, aminek van beállítása; oldalpanelben (Drawer) nyílik; a változás azonnal látszik és mentődik. Méret-választó gombok is (Kicsi 1×1, Széles 2×1, Magas 1×2, Közepes 2×2, Teljes sáv 4×1, Nagy 4×2), a minimum-méret alattiak nélkül.
- **Katalógus:** oldalpanel kategóriákkal (Áttekintés, Csapat és egészség, Teljesítmény, Eszközök), ékezet-független kereséssel. Csak azok a widgetek jelennek meg, amelyekhez a felhasználónak jogosultsága van. Egy widget egyszer vehető fel, kivéve a „többször is” jelölésűeket (Ranglista, Mérés-trend, Jegyzet).
- **Mentés:** azonnali (rövid késleltetéssel összevonva), a meglévő `user_dashboard_prefs.widgets` JSONB-be, felhasználónként és csapatonként. **Nincs adatbázis-változás.** Új elem-alak: `{ id, type, w, h, settings }`. A régi alak (`{ key, visible }`) beolvasáskor automatikusan átalakul (`id = type = key`, rejtett elemek kimaradnak, méret a widget alapértéke) — senkinek nem vész el a mostani beállítása.
- **Alap-elrendezés szerepkörönként** (a felhasználó csapatbeli szerepéből), a prototípus szerint:
  - Vezetőedző: Mai edzés 2×2, Ki bevethető 1×2, Következő mérkőzés 1×1, Teendők 1×1, Következő napok 2×1, Heti jelenlét 1×1, Szezon 1×1, Gyors műveletek 2×1.
  - Erőnléti edző: Mai edzés 2×1 (tömör), Ranglista 1×2 (relatív erő, top 5), Mérési lefedettség 1×2, Mérés-trend 2×2 (csapatátlag, guggolás, 8 hét), Friss mérések 2×1 (3 sor), Heti terhelés 2×1, Gyors műveletek 2×1 (mérés-csomag).
  - Gyógytornász: Ki bevethető 2×2, Rehab-státusz 2×1, Teendők 1×1 (egészség), Heti jelenlét 1×1 (hónap), Gyors műveletek 2×1 (egészség-csomag). (A Csapat-wellness, Sérülés-összesítő és Mai rehab-időpontok a 4. szakaszban kerülnek az alapba.)
  - Ami a jogosultság miatt nem látható, az kimarad; az „Alaphelyzet” erre az elrendezésre állít vissza.
- **Widgetek a 2. szakaszban** (jogosultsági kulcs zárójelben):

  | Widget | Beállítás | Megjegyzés |
  |---|---|---|
  | Mai edzés (calendar) | blokkok / tömör | „Jelenlét” és „Részletek” → Mai edzés oldal; ha ma nincs edzés, a következőt mutatja |
  | Ki bevethető? (players) | csak korlátozott+sérült / mindenki | az új elérhetőségi státuszból |
  | Következő mérkőzés (matches) | előző eredmény igen/nem | meglévő widget továbbfejlesztve |
  | Következő napok (calendar) | 7/14 nap; minden/meccs/edzés | a mostani „Következő 7 nap” |
  | Teendők (—) | minden / mérés / egészség | szabályok lent; csak a jogosultsággal látható tételek |
  | Szezon (macrocycle) | — | a mostani szezon-előrehaladás |
  | Heti jelenlét (attendance) | hét/hónap/szezon | a mostani widget, új jogosultsági kulccsal |
  | Rehab-státusz (rehab) | — | a mostani |
  | Friss mérések (measurement) | 3/5/8 sor | a mostani + „csúcs” jelölés |
  | Ranglista (stats) | mutató; top 3/5/mind | a mostani top3 továbbfejlesztve, többször is |
  | Mérés-trend (stats) | játékos vagy csapatátlag; gyakorlat; 8 hét/fél év/év | új, többször is |
  | Mérési lefedettség (measurement) | figyelmeztetés 4/6/8 hét után | új |
  | Heti terhelés (macrocycle) | — | új; most csak a tervezett terhelés a szezontervből |
  | Csapat-áttekintés (players) | — | a mostani |
  | Gyors műveletek (—) | edző/mérés/egészség csomag | a mostani, választható gombkészlettel; csak engedélyezett műveletek |
  | Kedvenc gyakorlatok (exercises) | — | új, a meglévő kedvencekből |
  | Jegyzet (—) | — | új, többször is; a szöveg a widget `settings`-ében, csak a felhasználó látja |

  A Csapat-wellness, Sérülés-összesítő és Mai rehab-időpontok a katalógusban **„4. szakasz” jelöléssel, letiltva** látszanak (nem vehetők fel), hogy látszódjon, mi jön.
- **Teendők szabályai** (mindegyik csak a megfelelő jogosultsággal):
  - mérés: játékosok, akiknek X hete (alap 6) nincs mérésük (measurement);
  - jelenlét: az elmúlt 7 nap olyan edzései, amelyekhez nincs jelenlét rögzítve (attendance);
  - egészség: sérült játékosok, akiknek a várható visszatérése 7 napon belül van (players vagy rehab);
  - szezon: mezociklus-váltás 7 napon belül (macrocycle).
  Minden tétel kattintható és a megfelelő oldalra visz. Ha nincs teendő: szöveges üres állapot („Minden rendben.”), emoji nélkül.

### 2. Mai edzés oldal

- Új útvonal: `/dashboard/mai-edzes`, opcionálisan `?session=<id>` egy konkrét edzéshez. Menü: Áttekintés csoport, „Mai edzés”, jogosultság: `calendar` view.
- Alapból a mai nap edzése; ha ma több van, fül/váltó közöttük; ha ma nincs, a következő edzés „Ma nincs edzés · a következő:” felirattal, és link a naptárhoz.
- Tartalom felülről lefelé:
  1. **Fejléc:** dátum, időpont (kezdés–befejezés), helyszín, típus (a `t-*` színnel), sablon neve, „Szerkesztés” (a meglévő TrainingSessionModal, `calendar` edit jog) és „Naptárban megnyitás”.
  2. **Edzésterv** a `session_data` alapján, típus szerint: konditermi gyakorlatok táblázata (gyakorlat, sorozat × ismétlés, terhelés, pihenő, tempó, megjegyzés), labdás edzés-típusok, taktikai tartalom. Ha üres: „Ehhez az edzéshez nincs terv” + sablon-választás (edit jog esetén).
  3. **Elérhetőség:** a csapat státusz-összesítője (bevethető/korlátozott/sérült), a nem bevethetők névvel.
  4. **Jelenlét-felvétel** (`attendance` edit jog): névsor mezszám szerint; alapból mindenki „jelen”, a sérült státuszú játékos alapból „sérült”; soronként egy kattintással állítható (jelen, hiányzik, beteg, sérült, egyéb) és megjegyzés. Egy „Mentés” gomb az egészre; mentés után az állapot és a mentés ideje látszik, újra szerkeszthető. Megtekintő jog esetén csak olvasható lista.
  5. **Edzés jegyzet:** a `training_sessions.notes` szerkesztése (calendar edit).
- A jelenlét-sorok az edzéshez kötődnek (lásd 6. pont); a Jelenlét oldal és a játékos rehab-füle ugyanezeket a sorokat látja és szerkeszti — nincs kettős rögzítés.

### 3. Naptár: edzés létrehozása bármely nézetből

- **Hónap nézet:** üres napra (vagy a nap „+” jelére) kattintva megnyílik a TrainingSessionModal az adott dátummal előtöltve.
- **Hét nézet:** a nap oszlopára / „+ edzés” helyre kattintva ugyanez.
- **Nap nézet:** a mostani működés marad.
- Meglévő edzésre kattintva (bármely nézetben) egy kis menü/panel: „Megnyitás a Mai edzés oldalon”, „Szerkesztés”, „Törlés” (jog szerint).
- A Gyors hozzáadás (QuickAdd) változatlanul megmarad.

### 4. Gyakorlattár gyorsítása

- A betöltés párhuzamos: a gyakorlatlista az első kérés után **azonnal** megjelenik (a jelenlegi csontváz-kártyák helyett), a kedvencek, az izom-kapcsolatok (lapozva, párhuzamosan), az izom- és eszközlisták párhuzamosan érkeznek. Amíg az izom-adatok nincsenek meg, az izom-szerinti szűrő jelzi, hogy tölt; a többi szűrő azonnal működik.
- A kártyákon soha nem töltődik GIF: ha a webp bélyegkép hiányzik, semleges ikon jelenik meg (a mostani GIF-tartalék helyett).
- A részlet-ablak kattintásra **azonnal** megnyílik a listában meglévő adatokkal (név, kép-bélyegkép, izomcsoport, nehézség), a lépések/tippek és a mozgó GIF utána töltődik.
- Mérhető cél: a lista első megjelenéséig egyetlen hálózati kérésre kell várni.

### 5. Elérhetőségi státusz

- Három állapot: **Bevethető**, **Korlátozott**, **Sérült**. Opcionálisan: várható visszatérés dátuma és rövid megjegyzés.
- **Új tábla** `player_availability` (napló, nem felülírás): `id`, `team_id`, `player_id`, `status` ('available' | 'limited' | 'injured'), `started_on` (date), `expected_return` (date, null), `note`, `created_by`, `created_at`. Egy játékos aktuális státusza a legutóbbi bejegyzése; ha nincs bejegyzés: bevethető. Minden változtatás új sor — ebből épül a 4–5. szakaszban a sérüléstörténet.
- **Beállítás helye:** Egészség modul (csapat-áttekintés és a játékos rehab-oldala), `rehab` edit joggal. **Megjelenik:** Kezdőlap (Ki bevethető?, Teendők), Mai edzés, Játékosok lista (státusz-címke), játékos profil.
- **RLS:** olvasás `players` VAGY `rehab` view joggal; írás `rehab` edit joggal.

### 6. Jelenlét külön menüpontként

- Új jogosultsági modul: `attendance` („Jelenlét”). Új menüpont a Csapat csoportban: „Jelenlét”, útvonal `/dashboard/jelenlet`, a mostani csapat-jelenléti naptárral (TeamAttendanceCalendar) — az Egészség oldalról a „Csapat jelenlét” fül ide költözik; a játékos rehab-oldalán a játékos saját jelenlét-füle marad.
- `player_attendance` kap egy opcionális `training_session_id` oszlopot (FK `training_sessions`, törléskor null). A Mai edzés oldal ezzel rögzít; a régi, edzéshez nem kötött sorok változatlanul érvényesek.
- RLS: a `player_attendance` olvasása/írása `attendance` VAGY `rehab` joggal (view / edit), hogy a gyógytornász semmit ne veszítsen.
- Alap-jogosultság az új modulra: vezetőedző edit, erőnléti edző edit, gyógytornász edit. Meglévő csapatoknál is ez kerül be.
- A Heti jelenlét widget jogosultsági kulcsa `rehab` → `attendance`.

## Adatbázis-változások (egy migrációs fájlcsomag)

1. `team_module_permissions.module_key` CHECK bővítése `attendance`-szel; backfill minden meglévő csapatra és szerepre; a `handle_new_team()` trigger-függvény frissítése, hogy új csapat is megkapja.
2. `player_attendance.training_session_id` oszlop (nullable FK, `on delete set null`) + index; RLS-policy-k cseréje `attendance` OR `rehab`-ra.
3. `player_availability` tábla + index (`team_id, player_id, started_on desc`) + RLS.

A migrációk idempotensek (`if not exists`, `on conflict do nothing`), a `supabase/migrations/` alá kerülnek, és a felhasználó futtatja a Supabase SQL Editorban. **Az app új verziója csak a migráció lefuttatása után kerülhet élesbe.** Ezt a PR leírása és az átadás egyértelműen jelzi.

## Nem célok

- Modulok összevonása (Teljesítmény-hub), egységes játékosprofil saját URL-lel, sablonok összekötése a gyakorlattárral → 3. szakasz.
- Játékos nézet, wellness, sRPE, időpontfoglalás, sérüléstörténet-felület, szakaszos visszatérés → 4–5. szakasz. (A Heti terhelés widget most csak a tervet mutatja.)
- Szabad, pixel-pontos widget-elhelyezés (a rács 4 oszlopra pattan), elrendezések megosztása felhasználók között.
- A meglévő Mérések, Egészség (anamnézis, dokumentumok, testtérkép) működésének változtatása.

## Amit nem szabad elrontani

- Senkinek nem vész el a mostani Kezdőlap-beállítása (régi JSON-alak átalakítása).
- A gyógytornász ugyanúgy látja és szerkeszti a jelenlétet, mint eddig.
- Jelenlét nem rögzül kétszer ugyanarra a játékosra és edzésre (Mai edzés és Jelenlét oldal ugyanazokat a sorokat kezeli).
- Az 1. szakasz minden szabálya érvényes: token-osztályok, közös UI-elemek, magyar szöveg, emoji nélkül, mindkét téma, 375 px-en vízszintes görgetés nélkül, `npm test`, `npm run build`, `npm run redesign:check -- src` zöld.

## Kényszerek

- Stack változatlan. Új függőség: egy akadálymentes drag-and-drop könyvtár (javaslat: `@dnd-kit/core` + `@dnd-kit/sortable`); más nem.
- Ág: `claude/redesign-2-napi-munka`, a redesign ágról. A PR alapja a redesign ág, amíg a PR #2 nincs a masterben; utána a master.

## Kész, ha

- A Kezdőlap a prototípus szerint működik (húzás, méretezés, beállítás, katalógus, alaphelyzet, szerepkör-alap), a beállítás újratöltés után és másik eszközön is megmarad, a régi elrendezések átalakulnak.
- A Mai edzés oldal megmutatja a mai (vagy következő) edzést tervvel, elérhetőséggel, és a jelenlét egy mentéssel rögzíthető.
- Edzés bármely naptár-nézetből létrehozható, és bármely edzés megnyitható a Mai edzés oldalon.
- A gyakorlattár listája egy kérés után megjelenik, a részlet-ablak azonnal nyílik.
- Az elérhetőség az Egészség modulban állítható, és mindenhol ugyanaz látszik; minden változás naplózódik.
- A Jelenlét saját menüpont saját jogosultsággal; a gyógytornász jogai nem csökkentek.
- Tesztek legalább: a régi→új widget-JSON átalakítás, az alap-elrendezés jogosultság-szűrése, a Teendők szabályai, az aktuális elérhetőség kiszámítása a naplóból, a Mai edzés edzés-választása (ma / több ma / nincs ma), a jelenlét „mindenki jelen” alapértéke és mentése.

## Rögzített részletek (a tervező döntései, a felhasználó átnézheti)

**Jelenlét és edzés kapcsolata**
- Részleges egyedi index: `(player_id, training_session_id) where training_session_id is not null` → a Mai edzés mentése idempotens upsert.
- Edzéshez kötött sor mezői: `date` = az edzés dátuma, `event_time` = az edzés kezdete, `training_type` = `'edzés'` minden edzéstípusnál (gym/ball/tactic/match_prep/other), `team_id` az edzésé.
- Régi, edzéshez nem kötött sorok: ha egy edzéshez nincs kötött sor, de ugyanarra a csapatra és napra vannak kötetlen sorok, és (a) aznap ez az egyetlen edzés, vagy (b) a sor `event_time`-ja egyezik az edzés kezdésével, akkor a Mai edzés oldal ezeket mutatja már rögzített jelenlétként, és mentéskor hozzáköti őket az edzéshez (nem hoz létre újat). Egyébként nem nyúl hozzájuk.
- Teendők / jelenlét szabály: csak az az edzés számít hiányzónak, amelynek a napjára a csapatnak semmilyen jelenlét-sora nincs (kötött vagy kötetlen) — így a migráció előtti edzések nem jelennek meg tévesen.
- Jelenlét csak mai vagy múltbeli edzéshez rögzíthető; jövőbelinél a névsor csak olvasható, „Az edzés napján rögzíthető” felirattal.

**Elérhetőség**
- A jelenlét alapértéke: bevethető és korlátozott → „jelen”, sérült → „sérült”. A jelenlét mentése nem ír az elérhetőségbe.
- Múltbeli edzésnél az **azon a napon** érvényes elérhetőség látszik (a naplóból), máskor a mai.
- Sorrend: `started_on` desc, azon belül `created_at` desc. Ha a várható visszatérés elmúlt és senki nem frissített, a státusz marad, a Teendők pedig „lejárt visszatérés” tételként jelzi (a 7 napon belüliek mellett).
- Javítás: `rehab` edit joggal egy bejegyzés szerkeszthető és törölhető (elírás javítására); a napló alapelve, hogy változásnál új sor készül.
- Minden játékos számít (archiválás nincs a rendszerben).

**Kezdőlap**
- Utólag elvett jogosultságú widget: megjelenítéskor rejtett, a JSON-ben megmarad (ha a jog visszajön, visszajön a helyére). A jogosultság nélküli widgetek tartalma (Teendők, Gyors műveletek) csak az engedélyezett tételeket mutatja; ha nem marad semmi: „Minden rendben.”, illetve a widget üres állapota.
- Sorrend = a tárolt tömb sorrendje; telefonon és tableten ez a sorrend, a „sűrű” kitöltés csak asztalon pakol. Tableten (2 oszlop) a 3–4 széles widget 2 szélesen jelenik meg, a tárolt méret nem változik. Méretezni csak asztali szélességen lehet, rendezni mindenhol.
- Visszafelé kompatibilitás: az új elemek mellé a régi mezők is mentődnek (`key` = type, `visible: true`), hogy egy régebbi verzió se üres kezdőlapot mutasson.
- Relatív erő = 1RM / testsúly (a Ranglista meglévő számítása). „Csúcs” = a játékos eddigi legjobb értéke az adott gyakorlatban (sprintnél a legkisebb). Mérés-trend csapatátlag: hetente az aznapig mért értékek átlaga, mérés nélküli hét kimarad (nincs interpoláció).

**Mai edzés kiválasztása**
- „Következő” = dátum, azon belül kezdési idő szerint az első, típustól függetlenül (a `matches` tábla mérkőzései nem tartoznak ide). A mai edzések egész nap a mai napon maradnak, akkor is, ha már véget értek.

**Jogosultságok**
- A Jelenlét oldal az `attendance` kulcsot, a játékos rehab-oldalának jelenlét-füle továbbra is a `rehab` kulcsot használja; mindkettő a saját kulcsa szerint rejtett. RLS: bármelyik elég.
- A `module_key` CHECK megszorítás neve automatikus: a migráció a `pg_constraint`-ből keresi ki és cseréli.

## A builderre hagyva

- A drag-and-drop és a méretezés technikai megvalósítása (a rácsra pattanás és a min-méretek kötelezőek).
- A widgetek belső kinézete a prototípus szellemében; az adat-lekérdezések formája (React Query, kulcsban a beállításokkal).
- A Mai edzés oldal pontos elrendezése (asztalon kétoszlopos lehet), a naptári „edzés-menü” formája.
- A migráció fájlbontása.
