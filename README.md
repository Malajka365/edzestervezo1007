# TeamFlow - Csapatsport Edzés Menedzsment

Webalkalmazás csapatsportok edzői (vezetőedző, erőnléti edző, gyógytornász) számára.

## Technológiai Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Supabase (PostgreSQL + Authentication)
- **Icons**: Lucide React
- **Routing**: React Router

## Modulok

- 🏠 Dashboard
- 👥 Csapatok & Játékosok
- 📅 Edzéstervek
- 📊 Mérési modul
- 🩹 Rehabilitációs modul

## Telepítés

1. Másold le a `.env.example` fájlt `.env` névre
2. Töltsd ki a Supabase credentials-t
3. Telepítsd a függőségeket:
```bash
npm install
```

4. Indítsd el a development szervert:
```bash
npm run dev
```

## Supabase Beállítás

1. Hozz létre egy Supabase projektet a [supabase.com](https://supabase.com)-on
2. Másold ki a Project URL-t és az anon public key-t
3. Add hozzá őket a `.env` fájlhoz
