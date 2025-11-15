-- Jelenlét tábla bővítése időpont mezővel
-- Futtasd le a Supabase SQL Editor-ban

-- event_time mező hozzáadása (TIME típus)
ALTER TABLE player_attendance
ADD COLUMN IF NOT EXISTS event_time TIME;

-- Megjegyzés: Az event_time mező opcionális, NULL értéket is elfogad
-- Formátum: HH:MM:SS (pl. 14:30:00)
