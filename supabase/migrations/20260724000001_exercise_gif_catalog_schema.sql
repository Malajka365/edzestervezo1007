-- ================================================================
-- 20260724_000001_exercise_gif_catalog_schema
-- A GIF-katalógushoz: training_exercises bővítése + részletes izom-modell.
-- Additív és idempotens; a meglévő appot nem töri.
-- ================================================================

-- muscle_role enum
do $$ begin create type muscle_role as enum ('primary','secondary','stabilizer');
exception when duplicate_object then null; end $$;

-- Szótár: 12 fő izomcsoport (a coarse szűréshez)
create table if not exists public.muscle_groups (
  code text primary key, name_hu text not null, name_en text not null, sort int default 0);

-- Szótár: konkrét izmok latin névvel
create table if not exists public.muscles (
  code text primary key,
  name_latin text not null,
  name_hu text not null,
  name_en text not null,
  muscle_group text not null references public.muscle_groups(code));

-- Szótár: eszközök
create table if not exists public.equipment_types (
  code text primary key, name_hu text not null, name_en text not null);

-- training_exercises bővítése (csak ha még nincs meg az oszlop)
alter table public.training_exercises
  add column if not exists slug            text,
  add column if not exists name_en         text,
  add column if not exists name_original   text,
  add column if not exists modality        text,   -- edzesmodalitas: erosites/kalisztenika/funkcionalis_hiit/nyujtas_mobilitas
  add column if not exists gif_path         text,   -- a Storage bucketen belüli útvonal (pl. mell/bench-press.gif)
  add column if not exists source_file      text,
  add column if not exists source_category  text,
  add column if not exists catalog_note     text;

-- slug egyediség (upsert kulcs a seedekhez). NEM parciális: az `on conflict (slug)`
-- csak teljes indexet fogad el arbiterként. A NULL slugú legacy sorok megmaradnak,
-- mert a unique index a NULL-okat külön kezeli (több NULL megengedett).
create unique index if not exists training_exercises_slug_key
  on public.training_exercises(slug);

-- Kapcsolótábla: gyakorlat <-> konkrét izom, szereppel
create table if not exists public.exercise_muscles (
  exercise_id uuid not null references public.training_exercises(id) on delete cascade,
  muscle_code text not null references public.muscles(code),
  role muscle_role not null,
  primary key (exercise_id, muscle_code));

create index if not exists exercise_muscles_muscle_idx on public.exercise_muscles(muscle_code);
create index if not exists exercise_muscles_role_idx   on public.exercise_muscles(role);
create index if not exists training_exercises_modality_idx on public.training_exercises(modality);

-- RLS a szótár- és kapcsolótáblákra: mindenki olvashat, írni csak hitelesített
alter table public.muscle_groups   enable row level security;
alter table public.muscles         enable row level security;
alter table public.equipment_types enable row level security;
alter table public.exercise_muscles enable row level security;

do $$ begin
  create policy "read muscle_groups" on public.muscle_groups for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "read muscles" on public.muscles for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "read equipment_types" on public.equipment_types for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "read exercise_muscles" on public.exercise_muscles for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "write exercise_muscles" on public.exercise_muscles for all
    to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Szótárak feltöltése -------------------------------------------------
insert into public.muscle_groups(code,name_hu,name_en,sort) values
  ('mell','Mell','Chest',0),
  ('hat','Hát','Back',1),
  ('vall','Váll','Shoulders',2),
  ('bicepsz','Bicepsz','Biceps',3),
  ('tricepsz','Tricepsz','Triceps',4),
  ('alkar','Alkar','Forearms',5),
  ('quad','Négyfejű comb','Quadriceps',6),
  ('combhajlito','Combhajlító','Hamstrings',7),
  ('farizom','Farizom','Glutes',8),
  ('vadli','Vádli','Calves',9),
  ('core','Has / core','Abs / core',10),
  ('csipo','Csípő','Hips',11)
on conflict(code) do update set name_hu=excluded.name_hu,name_en=excluded.name_en,sort=excluded.sort;

insert into public.muscles(code,name_latin,name_hu,name_en,muscle_group) values
  ('pect_maj_clav','Pectoralis major (pars clavicularis)','Nagy mellizom – felső, kulcscsonti rész','Pectoralis major, clavicular head','mell'),
  ('pect_maj_stern','Pectoralis major (pars sternocostalis)','Nagy mellizom – közép/alsó, szegycsonti rész','Pectoralis major, sternocostal head','mell'),
  ('pect_minor','Pectoralis minor','Kis mellizom','Pectoralis minor','mell'),
  ('deltoid_ant','Deltoideus (pars clavicularis)','Elülső deltaizom','Anterior deltoid','vall'),
  ('deltoid_lat','Deltoideus (pars acromialis)','Középső deltaizom','Lateral deltoid','vall'),
  ('triceps','Triceps brachii','Háromfejű karizom','Triceps brachii','tricepsz'),
  ('biceps','Biceps brachii','Kétfejű karizom','Biceps brachii','bicepsz'),
  ('serratus_ant','Serratus anterior','Elülső fűrészizom','Serratus anterior','hat'),
  ('lat_dorsi','Latissimus dorsi','Széles hátizom','Latissimus dorsi','hat'),
  ('teres_major','Teres major','Nagy görgetegizom','Teres major','hat'),
  ('trap_sup','Trapezius (pars descendens)','Csuklyásizom – felső rész','Upper trapezius','hat'),
  ('rectus_abd','Rectus abdominis','Egyenes hasizom','Rectus abdominis','core')
on conflict(code) do update set name_latin=excluded.name_latin,name_hu=excluded.name_hu,name_en=excluded.name_en,muscle_group=excluded.muscle_group;

insert into public.equipment_types(code,name_hu,name_en) values
  ('sajat_testsuly','Saját testsúly','Bodyweight'),
  ('rud','Rúd','Barbell'),
  ('kezisulyzo','Kézisúlyzó','Dumbbell'),
  ('gep','Gép','Machine'),
  ('kabel','Kábel / csiga','Cable'),
  ('smith','Smith-gép','Smith machine'),
  ('korlat','Korlát / tolódzkodó','Parallel / dip bars'),
  ('stabillabda','Stabil labda / Bosu','Stability ball / Bosu'),
  ('plusz_suly','Plusz súly','Added weight'),
  ('gumiszalag','Gumiszalag','Resistance band'),
  ('kettlebell','Kettlebell','Kettlebell'),
  ('trx','TRX','TRX / suspension'),
  ('huzodzkodo_rud','Húzódzkodó rúd','Pull-up bar'),
  ('medicinlabda','Medicinlabda','Medicine ball'),
  ('gymstick','Gymstick','Gymstick'),
  ('hengerlo','Hengerlő (SMR)','Foam roller'),
  ('egyeb','Egyéb','Other')
on conflict(code) do update set name_hu=excluded.name_hu,name_en=excluded.name_en;

-- Legacy 6-kódú muscle_group értékek átképzése a 12-es rendszerre (ha vannak régi sorok)
update public.training_exercises set muscle_group='mell' where muscle_group='chest';
update public.training_exercises set muscle_group='hat'  where muscle_group='back';
update public.training_exercises set muscle_group='vall' where muscle_group='shoulders';
update public.training_exercises set muscle_group='core' where muscle_group in ('core','abs');
-- 'arms' és 'legs' kézzel finomítandó (bicepsz/tricepsz/alkar ill. quad/combhajlito/farizom/vadli),
-- mert a régi kód nem elég specifikus; ezeket szándékosan nem képezzük át automatikusan.
