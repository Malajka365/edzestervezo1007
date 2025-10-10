-- ============================================
-- MAKROCIKLUS SABLONOK TÁBLA LÉTREHOZÁSA
-- ============================================
-- 
-- Futtasd ezt a script-et a Supabase Dashboard SQL Editor-ban:
-- 1. Nyisd meg: https://supabase.com/dashboard
-- 2. Válaszd ki a projektet
-- 3. Menj a "SQL Editor" menüpontra
-- 4. Másold be ezt a teljes fájlt
-- 5. Kattints a "Run" gombra
--
-- ============================================

-- 1. Tábla létrehozása
CREATE TABLE IF NOT EXISTS macrocycle_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  planning JSONB DEFAULT '{}'::jsonb,
  mesocycles JSONB DEFAULT '[]'::jsonb,
  week_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Index létrehozása a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_macrocycle_templates_team_id 
ON macrocycle_templates(team_id);

-- 3. Row Level Security (RLS) engedélyezése
ALTER TABLE macrocycle_templates ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy-k létrehozása

-- Megtekintés policy
DROP POLICY IF EXISTS "Users can view templates for their teams" ON macrocycle_templates;
CREATE POLICY "Users can view templates for their teams"
  ON macrocycle_templates FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Létrehozás policy
DROP POLICY IF EXISTS "Users can create templates for their teams" ON macrocycle_templates;
CREATE POLICY "Users can create templates for their teams"
  ON macrocycle_templates FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Frissítés policy
DROP POLICY IF EXISTS "Users can update templates for their teams" ON macrocycle_templates;
CREATE POLICY "Users can update templates for their teams"
  ON macrocycle_templates FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Törlés policy
DROP POLICY IF EXISTS "Users can delete templates for their teams" ON macrocycle_templates;
CREATE POLICY "Users can delete templates for their teams"
  ON macrocycle_templates FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- 5. Trigger függvény létrehozása az updated_at automatikus frissítéséhez
CREATE OR REPLACE FUNCTION update_macrocycle_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger létrehozása
DROP TRIGGER IF EXISTS update_macrocycle_templates_updated_at ON macrocycle_templates;
CREATE TRIGGER update_macrocycle_templates_updated_at
  BEFORE UPDATE ON macrocycle_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_macrocycle_templates_updated_at();

-- ============================================
-- ELLENŐRZÉS
-- ============================================

-- Ellenőrizd, hogy a tábla létrejött-e:
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'macrocycle_templates'
ORDER BY ordinal_position;

-- Sikeres futtatás esetén látni fogod a tábla oszlopait!
