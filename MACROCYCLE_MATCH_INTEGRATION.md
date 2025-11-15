# Makrociklus ↔ Mérkőzések Integráció

## Áttekintés

Ez a funkció automatikusan összekapcsolja a Makrociklus Tervező napi bontását a Mérkőzések modullal. Amikor a makrociklusban "Home" vagy "Away" kerül egy napra, automatikusan létrejön egy mérkőzés rekord az adatbázisban.

## Működés

### 1. Automatikus Mérkőzés Létrehozás

**Trigger:** Amikor a makrociklus napi bontásában kiválasztod a "Home" (H) vagy "Away" (A) opciót.

**Folyamat:**
1. Dátum számítás: `week.startDate + dayIndex`
2. Ellenőrzés: Van-e már match ezen a pozíción?
3. Ha nincs: Új match létrehozása
4. Ha van: Meglévő match frissítése (date, home_away)

**Létrehozott mezők:**
```javascript
{
  team_id: selectedTeam.id,
  season_id: currentSeason.id,
  date: "2025-01-20",              // Számított
  home_away: "home" | "away",      // Kiválasztott
  created_from_macrocycle: true,   // Jelölés
  macrocycle_week_index: 3,        // Hét index (0-51)
  macrocycle_day_index: 1,         // Nap index (0-6)
  opponent: "",                    // Később kitölthető
  time: "18:00",                   // Alapértelmezett
  match_type: "league"             // Alapértelmezett
}
```

### 2. Automatikus Törlés

**Trigger:** Amikor az "Üres" gombra kattintasz, vagy eltávolítod a Home/Away jelölést.

**Folyamat:**
1. Keresés: Match a megadott season_id + week_index + day_index alapján
2. Törlés: Ha létezik, törlődik az adatbázisból

### 3. Frissítés

**Trigger:** Amikor Home ↔ Away váltasz ugyanazon a napon.

**Folyamat:**
1. Meglévő match megkeresése
2. Csak a `date` és `home_away` mezők frissülnek
3. Az `opponent`, `time`, `location`, `notes` mezők **megmaradnak**

## Adatbázis Változások

### Új Mezők a `matches` Táblában

```sql
ALTER TABLE matches 
ADD COLUMN season_id UUID REFERENCES training_seasons(id),
ADD COLUMN created_from_macrocycle BOOLEAN DEFAULT FALSE,
ADD COLUMN macrocycle_week_index INTEGER,
ADD COLUMN macrocycle_day_index INTEGER;
```

### Indexek

```sql
CREATE INDEX idx_matches_season_id ON matches(season_id);
CREATE INDEX idx_matches_macrocycle 
  ON matches(season_id, macrocycle_week_index, macrocycle_day_index);
CREATE UNIQUE INDEX idx_matches_unique_season_date 
  ON matches(season_id, date) 
  WHERE created_from_macrocycle = TRUE;
```

## Használat

### Makrociklus Tervezőben

1. Válassz egy szezont
2. Kattints egy nap cellájára a napi bontásban
3. Válaszd a "Home" (H) vagy "Away" (A) opciót
4. ✅ Automatikusan létrejön a mérkőzés

### Mérkőzések Oldalon

1. A makrociklusból létrehozott mérkőzések **teal színű jelöléssel** láthatók
2. Jelölés: "Makrociklus: Hét X, Nap Y"
3. Kitöltheted az ellenfél nevét, időpontot, helyszínt
4. Törléskor figyelmeztetés jelenik meg

## Edge Case-ek

### 1. Már Létező Mérkőzés
**Probléma:** Mi van, ha már van match azon a napon (nem makrociklusból)?
**Megoldás:** A unique index csak `season_id + date + created_from_macrocycle = TRUE` párosra vonatkozik, így nem ütközik.

### 2. Mérkőzés Szerkesztése
**Probléma:** Ha szerkesztem a match-et, elvész az adat?
**Megoldás:** Csak a `date` és `home_away` frissül automatikusan, minden más mező megmarad.

### 3. Mérkőzés Törlése
**Probléma:** Ha törlöm a match-et, frissül a makrociklus?
**Megoldás:** NEM. A törlés csak a matches táblát érinti. Figyelmeztetés jelenik meg.

### 4. Szezon Törlése
**Probléma:** Mi történik a mérkőzésekkel?
**Megoldás:** `ON DELETE SET NULL` - a season_id NULL lesz, de a match megmarad.

## Kód Helyek

### MacrocyclePlanner.jsx

- `getDateFromWeekAndDay(weekIdx, dayIdx)` - Dátum számítás
- `syncMatchWithMacrocycle(weekIdx, dayIdx, dailyKeys)` - Szinkronizálás
- `handleDailyClick()` - Módosítva: hívja a sync-et
- "Üres" gomb - Módosítva: törli a match-et

### Matches.jsx

- Match card - Makrociklus jelölés megjelenítése
- `deleteMatch()` - Módosítva: figyelmeztetés

## Migráció Futtatása

1. Nyisd meg a Supabase Dashboard-ot
2. Menj a SQL Editor-ba
3. Másold be a `supabase/migrations/20250117_add_macrocycle_match_integration.sql` tartalmát
4. Futtasd le

## Tesztelés

- [ ] Home kiválasztása → Match létrejön
- [ ] Away kiválasztása → Match létrejön  
- [ ] Home → Away váltás → Match frissül
- [ ] "Üres" gomb → Match törlődik
- [ ] Match szerkesztése → Adatok megmaradnak
- [ ] Match törlése → Figyelmeztetés jelenik meg
- [ ] Makrociklus jelölés látható a Matches oldalon

## Jövőbeli Fejlesztések

- [ ] Kétirányú szinkronizálás (Match törlése → Makrociklus frissítés)
- [ ] Bulk operations (több match egyszerre)
- [ ] Szezon dátum változás → Összes match újraszámítása
- [ ] Vizuális kapcsolat: Link a match-ről a makrociklusba
