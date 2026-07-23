# GY1 - PNG -> SVG csere (body-diagram) - BLOCKED

## Cel
`src/components/BodyDiagram.jsx` altal hasznalt 1.2 MB-os `body-diagram.png` lecserelese a
mar meglevo 8.5 KB-os `body-diagram.svg`-re, a `docs/review/03-teljesitmeny.md` PNG->SVG
javaslata alapjan.

## Amit talaltam

### A kepek nem csereszabatosak - eltero belso arany

A ket kep egyetlen fajlban tartalmazza az "elolnezet" es "hatulnezet" testabrat egymas
mellett (sprite-szeru elrendezes), es a komponens CSS-sel vagja ki a megfelelo felet:

```jsx
style={{
  backgroundImage: `url(${bodyDiagram})`,
  backgroundSize: '200% 100%',       // a teljes sprite 2x szelesre nyujtva
  backgroundPosition: '0% 0%',       // front: bal fel  | back: '100% 0%' jobb fel
  aspectRatio: '1 / 2.5',            // a konteneren maga is fix aranyu
  ...
}}
```

Merteek (PNG IHDR fejlecbol es SVG viewBox/translate-bol olvasva):

| Asset | Teljes meret | Egy nezet (fel) merete | Egy nezet aranya (szel:magas) |
|---|---|---|---|
| `body-diagram.png` | 1024 x 1024 | 512 x 1024 | **1 : 2.0** |
| `body-diagram.svg` | 800 x 1000 (`viewBox="0 0 800 1000"`, `front` `translate(0,0)`, `back` `translate(400,0)`) | 400 x 1000 | **1 : 2.5** |

A ket forraskep sajat belso aranya kb. **25%-kal ter el egymastol** (0.5 vs 0.4). A CSS a
konteneren fix `aspect-ratio: 1 / 2.5`-öt kenyszerit, es a `backgroundSize: 200% 100%`
mindig pontosan kitolti a konteneit - tehat mindket kepnel ervenyes marad, hogy egy uj
kattintas (%-os x/y, a konteiner `getBoundingClientRect()`-jebol szamolva,
`BodyDiagram.jsx` 22-24. sor) helyesen kerul vissza ugyanoda, amit a felhasznalo lat.

A valodi problema a **mar elmentett, meglevo fajdalompontokkal** van:
- A PNG a sajat 1:2 aranyahoz kepest ~25%-kal "nyulik meg" fuggolegesen, hogy kitoltse az
  1:2.5 aranyu konteinert -> a jelenleg latott (es korabban rogzitett) pontok ehhez a
  megnyujtott PNG-testabrahoz vannak kalibralva.
- Az SVG belso aranya mar eleve 1:2.5, tehat SVG-re valtva a testabra **nem** nyulik meg -
  a fej/nyak/vall/torzs hatarai maskepp fognak esni a konteineren belul, mint a PNG-nel.
- Emiatt egy korabban pl. a vallra rogzitett pont a csere utan latvanyban athelyezodhet
  (pl. a nyakra vagy a felkarra), holott a tarolt %-os koordinata nem valtozik.

A `painPoints` adat perzisztalt (nem csak lokalis state): felhasznalva es mentve itt:
- `src/components/AnamnesisForm.jsx`
- `src/pages/PlayerProfileRehab.jsx` (`getMergedPainPoints()` -> `readOnly` `BodyDiagram`)

Ez egy egeszsegugyi/rehab modulban rogzitett paciens-adat (fajdalompontok testabran), ahol
a vizualis elcsuszas felrevezeto lehet - pontosan az a szcenario, amit a feladatleiras
"BLOCKED" esetkent jelolt meg.

## Dontes

**Nem hajtottam vegre a cseret.** Az importot es a PNG fajlt valtozatlanul hagytam.

## Amit ELLENOREZTEM, de nem valtoztattam

- `grep -rn "body-diagram" src/` -> a PNG-t kizarolag a `src/components/BodyDiagram.jsx`
  importalja, mas hivatkozas nincs ra.
- `npm run build`-ot **nem futtattam**, mert nem volt tenyleges kodvaltozas a
  BodyDiagram-ban / assetekben.
- Commit **nem tortent**.

## Javasolt kovetkezo lepes (ehhez emberi/design dontes kell)

1. Ha az SVG-t akarjuk hasznalni: at kell rajzolni/skalazni ugy, hogy egy nezet (fel)
   aranya pontosan 1:2 legyen (pl. `viewBox="0 0 1024 1024"`, front `0-512`, back
   `translate(512,0)`), hogy a meglevo, mentett `%`-os fajdalompontok ugyanoda essenek,
   mint korabban a PNG-n.
2. Alternativan at lehet szamolni/migralni a mar mentett `painPoints.x/y` ertekeket az uj
   aranyra (linearis fuggoleges skalazas 1:2 -> 1:2.5 kozott), de ehhez tudni kellene,
   hany rekordban es milyen tablaban vannak tarolva ezek az ertekek, es ez migraciots
   kockazatot jelent eles paciens-adaton.
3. Csak ezutan erdemes a tenyleges import-cseret es a PNG torlest elvegezni.

## Osszefoglalo (max 10 sor a hivonak)

Status: BLOCKED
Commit: nincs (nem tortent kod-/asset-valtoztatas)
Bundle size evidence: nem relevans, mert nem volt build-elheto valtozas
Concerns:
- `body-diagram.png` fel-nezete 1:2 aranyu (512x1024), `body-diagram.svg` fel-nezete 1:2.5
  aranyu (400x1000) - kb. 25%-os elteres.
- A `painPoints` (fajdalompontok) `%`-os koordinatai perzisztalt paciens-adatok
  (`AnamnesisForm.jsx`, `PlayerProfileRehab.jsx`); csere eseten a mar rogzitett pontok
  vizualisan mas testtajra csuszhatnak at, holott a szamertek nem valtozik.
- Az SVG csak akkor biztonsagos csere, ha ujrarajzoljak 1:2 aranyra, vagy ha a meglevo
  adatbazis-rekordok koordinatait migraljak az uj aranyhoz.
