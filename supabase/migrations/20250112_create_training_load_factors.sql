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
