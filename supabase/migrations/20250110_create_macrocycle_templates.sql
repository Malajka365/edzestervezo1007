-- Create macrocycle_templates table
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_macrocycle_templates_team_id ON macrocycle_templates(team_id);

-- Enable RLS
ALTER TABLE macrocycle_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view templates for their teams"
  ON macrocycle_templates FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates for their teams"
  ON macrocycle_templates FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates for their teams"
  ON macrocycle_templates FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates for their teams"
  ON macrocycle_templates FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_macrocycle_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_macrocycle_templates_updated_at
  BEFORE UPDATE ON macrocycle_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_macrocycle_templates_updated_at();
