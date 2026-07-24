-- ================================================================
-- 20260724_000016_muscles_lower_core
-- A muscles szótár bővítése a core + alsótest + vádli részletes rétegéhez.
-- Idempotens. A core/leg/calf seedek erre építenek.
-- ================================================================
insert into public.muscles(code,name_latin,name_hu,name_en,muscle_group) values
  -- Core
  ('obliquus_externus','Obliquus externus abdominis','Külső ferde hasizom','External oblique','core'),
  ('obliquus_internus','Obliquus internus abdominis','Belső ferde hasizom','Internal oblique','core'),
  ('transversus_abdominis','Transversus abdominis','Haránt hasizom','Transverse abdominis','core'),
  ('quadratus_lumborum','Quadratus lumborum','Négyszögletű ágyékizom','Quadratus lumborum','core'),
  ('iliopsoas','Iliopsoas','Csípőhorpaszizom','Iliopsoas','csipo'),
  -- Farizom
  ('gluteus_maximus','Gluteus maximus','Nagy farizom','Gluteus maximus','farizom'),
  ('gluteus_medius','Gluteus medius','Középső farizom','Gluteus medius','farizom'),
  ('gluteus_minimus','Gluteus minimus','Kis farizom','Gluteus minimus','farizom'),
  -- Négyfejű comb
  ('rectus_femoris','Rectus femoris','Egyenes combizom','Rectus femoris','quad'),
  ('vastus_lateralis','Vastus lateralis','Külső combizom','Vastus lateralis','quad'),
  ('vastus_medialis','Vastus medialis','Belső combizom','Vastus medialis','quad'),
  ('vastus_intermedius','Vastus intermedius','Középső combizom','Vastus intermedius','quad'),
  -- Combhajlító
  ('biceps_femoris','Biceps femoris','Kétfejű combizom','Biceps femoris','combhajlito'),
  ('semitendinosus','Semitendinosus','Félig ínas izom','Semitendinosus','combhajlito'),
  ('semimembranosus','Semimembranosus','Félig hártyás izom','Semimembranosus','combhajlito'),
  -- Csípő (közelítők + pólyafeszítő)
  ('adductor_magnus','Adductor magnus','Nagy közelítő izom','Adductor magnus','csipo'),
  ('adductor_longus','Adductor longus','Hosszú közelítő izom','Adductor longus','csipo'),
  ('tensor_fasciae_latae','Tensor fasciae latae','Combpólyafeszítő izom','Tensor fasciae latae','csipo'),
  -- Vádli
  ('gastrocnemius','Gastrocnemius','Ikerizom','Gastrocnemius','vadli'),
  ('soleus','Soleus','Lábikraizom','Soleus','vadli')
on conflict(code) do update set
  name_latin=excluded.name_latin, name_hu=excluded.name_hu,
  name_en=excluded.name_en, muscle_group=excluded.muscle_group;
