# Supabase Projekt Beállítása

## 1. Supabase Projekt Létrehozása

1. Látogass el a [supabase.com](https://supabase.com) oldalra
2. Jelentkezz be vagy regisztrálj
3. Kattints a "New Project" gombra
4. Töltsd ki a projekt adatokat:
   - **Name**: TeamFlow
   - **Database Password**: Válassz egy biztonságos jelszót (mentsd el!)
   - **Region**: Válaszd a hozzád legközelebbi régiót (pl. Europe)
   - **Pricing Plan**: Free tier (kezdéshez elég)

5. Kattints a "Create new project" gombra
6. Várj 1-2 percet, amíg a projekt felépül

## 2. API Kulcsok Megszerzése

1. A projekt dashboardon menj a **Settings** (bal oldali menü alul)
2. Kattints az **API** fülre
3. Másold ki a következő értékeket:
   - **Project URL** (pl. `https://xxxxx.supabase.co`)
   - **anon public** kulcs (hosszú string)

## 3. .env Fájl Beállítása

1. A projekt gyökérkönyvtárában hozz létre egy `.env` fájlt
2. Másold bele az alábbi tartalmat és töltsd ki a saját értékeiddel:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**FONTOS**: A `.env` fájl már szerepel a `.gitignore`-ban, így nem kerül fel GitHub-ra!

## 4. Email Autentikáció Beállítása (Opcionális)

Alapértelmezetten a Supabase a saját email szolgáltatását használja, ami:
- Óránként max 4 email küldési limit
- Csak tesztelésre ajánlott

**Éles használatra**:
1. Menj a **Authentication > Email Templates**
2. Testreszabhatod az email sablonokat
3. Vagy kapcsolj be saját SMTP szolgáltatást (**Settings > Auth**)

## 5. Adatbázis Schema (Későbbi Használatra)

A TeamFlow alkalmazáshoz később szükséged lesz a következő táblákra:

```sql
-- Profilok tábla (automatikusan létrejön user regisztrációkor)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  full_name text,
  role text check (role in ('coach', 'fitness_coach', 'physiotherapist')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Csapatok
create table teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  sport text,
  created_by uuid references profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Játékosok
create table players (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references teams(id) on delete cascade,
  name text not null,
  birth_date date,
  position text,
  jersey_number integer,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

Ezeket később a Supabase SQL Editor-ban futtathatod (**Database > SQL Editor**).

## 6. Row Level Security (RLS)

A biztonság érdekében minden táblán engedélyezd a RLS-t és állíts be policy-kat:

```sql
-- Profiles RLS
alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);
```

## 7. Alkalmazás Indítása

Miután a `.env` fájl készen van:

```bash
npm run dev
```

Az alkalmazás elérhető lesz a `http://localhost:5173` címen.

## Hibaelhárítás

### "Missing Supabase environment variables"
- Ellenőrizd, hogy létrehoztad-e a `.env` fájlt
- A változók nevei `VITE_` előtaggal kezdődnek
- Újraindítottad-e a dev szervert a `.env` létrehozása után

### Email nem érkezik meg regisztráció után
- Ellenőrizd a spam mappát
- A Supabase Free tier-ben korlátozott az email küldés
- Látogass el a **Authentication > Users** oldalra és manuálisan erősítsd meg a usert

### "Invalid login credentials"
- Győződj meg róla, hogy az email megerősítve lett
- Ellenőrizd a helyes email/jelszó kombinációt
- Próbálj új usert regisztrálni
