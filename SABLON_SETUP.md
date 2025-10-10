# 📋 Makrociklus Sablonok Beállítása

## 🎯 Mi ez?

Ez az útmutató segít beállítani a makrociklus sablonok funkcióját az adatbázisban.

## ⚠️ Probléma

Ha ezt a hibát látod a konzolon:
```
Failed to load resource: the server responded with a status of 404
Error fetching templates: Object
```

Ez azt jelenti, hogy a `macrocycle_templates` tábla még nem létezik az adatbázisban.

## ✅ Megoldás - Lépésről Lépésre

### 1. Nyisd meg a Supabase Dashboard-ot

1. Menj a böngészőben: **https://supabase.com/dashboard**
2. Jelentkezz be
3. Válaszd ki a **TeamFlow** projektet

### 2. Nyisd meg az SQL Editor-t

1. A bal oldali menüben kattints a **"SQL Editor"** menüpontra
2. Kattints a **"New query"** gombra

### 3. Másold be az SQL script-et

1. Nyisd meg a **`SETUP_TEMPLATES.sql`** fájlt ebből a mappából
2. Másold ki a **teljes tartalmát** (Ctrl+A, majd Ctrl+C)
3. Illeszd be az SQL Editor-ba (Ctrl+V)

### 4. Futtasd le a script-et

1. Kattints a **"Run"** gombra (vagy nyomd meg a Ctrl+Enter-t)
2. Várd meg, amíg lefut (pár másodperc)
3. Ha sikeres, látnod kell egy táblázatot az oszlopokkal

### 5. Ellenőrzés

Ha minden jól ment, látnod kell ezt az outputot:

```
table_name              | column_name    | data_type
------------------------|----------------|---------------------------
macrocycle_templates    | id             | uuid
macrocycle_templates    | name           | text
macrocycle_templates    | team_id        | uuid
macrocycle_templates    | planning       | jsonb
macrocycle_templates    | mesocycles     | jsonb
macrocycle_templates    | week_count     | integer
macrocycle_templates    | created_at     | timestamp with time zone
macrocycle_templates    | updated_at     | timestamp with time zone
```

### 6. Frissítsd az alkalmazást

1. Menj vissza az alkalmazáshoz
2. Frissítsd az oldalt (F5 vagy Ctrl+R)
3. Most már működnie kell a sablon funkciónak! ✅

## 🎉 Használat

Most már használhatod a sablon funkciókat:

### Sablon Mentése
1. Tervezd meg a makrociklust
2. Kattints a **"Sablon"** gombra (lila)
3. Adj meg egy nevet
4. Kattints **"Mentés"**

### Sablon Betöltése
1. Válassz egy szezont
2. Kattints a **"Betöltés"** gombra (indigo)
3. Válassz egy sablont
4. Kattints **"Betöltés"**

### PDF Export
1. Nyisd meg a szezont
2. Kattints a **"PDF"** gombra (narancs)
3. A PDF automatikusan letöltődik

## 🔧 Hibaelhárítás

### "Permission denied" hiba

Ha ezt a hibát látod, ellenőrizd:
1. Be vagy-e jelentkezve a Supabase-be
2. Van-e jogosultságod a projekt módosításához

### "Relation already exists" hiba

Ez nem probléma! Azt jelenti, hogy a tábla már létezik. Csak frissítsd az alkalmazást.

### Továbbra sem működik

1. Ellenőrizd, hogy a script tényleg lefutott-e
2. Nézd meg a Supabase Dashboard "Table Editor" menüpontjában, hogy látod-e a `macrocycle_templates` táblát
3. Ha nem látod, próbáld újra futtatni a script-et

## 📞 Segítség

Ha továbbra is problémád van:
1. Nézd meg a böngésző konzolt (F12)
2. Másold ki a hibaüzenetet
3. Keresd meg a fejlesztőt

## ✨ Kész!

Most már teljes körűen használhatod a makrociklus tervező sablon funkcióit! 🎯
