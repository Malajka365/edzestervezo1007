-- Migration: Add macrocycle integration to matches table
-- Created: 2025-01-17
-- Purpose: Enable automatic match creation from macrocycle planner

-- 1. Add new columns to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES training_seasons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS created_from_macrocycle BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS macrocycle_week_index INTEGER,
ADD COLUMN IF NOT EXISTS macrocycle_day_index INTEGER;

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_season_id ON matches(season_id);
CREATE INDEX IF NOT EXISTS idx_matches_macrocycle 
  ON matches(season_id, macrocycle_week_index, macrocycle_day_index)
  WHERE created_from_macrocycle = TRUE;

-- 3. Create unique constraint: one match per season per date
-- This prevents duplicate matches on the same day within a season
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_unique_season_date 
  ON matches(season_id, date) 
  WHERE season_id IS NOT NULL AND created_from_macrocycle = TRUE;

-- 4. Add comment for documentation
COMMENT ON COLUMN matches.season_id IS 'Reference to training_seasons table - links match to a specific season';
COMMENT ON COLUMN matches.created_from_macrocycle IS 'TRUE if match was automatically created from macrocycle planner';
COMMENT ON COLUMN matches.macrocycle_week_index IS 'Week index (0-51) in macrocycle planner';
COMMENT ON COLUMN matches.macrocycle_day_index IS 'Day index (0-6, Monday-Sunday) in macrocycle planner';

-- 5. RLS policies remain unchanged as they are based on team_id
-- Existing policies will continue to work correctly
