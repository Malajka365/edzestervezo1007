-- Amnézis tábla bővítése a kérdőívnek megfelelően
-- Futtasd le a Supabase SQL Editor-ban

-- Previous Hx - Első epizód oka
ALTER TABLE player_anamnesis
ADD COLUMN IF NOT EXISTS first_episode_cause TEXT;

-- Present Hx - Jelenlegi probléma oka
ALTER TABLE player_anamnesis
ADD COLUMN IF NOT EXISTS current_cause TEXT;

-- Present Hx - Jelenlegi kezelések és hatásuk
ALTER TABLE player_anamnesis
ADD COLUMN IF NOT EXISTS current_treatments TEXT;

-- Megjegyzés: A többi mező (first_episode_year, episode_frequency, episode_duration, previous_treatments) 
-- már létezik a player_anamnesis táblában
