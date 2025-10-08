# TeamFlow - Deployment Útmutató

## 🚀 Vercel Deployment (Ajánlott)

### 1. Előkészületek

Győződj meg róla, hogy minden változtatás commitolva van:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Vercel Account

1. Látogass el: https://vercel.com
2. Jelentkezz be GitHub fiókkal
3. Kattints "Add New Project"

### 3. Import Repository

1. Válaszd ki a `edzestervezo1007` repository-t
2. Kattints "Import"

### 4. Környezeti Változók Beállítása

A "Environment Variables" szekcióban add hozzá:

```
VITE_SUPABASE_URL = https://mvsppkrpcafrutrhitvk.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12c3Bwa3JwY2FmcnV0cmhpdHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDA1NjQsImV4cCI6MjA3NTQxNjU2NH0.O76Jwak8vWeWByd2srtAbmF_m4YqtO-_9NqwebC2fTk
```

**Fontos:** Ezek a kulcsok mindhárom környezetben (Production, Preview, Development) kellenek!

### 5. Build Beállítások

Vercel automatikusan felismeri a Vite projektet:
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 6. Deploy

Kattints a "Deploy" gombra!

Várj 1-2 percet, amíg a build lefut.

### 7. Sikeres Deployment

Az alkalmazás elérhető lesz egy URL-en, pl.:
```
https://edzestervezo1007.vercel.app
```

---

## 🔄 Automatikus Deployment

Ezután minden push után automatikusan deployol:
- **main branch** → Production deployment
- **Más branchek** → Preview deployment

---

## 🌐 Netlify Deployment (Alternatíva)

### 1. Netlify Account

1. https://netlify.com
2. Jelentkezz be GitHub-bal

### 2. New Site from Git

1. "Add new site" → "Import an existing project"
2. Válaszd ki a GitHub repository-t

### 3. Build Settings

```
Build command: npm run build
Publish directory: dist
```

### 4. Environment Variables

```
VITE_SUPABASE_URL = https://mvsppkrpcafrutrhitvk.supabase.co
VITE_SUPABASE_ANON_KEY = [your-anon-key]
```

### 5. Deploy

Kattints "Deploy site"

---

## 🔒 Biztonság

### Supabase Row Level Security (RLS)

Győződj meg róla, hogy a Supabase táblák RLS-e be van kapcsolva:

```sql
-- players tábla
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- measurements tábla
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- teams tábla
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- exercises tábla
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
```

### RLS Policies Példa

```sql
-- Bejelentkezett felhasználók olvashatnak
CREATE POLICY "Allow authenticated read" ON players
  FOR SELECT
  TO authenticated
  USING (true);

-- Bejelentkezett felhasználók írhatnak
CREATE POLICY "Allow authenticated write" ON players
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

## 📊 Build Optimalizáció

### Vite Config Optimalizáció

Ha szükséges, optimalizálhatod a `vite.config.js` fájlt:

```javascript
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
```

---

## ✅ Ellenőrző Lista

- [ ] Git repository létrehozva és pusholva
- [ ] Vercel/Netlify account létrehozva
- [ ] Környezeti változók beállítva
- [ ] Build sikeresen lefutott
- [ ] Alkalmazás elérhető a megadott URL-en
- [ ] Bejelentkezés működik
- [ ] Supabase kapcsolat működik
- [ ] Minden funkció elérhető

---

## 🐛 Hibaelhárítás

### Build Error: "Cannot find module"

```bash
npm install
npm run build
```

### Supabase Connection Error

Ellenőrizd:
1. Környezeti változók helyesen vannak-e beállítva
2. Supabase URL és ANON_KEY érvényesek-e
3. RLS szabályok engedélyezik-e a hozzáférést

### 404 Error on Refresh

Győződj meg róla, hogy a `vercel.json` tartalmazza a rewrites szabályt.

---

## 📞 Support

Ha problémába ütközöl:
1. Nézd meg a Vercel build logokat
2. Ellenőrizd a browser console-t
3. Nézd meg a Supabase logs-ot

Sikeres deployment-et! 🚀
