-- ================================================================
-- 20260724_000003_exercise_gifs_storage_bucket
-- Publikus 'exercise-gifs' bucket a GIF-eknek + hozzáférési szabályok.
-- ================================================================
insert into storage.buckets (id, name, public)
values ('exercise-gifs','exercise-gifs', true)
on conflict (id) do nothing;

-- Publikus olvasás
do $$ begin
  create policy "public read exercise gifs"
    on storage.objects for select
    using (bucket_id = 'exercise-gifs');
exception when duplicate_object then null; end $$;

-- Feltöltés/módosítás csak hitelesített felhasználónak
do $$ begin
  create policy "authenticated manage exercise gifs"
    on storage.objects for all
    to authenticated
    using (bucket_id = 'exercise-gifs')
    with check (bucket_id = 'exercise-gifs');
exception when duplicate_object then null; end $$;
