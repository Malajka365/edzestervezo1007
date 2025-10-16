# Terhelési Faktorok Adatbázis Setup

## 📋 Lépések

### 1. Nyisd meg a Supabase Dashboard-ot
Menj a projektedhez: https://supabase.com/dashboard

### 2. SQL Editor
- Kattints a bal oldali menüben a **SQL Editor**-ra
- Kattints a **New query** gombra

### 3. Futtasd az SQL Migrációt
Másold be és futtasd le a következő fájl tartalmát:
```
supabase/migrations/20250112_create_training_load_factors.sql
```

Vagy közvetlenül:

```sql
-- Create training_load_factors table for storing weekly load factor data
CREATE TABLE IF NOT EXISTS training_load_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Load factors
  circulation_load INTEGER CHECK (circulation_load >= 1 AND circulation_load <= 5),
  mechanical_load INTEGER CHECK (mechanical_load >= 1 AND mechanical_load <= 5),
  energy_system VARCHAR(50),
  duration VARCHAR(50),
  work_rest_ratio VARCHAR(20),
  training_type VARCHAR(100),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one record per team per date
  UNIQUE(team_id, date)
);

-- Create index for faster queries
CREATE INDEX idx_training_load_factors_team_date ON training_load_factors(team_id, date);

-- Enable RLS
ALTER TABLE training_load_factors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view load factors for their teams"
  ON training_load_factors
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert load factors for their teams"
  ON training_load_factors
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update load factors for their teams"
  ON training_load_factors
  FOR UPDATE
  USING (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete load factors for their teams"
  ON training_load_factors
  FOR DELETE
  USING (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_training_load_factors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_load_factors_updated_at
  BEFORE UPDATE ON training_load_factors
  FOR EACH ROW
  EXECUTE FUNCTION update_training_load_factors_updated_at();
```

### 4. Futtasd le
Kattints a **Run** gombra (vagy nyomj Ctrl+Enter)

### 5. Ellenőrzés
Ha minden rendben ment, a következő üzenetet kell látnod:
```
Success. No rows returned
```

## ✅ Kész!

Most már az alkalmazás automatikusan menti a terhelési faktorokat!

## 🔄 Automatikus Mentés Működése

- **Csillagok (Keringési, Mechanikai)**: Azonnal mentődik kattintáskor
- **Dropdownok (Energiarendszer, Terhelés:Pihenő)**: Azonnal mentődik választáskor
- **Szöveges mezők (Időtartam, Típus)**: 1 másodperc késleltetéssel mentődik (debounce)

## 📊 Adatbázis Struktúra

| Mező | Típus | Leírás |
|------|-------|--------|
| `id` | UUID | Egyedi azonosító |
| `team_id` | UUID | Csapat hivatkozás |
| `date` | DATE | Dátum (YYYY-MM-DD) |
| `circulation_load` | INTEGER | Keringési terhelés (1-5) |
| `mechanical_load` | INTEGER | Mechanikai terhelés (1-5) |
| `energy_system` | VARCHAR | Energiarendszer típus |
| `duration` | VARCHAR | Időtartam |
| `work_rest_ratio` | VARCHAR | Terhelés:Pihenő arány |
| `training_type` | VARCHAR | Edzés típus |
| `created_at` | TIMESTAMPTZ | Létrehozás időpontja |
| `updated_at` | TIMESTAMPTZ | Módosítás időpontja |

## 🔒 Biztonság

- Row Level Security (RLS) engedélyezve
- Csak saját csapatok adataihoz van hozzáférés
- Automatikus `updated_at` frissítés
