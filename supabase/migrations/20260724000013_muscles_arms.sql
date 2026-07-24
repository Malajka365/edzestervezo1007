-- ================================================================
-- 20260724_000013_muscles_arms
-- A muscles szótár bővítése a tricepsz + alkar részletes rétegéhez.
-- Idempotens. A kar-seedek (triceps, biceps/alkar) erre építenek.
-- ================================================================
insert into public.muscles(code,name_latin,name_hu,name_en,muscle_group) values
  ('anconeus','Anconeus','Könyökizom','Anconeus','tricepsz'),
  ('extensores_carpi','Musculi extensores carpi','Csuklófeszítő izmok','Wrist extensors','alkar')
on conflict(code) do update set
  name_latin=excluded.name_latin, name_hu=excluded.name_hu,
  name_en=excluded.name_en, muscle_group=excluded.muscle_group;
