-- ================================================================
-- 20260724_000017_seed_calves — 20 vádli-gyakorlat
-- Idempotens (slug upsert). Előfeltétel: 000016 muscles-bővítés.
-- ================================================================

insert into public.training_exercises
  (slug,name,name_en,name_original,muscle_group,secondary_muscles,equipment,difficulty,type,category,modality,gif_path,source_file,source_category,catalog_note)
values
  ('seated-calf-raise-gemeos','Ülő vádli (gemeos)','Seated calf raise','Gêmeos sentado','vadli','{}','{gep}','beginner','gym','strength','erosites','vadli/seated-calf-raise-gemeos.gif','Gemeos sentado (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('dumbbell-calf-raise-pt','Vádli kézisúlyzóval','Dumbbell calf raise','Panturrilha com halteres','vadli','{}','{kezisulyzo}','beginner','gym','strength','erosites','vadli/dumbbell-calf-raise-pt.gif','Panturrilha com halteres (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('standing-calf-raise-machine','Álló vádli gépen','Standing calf raise machine','Panturrilha em pé máquina','vadli','{}','{gep}','beginner','gym','strength','erosites','vadli/standing-calf-raise-machine.gif','Panturrilha em pé máquina (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('single-leg-standing-calf-raise','Egylábas álló vádli','Single-leg standing calf raise','Panturrilha em pé unilateral','vadli','{}','{sajat_testsuly}','intermediate','gym','strength','erosites','vadli/single-leg-standing-calf-raise.gif','Panturrilha em pé unilateral (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('leg-press-calf-raise-45','Vádli lábtolón (45°)','Leg press calf raise (45°)','Panturrilha leg 45','vadli','{}','{gep}','beginner','gym','strength','erosites','vadli/leg-press-calf-raise-45.gif','Panturrilha leg 45 (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('horizontal-leg-press-calf-raise','Vádli vízszintes lábtolón','Horizontal leg press calf raise','Panturrilha leg press horizontal','vadli','{}','{gep}','beginner','gym','strength','erosites','vadli/horizontal-leg-press-calf-raise.gif','Panturrilha leg press horizontal (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('calf-raise-machine-2','Vádli gépen (változat)','Calf raise machine (var.)','Panturrilha máquina 02','vadli','{}','{gep}','beginner','gym','strength','erosites','vadli/calf-raise-machine-2.gif','Panturrilha maquina 02 (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('soleus-raise','Soleus emelés','Soleus raise','Sóleo 01','vadli','{}','{gep}','beginner','gym','strength','erosites','vadli/soleus-raise.gif','Sóleo 01 (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('cable-standing-calf-raise','Álló vádli kábelen','Cable standing calf raise','Cable standing calf raise','vadli','{}','{kabel}','intermediate','gym','strength','erosites','vadli/cable-standing-calf-raise.gif','cable-standing-calf-raise (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('calf-squats','Vádli guggolásból','Calf squats','Calf squats','vadli','{}','{sajat_testsuly}','beginner','gym','strength','erosites','vadli/calf-squats.gif','calf-squats (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('donkey-calf-raise','Szamár vádliemelés','Donkey calf raise','Donkey calf raise','vadli','{}','{gep}','intermediate','gym','strength','erosites','vadli/donkey-calf-raise.gif','donkey-calf-raise (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('dumbbell-calf-raise','Vádli kézisúlyzóval','Dumbbell calf raise','Dumbbell calf raise','vadli','{}','{kezisulyzo}','beginner','gym','strength','erosites','vadli/dumbbell-calf-raise.gif','dumbbell-calf-raise (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('leg-press-calf-raise','Vádli lábtolón','Leg press calf raise','Leg press calf raise','vadli','{}','{gep}','beginner','gym','strength','erosites','vadli/leg-press-calf-raise.gif','leg-press-calf-raise (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('negative-calf-raise','Excentrikus vádliemelés','Negative calf raise','Negative calf raise','vadli','{}','{sajat_testsuly}','intermediate','gym','strength','erosites','vadli/negative-calf-raise.gif','negative-calf-raise (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('seated-calf-raise','Ülő vádliemelés','Seated calf raise','Seated calf raise','vadli','{}','{gep}','beginner','gym','strength','erosites','vadli/seated-calf-raise.gif','seated-calf-raise (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('seated-dumbbell-calf-raise','Ülő vádli kézisúlyzóval','Seated dumbbell calf raise','Seated dumbbell calf raise','vadli','{}','{kezisulyzo}','beginner','gym','strength','erosites','vadli/seated-dumbbell-calf-raise.gif','seated-calf-raise-dumbbell (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('single-leg-calf-raise','Egylábas vádliemelés','Single-leg calf raise','Single-leg calf raise','vadli','{}','{sajat_testsuly}','intermediate','gym','strength','erosites','vadli/single-leg-calf-raise.gif','single-leg-calf-raise (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('smith-machine-calf-raise','Vádli Smith-gépen','Smith machine calf raise','Smith machine calf raise','vadli','{}','{smith}','beginner','gym','strength','erosites','vadli/smith-machine-calf-raise.gif','smith-machine-calf-raise (1).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('standing-calf-raise','Álló vádliemelés','Standing calf raise','Standing calf raise','vadli','{}','{sajat_testsuly}','beginner','gym','strength','erosites','vadli/standing-calf-raise.gif','standing-calf-raise (2).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null),
  ('standing-calf-raise-var-2','Álló vádliemelés (változat)','Standing calf raise (var.)','Standing calf raise','vadli','{}','{sajat_testsuly}','beginner','gym','strength','erosites','vadli/standing-calf-raise-var-2.gif','standing-calf-raise (3).gif','5° GIFs DE MUSCULACIÓN / PANTORRILLA',null)
on conflict (slug) do update set
  name=excluded.name, name_en=excluded.name_en, name_original=excluded.name_original,
  muscle_group=excluded.muscle_group, secondary_muscles=excluded.secondary_muscles,
  equipment=excluded.equipment, difficulty=excluded.difficulty, modality=excluded.modality,
  gif_path=excluded.gif_path, source_file=excluded.source_file, catalog_note=excluded.catalog_note;

insert into public.exercise_muscles(exercise_id,muscle_code,role)
select e.id, v.muscle_code, v.role::muscle_role
from (values
  ('seated-calf-raise-gemeos','soleus','primary'),
  ('seated-calf-raise-gemeos','gastrocnemius','secondary'),
  ('dumbbell-calf-raise-pt','gastrocnemius','primary'),
  ('dumbbell-calf-raise-pt','soleus','secondary'),
  ('standing-calf-raise-machine','gastrocnemius','primary'),
  ('standing-calf-raise-machine','soleus','secondary'),
  ('single-leg-standing-calf-raise','gastrocnemius','primary'),
  ('single-leg-standing-calf-raise','soleus','secondary'),
  ('leg-press-calf-raise-45','gastrocnemius','primary'),
  ('leg-press-calf-raise-45','soleus','secondary'),
  ('horizontal-leg-press-calf-raise','gastrocnemius','primary'),
  ('horizontal-leg-press-calf-raise','soleus','secondary'),
  ('calf-raise-machine-2','gastrocnemius','primary'),
  ('calf-raise-machine-2','soleus','secondary'),
  ('soleus-raise','soleus','primary'),
  ('soleus-raise','gastrocnemius','secondary'),
  ('cable-standing-calf-raise','gastrocnemius','primary'),
  ('cable-standing-calf-raise','soleus','secondary'),
  ('calf-squats','gastrocnemius','primary'),
  ('calf-squats','soleus','secondary'),
  ('donkey-calf-raise','gastrocnemius','primary'),
  ('donkey-calf-raise','soleus','secondary'),
  ('dumbbell-calf-raise','gastrocnemius','primary'),
  ('dumbbell-calf-raise','soleus','secondary'),
  ('leg-press-calf-raise','gastrocnemius','primary'),
  ('leg-press-calf-raise','soleus','secondary'),
  ('negative-calf-raise','gastrocnemius','primary'),
  ('negative-calf-raise','soleus','secondary'),
  ('seated-calf-raise','soleus','primary'),
  ('seated-calf-raise','gastrocnemius','secondary'),
  ('seated-dumbbell-calf-raise','soleus','primary'),
  ('seated-dumbbell-calf-raise','gastrocnemius','secondary'),
  ('single-leg-calf-raise','gastrocnemius','primary'),
  ('single-leg-calf-raise','soleus','secondary'),
  ('smith-machine-calf-raise','gastrocnemius','primary'),
  ('smith-machine-calf-raise','soleus','secondary'),
  ('standing-calf-raise','gastrocnemius','primary'),
  ('standing-calf-raise','soleus','secondary'),
  ('standing-calf-raise-var-2','gastrocnemius','primary'),
  ('standing-calf-raise-var-2','soleus','secondary')
) as v(exercise_slug,muscle_code,role)
join public.training_exercises e on e.slug = v.exercise_slug
on conflict do nothing;
