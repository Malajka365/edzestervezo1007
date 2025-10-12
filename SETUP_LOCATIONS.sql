-- Training Locations Table
-- Stores training locations for each team

CREATE TABLE IF NOT EXISTS training_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_training_locations_team_id ON training_locations(team_id);

-- RLS Policies
ALTER TABLE training_locations ENABLE ROW LEVEL SECURITY;

-- Users can view locations for teams they belong to
CREATE POLICY "Users can view training locations for their teams"
  ON training_locations FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Users can insert locations for teams they belong to
CREATE POLICY "Users can insert training locations for their teams"
  ON training_locations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Users can update locations for teams they belong to
CREATE POLICY "Users can update training locations for their teams"
  ON training_locations FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Users can delete locations for teams they belong to
CREATE POLICY "Users can delete training locations for their teams"
  ON training_locations FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_training_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_training_locations_updated_at
  BEFORE UPDATE ON training_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_training_locations_updated_at();

-- Insert some default locations (optional)
-- You can customize these or remove this section
INSERT INTO training_locations (team_id, name, is_default)
SELECT id, 'Sportcsarnok', true FROM teams
ON CONFLICT DO NOTHING;
