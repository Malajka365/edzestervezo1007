# 🚀 Vercel Deployment - Pontos Lépések

## Opció 1: Dashboard-ról (Ajánlott)

### 1. Nyisd meg a Vercel Dashboard-ot
```
https://vercel.com/dashboard
```

### 2. Új Projekt Importálása

1. Kattints: **"Add New..."** → **"Project"**
2. Válaszd ki: **"Import Git Repository"**
3. Keresd meg: **"Malajka365/edzestervezo1007"**
4. Kattints: **"Import"**

### 3. Projekt Beállítások

**Framework Preset:** Vite (automatikusan felismeri)

**Root Directory:** `./` (alapértelmezett)

**Build Command:** 
```
npm run build
```

**Output Directory:**
```
dist
```

**Install Command:**
```
npm install
```

### 4. Environment Variables (FONTOS!)

Kattints: **"Environment Variables"**

Add hozzá ezeket (mindhárom környezethez: Production, Preview, Development):

```
VITE_SUPABASE_URL
https://mvsppkrpcafrutrhitvk.supabase.co

VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12c3Bwa3JwY2FmcnV0cmhpdHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDA1NjQsImV4cCI6MjA3NTQxNjU2NH0.O76Jwak8vWeWByd2srtAbmF_m4YqtO-_9NqwebC2fTk
```

### 5. Deploy

Kattints: **"Deploy"**

Várj 1-2 percet, amíg a build lefut.

---

## Opció 2: CLI-ből (Haladó)

### 1. Bejelentkezés

Nyisd meg a terminált a projekt mappában és futtasd:

```bash
vercel login
```

Kövesd az utasításokat a böngészőben.

### 2. Link a Projekthez

```bash
vercel link
```

Válaszolj a kérdésekre:
- Set up and deploy? **Y**
- Which scope? Válaszd a saját account-odat
- Link to existing project? **N** (ha új) vagy **Y** (ha már létezik)
- Project name? **edzestervezo1007**

### 3. Environment Variables Beállítása

```bash
vercel env add VITE_SUPABASE_URL production
```
Másold be: `https://mvsppkrpcafrutrhitvk.supabase.co`

```bash
vercel env add VITE_SUPABASE_ANON_KEY production
```
Másold be a ANON_KEY-t

### 4. Deploy Production-ra

```bash
vercel --prod
```

---

## ✅ Ellenőrzés

### Build Log Ellenőrzése

A Vercel Dashboard-on:
1. Menj a projektre
2. Kattints a legutóbbi deployment-re
3. Nézd meg a **"Building"** log-ot
4. Ellenőrizd, hogy nincs-e hiba

### Sikeres Deployment Jelei

- ✅ Status: **"Ready"**
- ✅ Zöld pipa ikon
- ✅ URL kattintható és működik

### URL Elérése

Az alkalmazás elérhető lesz:
```
https://edzestervezo1007.vercel.app
```

Vagy egy egyedi domain-en, amit a Vercel generált.

---

## 🔄 Jövőbeli Frissítések

Ezután minden alkalommal, amikor pusholsz GitHub-ra:

```bash
git add .
git commit -m "Update message"
git push origin master
```

A Vercel automatikusan újra deployol!

---

## 🐛 Hibaelhárítás

### "Build Failed" Hiba

1. Ellenőrizd a build log-ot
2. Futtasd lokálisan: `npm run build`
3. Javítsd a hibákat
4. Commitold és pusheld újra

### Environment Variables Hiányoznak

1. Vercel Dashboard → Projekt → Settings → Environment Variables
2. Add hozzá a hiányzó változókat
3. Redeploy: Deployments → ... → Redeploy

### 404 Error Page Refresh-nél

Ellenőrizd, hogy a `vercel.json` tartalmazza:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 📞 Segítség

Ha elakadtál:
1. Nézd meg a Vercel dokumentációt: https://vercel.com/docs
2. Ellenőrizd a build log-okat
3. Nézd meg a browser console-t (F12)

Sikeres deployment-et! 🎉
