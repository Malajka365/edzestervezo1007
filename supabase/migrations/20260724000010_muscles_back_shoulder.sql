-- ================================================================
-- 20260724_000010_muscles_back_shoulder
-- A muscles szótár bővítése a hát + váll részletes rétegéhez.
-- Idempotens (on conflict do update). A hát/váll seedek erre építenek.
-- ================================================================
insert into public.muscles(code,name_latin,name_hu,name_en,muscle_group) values
  -- Hát
  ('rhomboids','Musculi rhomboidei','Rombuszizmok','Rhomboids','hat'),
  ('trap_mid','Trapezius (pars transversa)','Csuklyásizom – középső rész','Middle trapezius','hat'),
  ('trap_inf','Trapezius (pars ascendens)','Csuklyásizom – alsó rész','Lower trapezius','hat'),
  ('erector_spinae','Erector spinae','Gerincfeszítő izom','Erector spinae','hat'),
  -- Váll (deltoid hátsó feje + rotátorköpeny)
  ('deltoid_post','Deltoideus (pars spinalis)','Hátsó deltaizom','Posterior deltoid','vall'),
  ('supraspinatus','Supraspinatus','Tövis feletti izom','Supraspinatus','vall'),
  ('infraspinatus','Infraspinatus','Tövis alatti izom','Infraspinatus','vall'),
  ('teres_minor','Teres minor','Kis görgetegizom','Teres minor','vall'),
  ('subscapularis','Subscapularis','Lapocka alatti izom','Subscapularis','vall'),
  -- Kar / alkar (húzások segéd- és fogásizmai)
  ('brachialis','Brachialis','Karizom (belső)','Brachialis','bicepsz'),
  ('brachioradialis','Brachioradialis','Singcsonti karizom','Brachioradialis','alkar'),
  ('flexores_carpi','Musculi flexores carpi','Csuklóhajlító izmok','Wrist flexors','alkar')
on conflict(code) do update set
  name_latin=excluded.name_latin, name_hu=excluded.name_hu,
  name_en=excluded.name_en, muscle_group=excluded.muscle_group;
