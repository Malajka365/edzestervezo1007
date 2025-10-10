-- ============================================
-- KÉZILABDA EDZÉSTERVEZŐ RENDSZER
-- ============================================

-- 1. EDZÉSSABLONOK TÁBLA
CREATE TABLE IF NOT EXISTS training_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gym', 'ball', 'tactic', 'match_prep', 'other')),
  category TEXT,
  duration INTEGER, -- minutes
  template_data JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_templates_team_id ON training_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_training_templates_type ON training_templates(type);

-- 2. EDZÉSEK TÁBLA
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  type TEXT NOT NULL CHECK (type IN ('gym', 'ball', 'tactic', 'match_prep', 'other')),
  template_id UUID REFERENCES training_templates(id) ON DELETE SET NULL,
  session_data JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  attendance JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_team_id ON training_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(date);
CREATE INDEX IF NOT EXISTS idx_training_sessions_template_id ON training_sessions(template_id);

-- 3. MÉRKŐZÉSEK TÁBLA
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  opponent TEXT NOT NULL,
  match_type TEXT CHECK (match_type IN ('friendly', 'league', 'cup', 'tournament')),
  home_away TEXT CHECK (home_away IN ('home', 'away')),
  our_score INTEGER,
  opponent_score INTEGER,
  notes TEXT,
  lineup JSONB DEFAULT '[]'::jsonb,
  statistics JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_team_id ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);

-- 4. GYAKORLATOK TÁBLA
CREATE TABLE IF NOT EXISTS training_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'technique', 'tactic', 'speed', 'flexibility', 'other')),
  type TEXT NOT NULL CHECK (type IN ('gym', 'ball', 'both')),
  description TEXT,
  parameters JSONB DEFAULT '{}'::jsonb,
  video_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_training_exercises_category ON training_exercises(category);
CREATE INDEX IF NOT EXISTS idx_training_exercises_type ON training_exercises(type);

-- RLS POLICIES

-- training_templates
ALTER TABLE training_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view templates for their teams" ON training_templates;
CREATE POLICY "Users can view templates for their teams"
  ON training_templates FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can create templates for their teams" ON training_templates;
CREATE POLICY "Users can create templates for their teams"
  ON training_templates FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can update templates for their teams" ON training_templates;
CREATE POLICY "Users can update templates for their teams"
  ON training_templates FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can delete templates for their teams" ON training_templates;
CREATE POLICY "Users can delete templates for their teams"
  ON training_templates FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

-- training_sessions
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sessions for their teams" ON training_sessions;
CREATE POLICY "Users can view sessions for their teams"
  ON training_sessions FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can create sessions for their teams" ON training_sessions;
CREATE POLICY "Users can create sessions for their teams"
  ON training_sessions FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can update sessions for their teams" ON training_sessions;
CREATE POLICY "Users can update sessions for their teams"
  ON training_sessions FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can delete sessions for their teams" ON training_sessions;
CREATE POLICY "Users can delete sessions for their teams"
  ON training_sessions FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

-- matches
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view matches for their teams" ON matches;
CREATE POLICY "Users can view matches for their teams"
  ON matches FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can create matches for their teams" ON matches;
CREATE POLICY "Users can create matches for their teams"
  ON matches FOR INSERT
  WITH CHECK (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can update matches for their teams" ON matches;
CREATE POLICY "Users can update matches for their teams"
  ON matches FOR UPDATE
  USING (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can delete matches for their teams" ON matches;
CREATE POLICY "Users can delete matches for their teams"
  ON matches FOR DELETE
  USING (team_id IN (SELECT id FROM teams WHERE created_by = auth.uid()));

-- training_exercises (public read, authenticated create)
ALTER TABLE training_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view exercises" ON training_exercises;
CREATE POLICY "Anyone can view exercises"
  ON training_exercises FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create exercises" ON training_exercises;
CREATE POLICY "Authenticated users can create exercises"
  ON training_exercises FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their exercises" ON training_exercises;
CREATE POLICY "Users can update their exercises"
  ON training_exercises FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their exercises" ON training_exercises;
CREATE POLICY "Users can delete their exercises"
  ON training_exercises FOR DELETE
  USING (created_by = auth.uid());

-- TRIGGERS FOR updated_at

CREATE OR REPLACE FUNCTION update_training_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_training_templates_updated_at ON training_templates;
CREATE TRIGGER update_training_templates_updated_at
  BEFORE UPDATE ON training_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_training_templates_updated_at();

CREATE OR REPLACE FUNCTION update_training_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_training_sessions_updated_at ON training_sessions;
CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON training_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_training_sessions_updated_at();

CREATE OR REPLACE FUNCTION update_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_matches_updated_at();

-- ELLENŐRZÉS
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('training_templates', 'training_sessions', 'matches', 'training_exercises')
ORDER BY table_name, ordinal_position;
