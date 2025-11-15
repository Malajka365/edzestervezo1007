# Debug: Makrociklus-Mérkőzések Integráció

## Azonosított Problémák és Megoldások

### ❌ Probléma #1: `opponent` mező NOT NULL
**Hiba:** Az `opponent` mező kötelező volt, de makrociklusból létrehozott mérkőzéseknél nincs ellenfél.
**Megoldás:** ✅ `ALTER TABLE matches ALTER COLUMN opponent DROP NOT NULL;`

### ❌ Probléma #2: Rossz oszlopnév
**Hiba:** `match_type` helyett `type` az oszlop neve.
**Megoldás:** ✅ Javítva a kódban: `type: 'league'`

### ❌ Probléma #3: Üres string vs NULL
**Hiba:** Üres stringet próbáltunk beszúrni NOT NULL mezőbe.
**Megoldás:** ✅ `opponent: null` használata

### ✅ Hozzáadott Fejlesztések

1. **Debug Logok:**
   - Console logok minden lépésnél
   - Látható: weekIdx, dayIdx, dailyKeys, season, team, date
   - Hibák részletes kiírása

2. **NULL Kezelés:**
   - `opponent || '(Ellenfél nincs megadva)'` a Matches oldalon

3. **Sikeres Insert Visszajelzés:**
   - `.select()` hozzáadva az insert-hez
   - Console log a létrehozott match-ről

## Tesztelési Lépések

1. **Nyisd meg a böngésző konzolt** (F12)
2. **Menj a Makrociklus Tervező oldalra**
3. **Válassz egy szezont**
4. **Kattints egy napra** és válaszd a "Home" vagy "Away" opciót
5. **Figyeld a konzolt:**
   ```
   🔄 syncMatchWithMacrocycle called: {weekIdx: 0, dayIdx: 0, ...}
   📅 Calculated date: 2025-01-20
   🏠 Home/Away check: {hasHome: true, hasAway: false}
   ✅ Match created successfully: [{...}]
   ```
6. **Menj a Mérkőzések oldalra**
7. **Ellenőrizd:** Megjelent-e az új mérkőzés?

## Várható Eredmény

```
Mérkőzések oldalon:
┌─────────────────────────────────────────────┐
│ 📅 2025-01-20 (Hétfő) • ⏰ 18:00            │
│ 🏠 Csapatod vs (Ellenfél nincs megadva)     │
│ 🏆 Bajnoki                                  │
│ 🔵 Makrociklus: Hét 1, Hétfő                │
└─────────────────────────────────────────────┘
```

## Ha Még Mindig Nem Működik

### Ellenőrizd:

1. **currentSeason létezik?**
   - Konzol: `currentSeason?.id` nem undefined?

2. **selectedTeam létezik?**
   - Konzol: `selectedTeam?.id` nem undefined?

3. **Dátum helyesen számítva?**
   - Konzol: `matchDate` formátum: YYYY-MM-DD?

4. **RLS Policies:**
   ```sql
   -- Ellenőrizd a Supabase-ben
   SELECT * FROM matches WHERE created_from_macrocycle = true;
   ```

5. **Supabase Hiba?**
   - Konzol: Van-e piros hibaüzenet?
   - Supabase Dashboard > Logs > Check for errors

## SQL Ellenőrzés

```sql
-- Ellenőrizd, hogy létrejöttek-e a match-ek
SELECT 
    id,
    date,
    home_away,
    opponent,
    created_from_macrocycle,
    macrocycle_week_index,
    macrocycle_day_index,
    season_id
FROM matches
WHERE created_from_macrocycle = true
ORDER BY date DESC;
```

## Következő Lépések

Ha a fenti javítások után sem működik:
1. Frissítsd a böngészőt (Ctrl+Shift+R)
2. Ellenőrizd a konzolt hibákért
3. Nézd meg a Supabase Logs-ot
4. Teszteld egy új szezonnal
