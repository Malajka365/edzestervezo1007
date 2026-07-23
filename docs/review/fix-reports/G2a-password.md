# G2a - Jelszó minimum hossz emelése (F3)

## Státusz
Kész.

## Változtatások
- `src/pages/Auth.jsx`:
  - Regisztrációnál a kliens-oldali minimum jelszóhossz 6-ról 10 karakterre emelve (`minLength={10}`, csak a regisztrációs fülön; bejelentkezésnél változatlan, `minLength` nincs beállítva, régi jelszavakkal is be lehet lépni).
  - `handleAuth`-ban explicit hossz-ellenőrzés `signUp` hívás előtt: 10 karakternél rövidebb jelszó esetén a `message` state-en keresztül megjelenik a magyar hibaüzenet `'A jelszónak legalább 10 karakter hosszúnak kell lennie'`, és a `supabase.auth.signUp` hívás elmarad.
  - Frissített hint szöveg: `'Minimum 10 karakter hosszú jelszó szükséges'`.
  - Új 3-szegmenses jelszó-erősség sáv + címke (Gyenge/Közepes/Erős) a regisztrációs fülön, tiszta kliens-oldali heurisztikával (hossz>=10, kis+nagybetű keverék, számjegy/szimbólum), külső könyvtár nélkül, a meglévő sötét slate Tailwind stílushoz igazítva.
- `src/test/components/Auth.test.jsx`:
  - A hint-teszt 10 karakteres szövegre frissítve.
  - A regisztrációs `signUp`-tesztben a jelszó `titkos123` -> `titkos12345` (10+ karakter).
  - Új teszt: 7 karakteres regisztrációs jelszóval a magyar hibaüzenet megjelenik és `signUp` NEM hívódik meg.
  - Bejelentkezési tesztek változatlanok, `titkos123` jelszóval továbbra is zöldek.

## Fontos megjegyzés - szerver-oldali beállítás
A SZERVER-oldali (Supabase) jelszó minimum hossz a Supabase Dashboard-ban van (Auth → Providers → Email → Password policy), ezt erről a gépről/kódból nem lehet módosítani. **Kérjük, emeld ezt is 10 karakterre a Supabase Dashboard-ban** - a kliens-oldali ellenőrzés önmagában megkerülhető (pl. közvetlen API hívással), így a tényleges védelmet a szerver-oldali policy adja.

## Ellenőrzés
- `npm test` — 7 test fájl, 64 teszt, mind zöld (beleértve az új tesztet).
- `npm run build` — sikeres, hiba nélkül.

## Érintett fájlok
- `src/pages/Auth.jsx`
- `src/test/components/Auth.test.jsx`
