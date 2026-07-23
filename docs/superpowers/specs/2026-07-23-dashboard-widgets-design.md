# Testreszabható összegző Dashboard (widget-rendszer)

## Cél

A `/dashboard` főoldal jelenleg statikus (üdvözlő + modul-kártyák). Helyette élő adat-widgeteket mutat, felhasználónként és csapatonként testreszabhatóan (mely widgetek, milyen sorrendben).

Felhasználói döntések: alapértelmezetten a **Következő 7 nap**, **Következő mérkőzés**, **Heti jelenlét**, **Rehab-státusz** widgetek aktívak; a régi modul-kártya rács **megszűnik** (navigáció a sidebarból).

## Widget-készlet (9)

| key | Név | Adat | module_key (jogosultság) |
|---|---|---|---|
| upcoming_week | Következő 7 nap | training_sessions + matches, ma+7 nap, időrendben | calendar |
| next_match | Következő mérkőzés | legközelebbi jövőbeli match, napok száma | matches |
| weekly_attendance | Heti jelenlét | player_attendance e heti aránya, hiányzók | rehab |
| rehab_status | Rehab-státusz | aktív anamnézisek száma, legfrissebbek | rehab |
| recent_measurements | Friss mérések | utolsó 5 measurement (játékos+gyakorlat+érték) | measurement |
| leaderboard_top3 | Ranglista top 3 | legjobb testsúlyarányos 1RM | stats |
| season_progress | Szezon-állás | aktuális szezon: hányadik hét / összes | macrocycle |
| team_overview | Csapat-áttekintő | játékosszám + tagok szerepkörönként | players |
| quick_actions | Gyors műveletek | navigációs gombok (Új edzés → naptár, Új mérés → mérések, Új játékos → csapatok) | — (mindig) |

Jogosultság: widget csak akkor jeleníthető meg/választható, ha a module_key-e legalább `view` a felhasználó csapat-szerepkörében (`isModuleVisible` újrahasznosítva); `quick_actions` gombjai egyenként szűrve `canEditModule`-lal.

## Testreszabás

- Tábla: `user_dashboard_prefs (user_id, team_id, widgets jsonb, updated_at)`, PK (user_id, team_id). `widgets` = rendezett tömb: `[{"key":"upcoming_week","visible":true}, ...]`.
- RLS: SELECT/INSERT/UPDATE/DELETE csak `user_id = auth.uid()`.
- Nincs mentett prefs → szerepkör-alapú default: coach = a 4 kiválasztott + quick_actions; physiotherapist = weekly_attendance, rehab_status, upcoming_week; fitness_coach = recent_measurements, leaderboard_top3, upcoming_week, quick_actions. (Jogosultság-szűrés a defaultra is fut.)
- UI: "Testreszabás" gomb a home fejlécében → szerkesztő mód: widgetenként ki/be kapcsoló + fel/le nyíl a sorrendhez; Mentés = upsert, Mégse = elvet.

## Architektúra

- `src/lib/dashboardWidgets.js` — registry: `[{key, name, icon, module_key, component}]` + `getDefaultWidgets(role, permissions)`.
- `src/pages/dashboard-home/widgets/*.jsx` — 9 widget-komponens; mindegyik saját React Query lekérdezés (`['widget', key, teamId]` kulcs, a provider 5 perc staleTime-ja örökölve), `WidgetCard` közös keret (cím, ikon, loading-spinner, hiba-állapot, üres-állapot).
- `src/hooks/useDashboardPrefs.js` — prefs betöltés (React Query `['dashboard_prefs', userId, teamId]`) + mentés (upsert + invalidálás).
- `src/pages/DashboardHome.jsx` — átírva: prefs → látható widgetek renderelése sorrendben, rács (1/2/3 oszlop reszponzívan); szerkesztő mód.

## Nem cél

- Drag&drop (fel/le nyíl elég), widget-méretezés, csapatfüggetlen globális prefs, valós idejű frissítés.
