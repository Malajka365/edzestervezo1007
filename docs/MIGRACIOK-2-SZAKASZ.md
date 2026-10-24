# Adatbázis-migrációk: 2. szakasz (Napi munka)

Az app 2. szakaszos verziója csak akkor működik helyesen, ha ez a három
migráció **a deploy előtt** lefutott az éles Supabase projekten.

## Futtatás

Supabase Dashboard → a projekt → **SQL Editor**. Mindhárom fájl tartalmát
másold be és futtasd, **ebben a sorrendben**:

1. `supabase/migrations/20261024000001_attendance_module.sql`: a Jelenlét saját jogosultsági modulja.
2. `supabase/migrations/20261024000002_attendance_session_link.sql`: jelenlét edzéshez kötése, új hozzáférési szabályok.
3. `supabase/migrations/20261024000003_player_availability.sql`: az elérhetőségi napló tábla.

Mindhárom többször is lefuttatható, nem okoz kárt.

## Ellenőrzés

```sql
select module_key, count(*) from public.team_module_permissions group by 1 order by 1;
-- az 'attendance' sor darabszáma = csapatok száma × 3

select count(*) from public.player_availability;
-- 0 (még üres), hiba nélkül

select column_name from information_schema.columns
where table_name = 'player_attendance' and column_name = 'training_session_id';
-- 1 sor
```
