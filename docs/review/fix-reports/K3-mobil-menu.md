# K3 — Dashboard mobil menü hiba javítása

Fájl: `src/pages/Dashboard.jsx`
Kapcsolódó review: `docs/review/05-design-ux.md`, "Dashboard.jsx routing-hibája" szakasz.

## A hiba

A `DashboardContent` komponens `return`-jében a "Main Content" blokk egyetlen hosszú
ternary-láncot tartalmazott (kb. 321-343. sor eredetileg):

```jsx
{activeModule === 'rehab' ? (
  <Rehabilitation />
) : activeModule === 'macrocycle' ? (
  <MacrocyclePlanner />
) : activeModule === 'teams' ? (
  <Teams />
) : ... // calendar, measurement, leaderboard, exercises, templates, matches, trainingload, progress
) : (
  <>
    <header>...hamburger gomb (Menu ikon)...</header>
    <main className="p-6">
      {activeModule === 'home' && (...)}
      {activeModule === 'teams' && <Teams />}
      ... // ugyanaz a 10 modul még egyszer felsorolva
      {activeModule === 'profile' && <Profile ... />}
      {activeModule !== 'home' && ... !== 'profile' && ... (fallback "fejlesztés alatt")}
    </main>
  </>
)}
```

Mivel ez egyetlen JSX-kifejezés (ternary-lánc), runtime-ban mindig **csak egy ág fut le**.
A `<header>` (benne a mobil hamburger gombbal, ami a `setSidebarOpen(true)`-t hívja) kizárólag
az utolsó, `else`-ágban (a `<>...</>` blokkban) létezett.

Következmény: ha `activeModule` értéke `rehab`, `macrocycle`, `teams`, `calendar`,
`measurement`, `leaderboard`, `exercises`, `templates`, `matches`, `trainingload` vagy
`progress`, akkor a komponens **közvetlenül** a modult renderelte (`<Teams />`, `<Calendar />`
stb.), a header/hamburger nélkül. Mobil nézetben (`lg:` alatt) a sidebar `-translate-x-full`
állapotban van alapból, és csak a hamburger gomb tudja `sidebarOpen`-t igazra állítani — enélkül
a felhasználó egy adott modulon rekedt, nem tudott visszalépni.

Csak a `home`, `profile` és bármilyen nem definiált `activeModule` érték futott az `else`
ágba, ahol a header (és így a hamburger) létezett.

## A holt kódblokk (eredetileg kb. 440-458. sor)

Az `else` ág `<main>` tartalma egy második, `&&` alapú feltétel-sorozatot tartalmazott,
amely *ugyanazt* a 10 modult (`teams`, `macrocycle`, `calendar`, `exercises`, `templates`,
`matches`, `measurement`, `trainingload`, `leaderboard`, `progress`) újra kezelte:

```jsx
{activeModule === 'teams' && <Teams />}
{activeModule === 'macrocycle' && <MacrocyclePlanner />}
... stb.
```

Ez **elérhetetlen (unreachable) kód** volt, nem csupán felesleges duplikáció:
mivel a külső ternary-lánc korábbi ágai (`activeModule === 'teams' ? <Teams/> : ...`)
ugyanazokra az `activeModule` értékekre már igazak és lezárják a kifejezést, a JS/JSX
kiértékelő soha nem juthatott el az `else` ágba ezekkel az értékekkel — így ezek a
`&&` blokkok garantáltan `false`-ra értékelődtek ki, sosem renderelődtek. (Ez magyarázza a
korábbi megfigyelést, hogy "minden modult kétszer renderel a forráskód" — forráskód szinten
duplikált volt, de futásidőben sosem futott le egyszerre kétszer, mert kizárt ágakban voltak.)

## A javítás

Egyetlen, mindig renderelt `<header>`-t emeltem ki a "Main Content" `div` (`lg:ml-72`) tetejére,
a ternary-láncon **kívülre** — így minden `activeModule` érték esetén lefut, a hamburger gomb
(`<Menu>` ikon, `onClick={() => setSidebarOpen(true)}`) mindig jelen van mobilon.

A tartalom-terület ezután egyetlen, lapos ternary-lánc, ág/modul duplikáció nélkül:

- `rehab`, `macrocycle`, `teams`, `calendar`, `measurement`, `leaderboard`, `exercises`,
  `templates`, `matches`, `trainingload`, `progress` → közvetlenül a saját komponensük
  (`<Rehabilitation />`, `<Teams />` stb.), változatlanul, header nélküli wrapperben — pontosan
  úgy, ahogy korábban is (ezek a komponensek maguk kezelik a saját belső layoutjukat).
- `profile` → `<main className="p-6"><Profile session={session} /></main>` (a stílus
  megegyezik az eredeti `<main className="p-6">` wrapperrel, csak most külön ágként).
- minden más eset (`home` vagy ismeretlen modul) → az eredeti `<main className="p-6">` tartalom:
  `home` esetén az üdvözlő/quick-access grid, egyébként (nem `home`) az eredeti "fejlesztés
  alatt" fallback kártya. A korábbi hosszú `activeModule !== 'x' && ... !== 'y'` feltétel-lánc
  helyett egyszerű `activeModule !== 'home'` elég, mert minden más névvel azonosított modult
  már a fenti ágak lefednek — ez pontosan ugyanazt a viselkedést adja, csak nem duplikált forrás
  mellett.

A holt `&&` blokkot (a második `teams`/`macrocycle`/... felsorolást) töröltem, mert a fenti
okok miatt bizonyítottan sosem futott le.

### Módosítatlan maradt

- A `TeamProvider` / `DashboardContent` szülő-gyerek szerkezet (a `useTeams()` hívás a
  `DashboardContent`-ben, `TeamProvider`-en belül) — nem nyúltam hozzá az `export default
  function Dashboard` komponenshez.
- A sidebar (`<aside>`) és a mobil overlay (`sidebarOpen && <div className="... lg:hidden" />`)
  logikája.
- Az asztali (`lg:`) megjelenés: a sidebar `lg:translate-x-0` miatt továbbra is mindig látszik
  ≥lg breakpointon, a header tartalma (modul cím, leírás, `TeamSelector`) változatlan maradt.
- A `TeamSelector` minden nézeten látható marad (a headerben van, ami most már mindig renderelt).

## Modulonkénti ellenőrzés — honnan jön a hamburger most

| `activeModule` | Header (hamburger) forrása |
|---|---|
| `home` | mindig renderelt header a `lg:ml-72` div tetején |
| `teams` | ugyanaz |
| `macrocycle` | ugyanaz |
| `calendar` | ugyanaz |
| `exercises` | ugyanaz |
| `templates` | ugyanaz |
| `matches` | ugyanaz |
| `measurement` | ugyanaz |
| `trainingload` | ugyanaz |
| `leaderboard` | ugyanaz |
| `progress` | ugyanaz |
| `rehab` | ugyanaz |
| `profile` | ugyanaz |
| bármilyen más/ismeretlen | ugyanaz (fallback "fejlesztés alatt" kártya) |

Mind a 14 lehetséges állapot ugyanabból az egyetlen, feltétel nélkül renderelt `<header>`-ből
kapja a hamburger gombot — nincs többé per-modul elágazás a header renderelésében.

## Build ellenőrzés

```
npm run build
✓ 2893 modules transformed.
✓ built in 13.52s
```

Hiba nélkül lefutott (a kimenetben csak a szokásos, a feladathoz nem kapcsolódó
chunk-méret és browserslist figyelmeztetések jelentek meg).

## Commit

`git add src/pages/Dashboard.jsx`
`fix: show mobile menu button on all module views, remove dead header branch`
