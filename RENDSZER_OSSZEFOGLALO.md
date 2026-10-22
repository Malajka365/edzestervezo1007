# 🏐 TeamFlow - Kézilabda Edzéstervező Rendszer

## 📋 Teljes Áttekintés

### **Elkészült Rendszer Komponensei**

```
TeamFlow Edzéstervező Rendszer
│
├── 📅 Makrociklus Tervező
│   ├── Szezonok kezelése
│   ├── Heti struktúra tervezés
│   ├── Mezociklusok
│   └── PDF export
│
├── 🗓️ Edzésnaptár
│   ├── Havi/Heti/Napi nézetek
│   ├── Makrociklus megjelenítés
│   ├── Edzések listázása
│   └── Mérkőzések listázása
│
├── 📋 Edzéssablonok
│   ├── 🏋️ Konditermi programok
│   ├── ⚽ Labdás edzések
│   ├── 🎯 Taktika & Technika
│   └── 📝 Egyéb edzések
│
├── 🏋️ Edzések
│   ├── Edzés hozzáadása
│   ├── Sablon importálás
│   ├── Szerkesztés
│   └── Törlés
│
└── 🏆 Mérkőzések
    ├── Mérkőzés létrehozása
    ├── Eredmény rögzítése
    ├── Statisztikák
    └── Jegyzőkönyv
```

---

## 🎯 Használati Folyamat

### **1. Szezon Létrehozása**
```
Makrociklus Tervező → Új Szezon
├── Név: "2024/2025 Őszi Szezon"
├── Kezdet: 2024-09-01
└── Vége: 2025-02-28
```

### **2. Makrociklus Tervezés**
```
Heti Struktúra:
├── Hétfő: Erő
├── Kedd: Labdás edzés
├── Szerda: Regeneráció
├── Csütörtök: Taktika
├── Péntek: Állóképesség
├── Szombat: Mérkőzés
└── Vasárnap: Pihenő
```

### **3. Edzéssablonok Létrehozása**
```
Edzéssablonok → Új Sablon
├── Konditerem Sablon
│   ├── Gyakorlatok listája
│   ├── Sorozatok & Ismétlések
│   ├── Terhelés (% 1RM)
│   └── Pihenő idők
│
├── Labdás Sablon
│   ├── Keringési terhelés
│   ├── Energiarendszer
│   ├── Terhelés:Pihenés arány
│   └── Gyakorlatok
│
└── Taktika Sablon
    ├── Taktikai cél
    ├── Technikai cél
    ├── Videó URL
    └── Poszt-specifikus gyakorlatok
```

### **4. Edzések Ütemezése**
```
Naptár → Napi Nézet → Edzés Hozzáadása
├── Dátum kiválasztása
├── Sablon betöltése
├── Időpont megadása
├── Helyszín megadása
└── Mentés
```

### **5. Mérkőzések Rögzítése**
```
Mérkőzések → Új Mérkőzés
├── Dátum és időpont
├── Ellenfél
├── Helyszín
├── Hazai/Idegen
└── Eredmény (később)
```

---

## 🗄️ Adatbázis Struktúra

### **Táblák**

#### **1. training_seasons**
```sql
- id (UUID)
- team_id (UUID)
- name (TEXT)
- start_date (DATE)
- end_date (DATE)
- created_at, updated_at
```

#### **2. macrocycle_planning**
```sql
- id (UUID)
- season_id (UUID)
- team_id (UUID)
- mesocycles (JSONB)
- planning (JSONB)
  └── {weekIndex: {day_0: "Erő", day_1: "Labdás", ...}}
- created_at, updated_at
```

#### **3. training_templates**
```sql
- id (UUID)
- team_id (UUID)
- name (TEXT)
- type (gym/ball/tactic/other)
- category (TEXT)
- duration (INTEGER)
- template_data (JSONB)
  ├── Gym: {exercises: [...]}
  ├── Ball: {circulatory_load, energy_systems, drills: [...]}
  └── Tactic: {tactical_goal, technical_goal, exercises: {...}}
- created_at, updated_at
```

#### **4. training_sessions**
```sql
- id (UUID)
- team_id (UUID)
- date (DATE)
- start_time, end_time (TIME)
- location (TEXT)
- type (gym/ball/tactic/other)
- template_id (UUID, nullable)
- session_data (JSONB)
- notes (TEXT)
- attendance (JSONB)
- created_at, updated_at
```

#### **5. matches**
```sql
- id (UUID)
- team_id (UUID)
- date (DATE)
- time (TIME)
- location (TEXT)
- opponent (TEXT)
- type (friendly/league/cup/tournament)
- home_away (home/away)
- our_score, opponent_score (INTEGER)
- notes (TEXT)
- lineup, statistics (JSONB)
- created_at, updated_at
```

#### **6. macrocycle_templates**
```sql
- id (UUID)
- team_id (UUID)
- name (TEXT)
- planning (JSONB)
- mesocycles (JSONB)
- week_count (INTEGER)
- created_at, updated_at
```

---

## 🎨 Komponensek

### **React Komponensek**

```
src/
├── pages/
│   ├── MacrocyclePlanner.jsx       # Makrociklus tervező
│   ├── Calendar.jsx                # Naptár nézet
│   ├── TrainingTemplates.jsx       # Edzéssablonok
│   └── Matches.jsx                 # Mérkőzések
│
└── components/
    ├── GymTemplateEditor.jsx       # Konditerem szerkesztő
    ├── BallTemplateEditor.jsx      # Labdás edzés szerkesztő
    ├── TacticTemplateEditor.jsx    # Taktika szerkesztő
    └── TrainingSessionModal.jsx    # Edzés hozzáadás/szerkesztés
```

---

## 🔄 Workflow Példák

### **Példa 1: Heti Edzésterv Létrehozása**

1. **Szezon létrehozása**
   - Makrociklus Tervező → Új Szezon
   - Név: "2024/2025 Őszi Szezon"

2. **Heti struktúra tervezése**
   - Makrociklus Tervező → Napi Bontás
   - Minden napra típus kiválasztása

3. **Sablonok létrehozása**
   - Edzéssablonok → Konditerem Sablon
   - Gyakorlatok hozzáadása: Guggolás 4x8, Fekve nyomás 4x8, stb.

4. **Edzések ütemezése**
   - Naptár → Hétfő → Edzés hozzáadása
   - Konditerem sablon betöltése
   - Időpont: 9:00-10:30
   - Helyszín: Sportcsarnok

5. **Ellenőrzés**
   - Naptár → Havi nézet
   - Látható: 4x 🏋️ (4 konditermi edzés)

### **Példa 2: Mérkőzés Hétvége**

1. **Mérkőzés hozzáadása**
   - Mérkőzések → Új mérkőzés
   - Ellenfél: Veszprém KC
   - Dátum: Szombat 18:00
   - Hazai

2. **Felkészülés tervezése**
   - Csütörtök: Taktikai edzés (védekezés)
   - Péntek: Könnyű regeneráció
   - Szombat: Mérkőzés

3. **Naptárban látható**
   - Csütörtök: 🎯 Taktika
   - Péntek: 💆 Regeneráció
   - Szombat: 🏆 Mérkőzés

---

## 📊 Statisztikák és Jelentések

### **Elérhető Adatok**

```
Makrociklus:
├── Hetek száma
├── Mezociklusok
├── Edzéstípusok eloszlása
└── PDF export

Edzések:
├── Havi edzésszám
├── Típusonkénti bontás
├── Helyszínek
└── Időtartamok

Mérkőzések:
├── Bajnoki/Kupa mérkőzések
├── Hazai/Idegen arány
├── Eredmények
└── Ellenfelek
```

---

## 🚀 Következő Lépések (Opcionális Fejlesztések)

### **Fase 4 - További Funkciók**

1. **Játékos Részvétel**
   - Jelenléti ív
   - Hiányzások nyilvántartása
   - Játékosok teljesítménye

2. **Edzésnaplózás**
   - Végrehajtott gyakorlatok
   - Tényleges terhelések
   - Jegyzetek edzésről

3. **Statisztikák**
   - Havi összefoglalók
   - Terhelés grafikon
   - Mérkőzés elemzések

4. **Exportálás**
   - Excel export
   - Edzésnapló PDF
   - Statisztikák jelentés

5. **Értesítések**
   - Email értesítések
   - Közelgő edzések
   - Mérkőzés emlékeztetők

---

## 💡 Tippek és Trükkök

### **Hatékony Használat**

1. **Sablonok létrehozása először**
   - Hozz létre 3-4 alapvető sablont
   - Ezek lesznek az alapok

2. **Makrociklus tervezés**
   - Kezdd a heti struktúrával
   - Utána az egyes edzésekkel

3. **Sablon újrafelhasználás**
   - Duplikálás funkcióval gyors másolás
   - Kis módosításokkal új verzió

4. **Naptár használat**
   - Havi nézet: áttekintés
   - Napi nézet: részletek
   - Gyors edzés hozzáadás

---

## 🎯 Összefoglalás

### **Teljes Funkcionalitás**

✅ **Makrociklus Tervezés**
- Szezonok kezelése
- Heti struktúra
- Mezociklusok
- PDF export

✅ **Edzéssablonok**
- Konditermi programok részletesen
- Labdás edzések energiarendszerekkel
- Taktika & Technika poszt-specifikusan
- Újrafelhasználható sablonok

✅ **Naptár Integráció**
- Havi/Heti/Napi nézetek
- Edzések megjelenítése
- Mérkőzések megjelenítése
- Gyors edzés hozzáadás

✅ **Edzések Kezelése**
- Sablon importálás
- Időpontok megadása
- Helyszínek rögzítése
- Jegyzetek

✅ **Mérkőzések**
- Ütemezés
- Eredmények
- Hazai/Idegen
- Típusok

---

## 📞 Támogatás

### **Telepítés**

1. **Adatbázis táblák létrehozása:**
   ```bash
   # Futtasd a migration-öket:
   SETUP_TRAINING_SYSTEM.sql
   SETUP_TEMPLATES.sql
   ```

2. **Alkalmazás indítása:**
   ```bash
   npm run dev
   ```

3. **Böngészőben:**
   ```
   http://localhost:5173
   ```

### **Használat**

1. Jelentkezz be
2. Válassz csapatot
3. Hozz létre szezont
4. Tervezd meg a makrociklust
5. Adj hozzá sablonokat
6. Ütemezd az edzéseket
7. Rögzítsd a mérkőzéseket

---

**🎉 A rendszer készen áll a használatra!**

**Kellemes edzéstervezést!** 🏐💪📊
