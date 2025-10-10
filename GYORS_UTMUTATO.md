# ⚡ Gyors Útmutató - TeamFlow Edzéstervező

## 🚀 Első Lépések (5 perc)

### **1. Szezon Létrehozása**
```
Dashboard → Makrociklus Tervező → "Új Szezon" gomb
│
├── Név: "2024/2025 Őszi Szezon"
├── Kezdő dátum: 2024-09-01
├── Befejező dátum: 2025-02-28
└── "Létrehozás" gomb
```

### **2. Heti Struktúra Kitöltése**
```
Napi Bontás Tábla:
│
Kattints minden napra és válassz típust:
├── Hétfő: Erő
├── Kedd: Edzés
├── Szerda: Állóképesség
├── Csütörtök: Technika
├── Péntek: Taktika
├── Szombat: Mérkőzés
└── Vasárnap: Pihenő
```

### **3. Első Sablon Létrehozása**
```
Dashboard → Edzéssablonok → "Új Sablon"
│
├── Név: "Erő Alapprogram"
├── Típus: Konditerem
├── Időtartam: 60 perc
│
└── Gyakorlatok:
    ├── Guggolás: 4x8, 75% 1RM
    ├── Fekve nyomás: 4x8, 75% 1RM
    └── Húzódzkodás: 3x10, Testsúly
```

### **4. Edzés Hozzáadása Naptárhoz**
```
Dashboard → Edzésnaptár → Válassz napot → "Edzés hozzáadása"
│
├── "Sablon betöltése" → Válaszd az "Erő Alapprogram"
├── Kezdés: 09:00
├── Befejezés: 10:30
├── Helyszín: Sportcsarnok
└── "Mentés"
```

### **5. Mérkőzés Rögzítése**
```
Dashboard → Mérkőzések → "Új Mérkőzés"
│
├── Dátum: 2024-09-14
├── Időpont: 18:00
├── Ellenfél: Veszprém KC
├── Helyszín: Városi Sportcsarnok
├── Típus: Bajnoki
├── Hazai/Idegen: Hazai
└── "Mentés"
```

---

## 📋 Használati Gyorsbillentyűk

### **Menük Közötti Navigálás**
```
Alt + 1  →  Dashboard
Alt + 2  →  Csapatok
Alt + 3  →  Makrociklus Tervező
Alt + 4  →  Edzésnaptár
Alt + 5  →  Edzéssablonok
Alt + 6  →  Mérkőzések
```

### **Gyakori Műveletek**
```
Ctrl + S     →  Mentés
Ctrl + N     →  Új elem létrehozása
Esc          →  Modal bezárása
Enter        →  Form beküldése
```

---

## 🎯 Sablonok Használata

### **Konditermi Sablon**
```
Ideális:
├── Erőfejlesztés
├── Súlyozott gyakorlatok
└── 1RM alapú tervezés

Tartalmaz:
├── Gyakorlat név
├── Sorozatok & Ismétlések
├── Terhelés (%, kg, RPE, testsúly)
├── Pihenő (másodperc)
└── Tempó (pl. 3-0-1-0)
```

### **Labdás Sablon**
```
Ideális:
├── Kézilabda-specifikus edzések
├── Energiarendszer fejlesztés
└── Kondicionális célok

Tartalmaz:
├── Keringési terhelés (alacsony/közepes/magas)
├── Energiarendszer (aerob, anaerob)
├── Terhelés:Pihenés arány (pl. 1:2)
├── Típus (technikai, taktikai, kondicionális)
└── Gyakorlatok listája
```

### **Taktika & Technika Sablon**
```
Ideális:
├── Taktikai fejlesztés
├── Technikai tökéletesítés
└── Poszt-specifikus gyakorlatok

Tartalmaz:
├── Taktikai cél (támadás/védekezés)
├── Technikai cél (támadás/védekezés)
├── Videó URL
├── Gyakorlatok poszt szerint:
│   ├── Szélső
│   ├── Beálló
│   └── Átlövő-Irányító
└── Kapus edzés
```

---

## 📅 Naptár Tippek

### **Havi Nézet**
```
Használd:
├── Áttekintéshez
├── Edzések számolásához
└── Szabad napok kereséshez

Jelölések:
├── E, Er, Á, Gy, T, Ta, R, P, M  →  Makrociklus típusok
├── nx 🏋️  →  n darab edzés aznap
└── 🏆  →  Mérkőzés
```

### **Napi Nézet**
```
Használd:
├── Részletek megtekintéséhez
├── Edzések hozzáadásához
└── Szerkesztéshez

Tartalmaz:
├── Makrociklus típus
├── Edzések listája
└── Mérkőzések részletei
```

---

## 🔄 Gyors Munkafolyamatok

### **Hetente Ismétlődő Edzés**
```
1. Hozz létre sablont egyszer
2. Minden héten:
   └── Naptár → Nap kiválasztása → Edzés hozzáadása
   └── Sablon betöltése → Mentés
3. 30 másodperc/edzés
```

### **Teljes Hét Másolása**
```
Jelenleg manuálisan:
1. Előző hét megtekintése
2. Sablonok betöltése naponta
3. Új hetekre alkalmazás

Tipp: Használj egyértelmű sablon neveket!
```

### **Sablon Módosítása**
```
1. Edzéssablonok → Sablon kiválasztása
2. Szerkesztés gomb
3. Módosítások
4. Mentés

Hatás: Nem érinti a már létrehozott edzéseket!
```

---

## ⚠️ Gyakori Hibák Elkerülése

### **1. Szezon Dátumok**
```
❌ ROSSZ: Rossz dátumok → Hetek nem jelennek meg
✅ JÓ: Ellenőrizd a kezdő és befejező dátumokat!
```

### **2. Sablon Típusok**
```
❌ ROSSZ: Labdás edzés konditerem típussal
✅ JÓ: Típus megfelelő kiválasztása!
```

### **3. Edzés Időpontok**
```
❌ ROSSZ: Csak dátum, időpont nélkül
✅ JÓ: Kezdés és befejezés is megadva!
```

### **4. Sablon vs Edzés**
```
❌ ROSSZ: Sablon módosítása → Várás hogy az edzések is változnak
✅ JÓ: Sablonok: újrafelhasználható minták
           Edzések: konkrét események
```

---

## 💡 Pro Tippek

### **Sablon Nevezés**
```
✅ JÓ példák:
├── "Erő 1. fázis - Felső test"
├── "Labdás - Gyors ellentámadás"
├── "Taktika - 6-0 védekezés"
└── "Regeneráció - Aktív pihenő"

❌ ROSSZ példák:
├── "Edzés 1"
├── "Sablon"
└── "Program"
```

### **Időtartam Becslés**
```
Konditerem:
└── Gyakorlatok száma × 5 perc = Becsült idő

Labdás:
└── Gyakorlatok időtartamának összege

Taktika:
└── 60-90 perc átlagosan
```

### **Heti Terhelés**
```
Ajánlott arány:
├── 3-4x Konditerem/Erő
├── 2-3x Labdás/Technikai
├── 1-2x Taktikai
├── 1x Mérkőzés
└── 1-2x Regeneráció/Pihenő
```

---

## 📊 Gyors Ellenőrzés

### **Havi Áttekintés Checklist**
```
□ Minden héten van Erő edzés
□ 2-3 labdás edzés hetente
□ Mérkőzés előtt könnyű nap
□ Mérkőzés után regeneráció
□ Legalább 1 pihenőnap
□ Változatos terhelések
```

### **Edzés Létrehozás Checklist**
```
□ Sablon kiválasztva/betöltve
□ Dátum helyes
□ Időpont megadva
□ Helyszín rögzítve
□ Jegyzetek (ha van)
□ Mentés sikeres
```

---

## 🚨 Hibaelhárítás

### **Nem látszanak az edzések a naptárban**
```
1. Ellenőrizd: Jó dátumot választottál?
2. Ellenőrizd: Jó csapat van kiválasztva?
3. Ellenőrizd: Jó szezon van aktív?
4. Frissítsd az oldalt (F5)
```

### **Sablon nem tölthető be**
```
1. Ellenőrizd: Létezik a sablon?
2. Ellenőrizd: Ugyanaz a csapat?
3. Próbáld újra létrehozni a sablont
```

### **Adatok nem mentődnek**
```
1. Ellenőrizd az internet kapcsolatot
2. Ellenőrizd a Supabase kapcsolatot
3. Nézd meg a böngésző konzolt (F12)
```

---

## 📱 Gyors Referencia Kártya

```
┌─────────────────────────────────────────────────┐
│  TEAMFLOW GYORS REFERENCIA                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  Új Szezon:    Makrociklus → Új Szezon          │
│  Új Sablon:    Edzéssablonok → Új Sablon        │
│  Új Edzés:     Naptár → Nap → Edzés +           │
│  Új Mérkőzés:  Mérkőzések → Új Mérkőzés         │
│                                                  │
│  Típusok:                                        │
│  🏋️ Konditerem  ⚽ Labdás  🎯 Taktika           │
│                                                  │
│  Nézetek:                                        │
│  📅 Havi  📋 Heti  🗓️ Napi                      │
│                                                  │
│  Gyorsbillentyűk:                                │
│  Ctrl+S: Mentés   Esc: Bezárás                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

**🎉 Sikeres edzéstervezést!** 🏐💪📊
