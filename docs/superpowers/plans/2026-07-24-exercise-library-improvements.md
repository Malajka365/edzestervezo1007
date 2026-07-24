# Gyakorlat Könyvtár fejlesztések — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Gyakorlat Könyvtár gyors böngészése (egy izomcsoport egyszerre), izomnevekre is kereső szűrő, és GIF/kép-feltöltéses, a katalógushoz igazított új-gyakorlat felvitel részletes izom-réteggel.

**Architecture:** A tesztelhető logika pure helperekbe kerül (média-validáció/útvonal, szűrés) — ezek TDD-vel készülnek. A supabase-hívó rész (data-hook, feltöltés) a meglévő kódbázis-konvenció szerint nem unit-tesztelt, hanem build + kézi ellenőrzéssel. A két modal közös, összetett mezői újrahasznosítható komponensekbe kerülnek.

**Tech Stack:** React 18, Vite, TailwindCSS, Supabase (Storage + PostgREST), Vitest + @testing-library/react, react-hot-toast, lucide-react.

## Global Constraints

- Nyelv a UI-ban: magyar. Kód/komment: a fájl meglévő stílusát követi.
- Supabase Storage bucket: `exercise-gifs` (publikus). A `gif_path` a bucketen belüli relatív útvonal; a projekt-URL sehol nincs beégetve (`exerciseGifUrl` adja).
- Nincs séma-migráció; a szükséges RLS-policyk megvannak (`training_exercises` CRUD, `exercise_muscles` write, storage upload, `muscles`/`equipment_types` SELECT).
- Feltöltés kliens-oldalon a felhasználó munkamenetével (nincs service kulcs a kliensben).
- Média MIME whitelist: `image/gif`, `image/png`, `image/jpeg`. Méret-limit: 8 MB.
- Ablakozás kezdőérték: 60; „Továbbiak" lépés: +60.
- A 12 izomcsoport a `src/lib/exerciseTaxonomy.js` `MUSCLE_GROUPS`-ból; a modalitások `MODALITIES`-ből.
- Tesztfuttatás: `npm test`. Build: `npm run build`.

---

### Task 1: Média-helperek (pure) + feltöltés

**Files:**
- Modify: `src/lib/exerciseMedia.js`
- Test: `src/lib/exerciseMedia.test.js` (create)

**Interfaces:**
- Produces:
  - `slugify(str: string) → string` — kisbetűs, kötőjeles, ékezet nélkül.
  - `validateMediaFile(file: {type:string, size:number}) → { ok: boolean, error?: string }`
  - `buildMediaPath(slugBase: string, ext: string, now: number) → string` — `custom/<slug>-<now>.<ext>`
  - `uploadExerciseMedia(file: File, slugBase: string) → Promise<string>` — feltölt, visszaadja a `gif_path`-ot (supabase; nem unit-tesztelt).
  - Megmarad: `exerciseGifUrl(gifPath)`.

- [ ] **Step 1: Write the failing test**

`src/lib/exerciseMedia.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { slugify, validateMediaFile, buildMediaPath } from './exerciseMedia'

describe('slugify', () => {
  it('kisbetűsít, ékezetet bont, kötőjelez', () => {
    expect(slugify('Fekvenyomás rúddal')).toBe('fekvenyomas-ruddal')
  })
  it('levágja a vezető/záró kötőjeleket és összevonja', () => {
    expect(slugify('  Bench   Press!! ')).toBe('bench-press')
  })
  it('üres bemenetre üres stringet ad', () => {
    expect(slugify('')).toBe('')
  })
})

describe('validateMediaFile', () => {
  it('elfogad gif/png/jpeg-et a limit alatt', () => {
    expect(validateMediaFile({ type: 'image/gif', size: 1000 }).ok).toBe(true)
    expect(validateMediaFile({ type: 'image/png', size: 1000 }).ok).toBe(true)
    expect(validateMediaFile({ type: 'image/jpeg', size: 1000 }).ok).toBe(true)
  })
  it('elutasít más MIME-et', () => {
    const r = validateMediaFile({ type: 'video/mp4', size: 1000 })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/formátum|típus/i)
  })
  it('elutasít 8 MB fölött', () => {
    const r = validateMediaFile({ type: 'image/gif', size: 8 * 1024 * 1024 + 1 })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/méret|MB/i)
  })
})

describe('buildMediaPath', () => {
  it('custom/<slug>-<now>.<ext> alakot ad', () => {
    expect(buildMediaPath('Bench Press', 'gif', 1700000000000))
      .toBe('custom/bench-press-1700000000000.gif')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/exerciseMedia.test.js`
Expected: FAIL — `slugify`/`validateMediaFile`/`buildMediaPath` nincs exportálva.

- [ ] **Step 3: Write minimal implementation**

`src/lib/exerciseMedia.js` — a meglévő tartalom MEGMARAD; alá kerül:
```js
const ALLOWED_MIME = ['image/gif', 'image/png', 'image/jpeg']
const MAX_BYTES = 8 * 1024 * 1024
const EXT_BY_MIME = { 'image/gif': 'gif', 'image/png': 'png', 'image/jpeg': 'jpg' }

export function slugify(str) {
  return (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // ékezetek le
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateMediaFile(file) {
  if (!file) return { ok: false, error: 'Nincs kiválasztott fájl.' }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, error: 'Nem támogatott formátum. Csak GIF, PNG vagy JPEG.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'A fájl mérete túl nagy (max 8 MB).' }
  }
  return { ok: true }
}

export function buildMediaPath(slugBase, ext, now) {
  const slug = slugify(slugBase) || 'gyakorlat'
  return `custom/${slug}-${now}.${ext}`
}

// Feltölti a média-fájlt az exercise-gifs bucketbe, visszaadja a gif_path-ot.
// A felhasználó munkamenetével fut (a bucket write-policyja: authenticated).
export async function uploadExerciseMedia(file, slugBase) {
  const check = validateMediaFile(file)
  if (!check.ok) throw new Error(check.error)
  const ext = EXT_BY_MIME[file.type]
  const path = buildMediaPath(slugBase, ext, Date.now())
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/exerciseMedia.test.js`
Expected: PASS (10 assertion, minden zöld).

- [ ] **Step 5: Commit**

```bash
git add src/lib/exerciseMedia.js src/lib/exerciseMedia.test.js
git commit -m "feat: media upload helpers for exercise library (slugify, validate, path, upload)"
```

---

### Task 2: Szűrő-logika (pure) + tesztek

**Files:**
- Create: `src/pages/exercise-library/filterExercises.js`
- Test: `src/pages/exercise-library/filterExercises.test.js`

**Interfaces:**
- Consumes: `normalizeMuscleGroup` a `src/lib/exerciseTaxonomy.js`-ből.
- Produces:
  - `filterExercises(exercises, opts) → Exercise[]`
    `opts = { searchTerm, muscleGroup, difficulty, modality, favoritesOnly, favorites, muscleSearchByExercise }`
    - `muscleSearchByExercise`: `Record<id, string>` (kisbetűs izomnév-blob) vagy `Map`.
    - Böngészés (üres `searchTerm`): `muscle_group === muscleGroup`.
    - Keresés (nem üres): `name`/`name_en`/izomnév-blob illeszkedés, minden csoporton.
    - Rátét: `difficulty` (ha nem `'all'`), `modality` (ha nem `'all'`), `favoritesOnly`.

- [ ] **Step 1: Write the failing test**

`src/pages/exercise-library/filterExercises.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { filterExercises } from './filterExercises'

const EX = [
  { id: 1, name: 'Fekvenyomás', name_en: 'Bench press', muscle_group: 'mell', difficulty: 'intermediate', modality: 'erosites' },
  { id: 2, name: 'Húzódzkodás', name_en: 'Pull-up', muscle_group: 'hat', difficulty: 'advanced', modality: 'erosites' },
  { id: 3, name: 'Guggolás', name_en: 'Squat', muscle_group: 'quad', difficulty: 'beginner', modality: 'kalisztenika' },
]
const MUSCLES = { 1: 'nagy mellizom pectoralis major', 2: 'széles hátizom latissimus dorsi', 3: 'egyenes combizom rectus femoris' }
const base = { searchTerm: '', muscleGroup: 'mell', difficulty: 'all', modality: 'all', favoritesOnly: false, favorites: [], muscleSearchByExercise: MUSCLES }

describe('filterExercises — böngészés', () => {
  it('csak a kiválasztott izomcsoportot adja vissza', () => {
    const r = filterExercises(EX, { ...base, muscleGroup: 'mell' })
    expect(r.map((e) => e.id)).toEqual([1])
  })
})

describe('filterExercises — keresés', () => {
  it('névre talál minden csoporton át', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'guggol' })
    expect(r.map((e) => e.id)).toEqual([3])
  })
  it('izom latin nevére talál (a kiválasztott csoporton kívül is)', () => {
    const r = filterExercises(EX, { ...base, muscleGroup: 'mell', searchTerm: 'latissimus' })
    expect(r.map((e) => e.id)).toEqual([2])
  })
  it('izom magyar nevére talál', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'combizom' })
    expect(r.map((e) => e.id)).toEqual([3])
  })
})

describe('filterExercises — rátét szűrők', () => {
  it('nehézségre szűr keresés közben', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'a', difficulty: 'advanced' })
    expect(r.map((e) => e.id)).toEqual([2])
  })
  it('modalitásra szűr', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'a', modality: 'kalisztenika' })
    expect(r.map((e) => e.id)).toEqual([3])
  })
  it('kedvencekre szűr', () => {
    const r = filterExercises(EX, { ...base, searchTerm: 'a', favoritesOnly: true, favorites: [2] })
    expect(r.map((e) => e.id)).toEqual([2])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/exercise-library/filterExercises.test.js`
Expected: FAIL — `filterExercises` nincs.

- [ ] **Step 3: Write minimal implementation**

`src/pages/exercise-library/filterExercises.js`:
```js
import { normalizeMuscleGroup } from '../../lib/exerciseTaxonomy'

// Pure szűrő. Böngészéskor (üres searchTerm) egy izomcsoport; keresésnél név +
// izomnév illesztés minden csoporton. A rátét szűrők mindkét módban érvényesek.
export function filterExercises(exercises, opts) {
  const {
    searchTerm = '', muscleGroup, difficulty = 'all', modality = 'all',
    favoritesOnly = false, favorites = [], muscleSearchByExercise = {},
  } = opts || {}

  const getBlob = (id) =>
    muscleSearchByExercise instanceof Map
      ? (muscleSearchByExercise.get(id) || '')
      : (muscleSearchByExercise[id] || '')

  const q = searchTerm.trim().toLowerCase()
  let out = exercises

  if (q) {
    out = out.filter((ex) =>
      ex.name?.toLowerCase().includes(q) ||
      ex.name_en?.toLowerCase().includes(q) ||
      getBlob(ex.id).includes(q)
    )
  } else {
    out = out.filter((ex) => normalizeMuscleGroup(ex.muscle_group) === muscleGroup)
  }

  if (difficulty !== 'all') out = out.filter((ex) => ex.difficulty === difficulty)
  if (modality !== 'all') out = out.filter((ex) => (ex.modality || 'erosites') === modality)
  if (favoritesOnly) out = out.filter((ex) => favorites.includes(ex.id))

  return out
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/exercise-library/filterExercises.test.js`
Expected: PASS (7 teszt zöld).

- [ ] **Step 5: Commit**

```bash
git add src/pages/exercise-library/filterExercises.js src/pages/exercise-library/filterExercises.test.js
git commit -m "feat: pure exercise filter (browse-by-group + cross-group name/muscle search)"
```

---

### Task 3: Data-réteg bővítés — karcsú lista, izom-index, katalógusok, detail, izom-mentés

**Files:**
- Modify: `src/pages/exercise-library/useExerciseLibraryData.js`

**Interfaces:**
- Consumes: `supabase` (`../../lib/supabase`), `toast`.
- Produces (a hook return-je bővül):
  - `exercises` (karcsú sorok), `favorites`, `loading`
  - `muscles: Array<{code,name_hu,name_latin,name_en,muscle_group}>` (46)
  - `equipmentTypes: Array<{code,name_hu}>` (17)
  - `musclesByExercise: Record<id, Array<{code,role,name_hu,name_latin,muscle_group}>>`
  - `muscleSearchByExercise: Record<id, string>`
  - `fetchExercises()`, `fetchExerciseDetail(id) → Promise<row|null>`
  - `saveExerciseMuscles(exerciseId, rows: Array<{muscle_code,role}>) → Promise<void>`
  - `createExercise(form) → Promise<id|null>` (siker: az új sor `id`-je; hiba: `null`)
  - `updateExercise(form) → Promise<boolean>`, `deleteExercise(id)`, `toggleFavorite(id)`

- [ ] **Step 1: Karcsú lista + izom-index + katalógusok betöltése**

A `fetchExercises` `select('*')`-je karcsú listára cserélve, és a betöltés kiegészül az index + katalógusok lekérésével. Új state a hook tetején:
```js
const [muscles, setMuscles] = useState([])
const [equipmentTypes, setEquipmentTypes] = useState([])
const [musclesByExercise, setMusclesByExercise] = useState({})
const [muscleSearchByExercise, setMuscleSearchByExercise] = useState({})
```
A `fetchExercises` törzsében a gyakorlat-lekérdezés:
```js
const { data, error } = await supabase
  .from('training_exercises')
  .select('id, slug, name, name_en, muscle_group, secondary_muscles, equipment, difficulty, modality, gif_path')
  .order('name', { ascending: true })
if (error) throw error
```
majd (a favorites-blokk mellé) az index + szótárak:
```js
// Izom-index: egy lekérdezés az egész könyvtárra.
const { data: emData } = await supabase
  .from('exercise_muscles')
  .select('exercise_id, role, muscles(code, name_latin, name_hu, name_en, muscle_group)')
const byEx = {}
const searchByEx = {}
for (const row of emData || []) {
  const m = row.muscles
  if (!m) continue
  ;(byEx[row.exercise_id] ||= []).push({ code: m.code, role: row.role, name_hu: m.name_hu, name_latin: m.name_latin, muscle_group: m.muscle_group })
  searchByEx[row.exercise_id] = ((searchByEx[row.exercise_id] || '') + ' ' + m.name_hu + ' ' + m.name_latin).toLowerCase()
}
setMusclesByExercise(byEx)
setMuscleSearchByExercise(searchByEx)

const [{ data: mus }, { data: eq }] = await Promise.all([
  supabase.from('muscles').select('code, name_hu, name_latin, name_en, muscle_group').order('muscle_group'),
  supabase.from('equipment_types').select('code, name_hu').order('name_hu'),
])
setMuscles(mus || [])
setEquipmentTypes(eq || [])
```

- [ ] **Step 2: `fetchExerciseDetail` + `saveExerciseMuscles`**

A `fetchExerciseMuscles` HELYETT (vagy mellé) új függvények a hookban:
```js
// A teljes sor a részletnézethez (a karcsú listából hiányzó mezők).
const fetchExerciseDetail = async (id) => {
  if (!id) return null
  const { data, error } = await supabase
    .from('training_exercises').select('*').eq('id', id).single()
  if (error) { console.error('Error fetching exercise detail:', error); return null }
  return data
}

// A gyakorlat részletes izmainak mentése: teljes csere (törlés + beszúrás).
const saveExerciseMuscles = async (exerciseId, rows) => {
  await supabase.from('exercise_muscles').delete().eq('exercise_id', exerciseId)
  if (rows && rows.length) {
    const payload = rows.map((r) => ({ exercise_id: exerciseId, muscle_code: r.muscle_code, role: r.role }))
    const { error } = await supabase.from('exercise_muscles').insert(payload)
    if (error) throw error
  }
}
```
A régi `fetchExerciseMuscles` törölhető (a részletnézet a `musclesByExercise` cache-t használja majd).

- [ ] **Step 3: `createExercise` visszaadja az `id`-t**

A `createExercise` insertje `.select('id').single()`-lel, és a return az `id`:
```js
const { data, error } = await supabase
  .from('training_exercises')
  .insert({ /* ...a meglévő mezők változatlanul... */ })
  .select('id').single()
if (error) throw error
fetchExercises()
toast.success('Gyakorlat sikeresen létrehozva!')
return data.id
```
A `catch` ág `return null`. (Az `updateExercise` változatlanul `true/false`.)

- [ ] **Step 4: Return-blokk bővítése**

A hook `return { ... }`-jába kerül:
```js
muscles, equipmentTypes, musclesByExercise, muscleSearchByExercise,
fetchExerciseDetail, saveExerciseMuscles,
```
(és a `fetchExerciseMuscles` kikerül, ha törölted.)

- [ ] **Step 5: Build ellenőrzés**

Run: `npm run build`
Expected: sikeres build (nincs unresolved import/hivatkozás). A hookot még senki nem használja az új mezőkkel — ez a Task 7-ben köt be.

- [ ] **Step 6: Commit**

```bash
git add src/pages/exercise-library/useExerciseLibraryData.js
git commit -m "feat: slim exercise list + muscle index + catalogs + detail/muscle-save ops"
```

---

### Task 4: Közös modal-mezők — MediaUpload, ChipMultiSelect, MusclePicker

**Files:**
- Create: `src/pages/exercise-library/MediaUpload.jsx`
- Create: `src/pages/exercise-library/ChipMultiSelect.jsx`
- Create: `src/pages/exercise-library/MusclePicker.jsx`

**Interfaces:**
- Consumes: `uploadExerciseMedia`, `exerciseGifUrl` (`../../lib/exerciseMedia`); `MUSCLE_GROUP_LABELS`, `ROLE_LABELS` (`../../lib/exerciseTaxonomy`); `toast`.
- Produces:
  - `MediaUpload({ value, onChange, slugBase })` — `value` = gif_path; `onChange(gif_path)`.
  - `ChipMultiSelect({ options, value, onChange, placeholder })` — `options: [{value,label}]`, `value: string[]`.
  - `MusclePicker({ muscles, value, onChange })` — `value: [{muscle_code, role}]`.

- [ ] **Step 1: MediaUpload**

`src/pages/exercise-library/MediaUpload.jsx`:
```jsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Upload, Loader2 } from 'lucide-react'
import { uploadExerciseMedia, exerciseGifUrl } from '../../lib/exerciseMedia'

export default function MediaUpload({ value, onChange, slugBase }) {
  const [uploading, setUploading] = useState(false)
  const previewUrl = value ? exerciseGifUrl(value) : null

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = await uploadExerciseMedia(file, slugBase || 'gyakorlat')
      onChange(path)
      toast.success('Média feltöltve.')
    } catch (err) {
      toast.error(err.message || 'Sikertelen feltöltés.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2">GIF / kép</label>
      <div className="flex items-center gap-4">
        {previewUrl && (
          <img src={previewUrl} alt="előnézet" className="w-24 h-24 object-cover rounded-lg border border-slate-600" />
        )}
        <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg cursor-pointer transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="text-sm">{uploading ? 'Feltöltés...' : 'Fájl kiválasztása'}</span>
          <input type="file" accept="image/gif,image/png,image/jpeg" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {value && <p className="text-xs text-slate-500 mt-1 truncate">{value}</p>}
    </div>
  )
}
```

- [ ] **Step 2: ChipMultiSelect**

`src/pages/exercise-library/ChipMultiSelect.jsx`:
```jsx
export default function ChipMultiSelect({ options, value, onChange, placeholder }) {
  const selected = value || []
  const add = (code) => { if (code && !selected.includes(code)) onChange([...selected, code]) }
  const remove = (code) => onChange(selected.filter((c) => c !== code))
  const labelOf = (code) => options.find((o) => o.value === code)?.label || code

  return (
    <div>
      <select
        value=""
        onChange={(e) => add(e.target.value)}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">{placeholder || 'Válassz...'}</option>
        {options.filter((o) => !selected.includes(o.value)).map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map((code) => (
            <span key={code} className="px-2 py-1 bg-slate-600 text-xs text-slate-200 rounded flex items-center gap-1">
              {labelOf(code)}
              <button type="button" onClick={() => remove(code)} className="hover:text-red-400">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: MusclePicker**

`src/pages/exercise-library/MusclePicker.jsx`:
```jsx
import { MUSCLE_GROUP_LABELS, ROLE_LABELS, ROLE_ORDER } from '../../lib/exerciseTaxonomy'

export default function MusclePicker({ muscles, value, onChange }) {
  const rows = value || []
  const chosen = new Set(rows.map((r) => r.muscle_code))
  const add = (code) => { if (code && !chosen.has(code)) onChange([...rows, { muscle_code: code, role: 'secondary' }]) }
  const setRole = (code, role) => onChange(rows.map((r) => (r.muscle_code === code ? { ...r, role } : r)))
  const remove = (code) => onChange(rows.filter((r) => r.muscle_code !== code))
  const nameOf = (code) => {
    const m = muscles.find((x) => x.code === code)
    return m ? `${m.name_hu} (${m.name_latin})` : code
  }

  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2">Részletes izmok (opcionális)</label>
      <select
        value=""
        onChange={(e) => add(e.target.value)}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">Izom hozzáadása...</option>
        {muscles.filter((m) => !chosen.has(m.code)).map((m) => (
          <option key={m.code} value={m.code}>
            {MUSCLE_GROUP_LABELS[m.muscle_group] || m.muscle_group} – {m.name_hu} ({m.name_latin})
          </option>
        ))}
      </select>
      {rows.length > 0 && (
        <div className="space-y-2 mt-2">
          {rows.map((r) => (
            <div key={r.muscle_code} className="flex items-center gap-2">
              <span className="flex-1 text-sm text-slate-200 truncate">{nameOf(r.muscle_code)}</span>
              <select
                value={r.role}
                onChange={(e) => setRole(r.muscle_code, e.target.value)}
                className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
              >
                {ROLE_ORDER.map((role) => (
                  <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                ))}
              </select>
              <button type="button" onClick={() => remove(r.muscle_code)} className="text-slate-400 hover:text-red-400">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Build ellenőrzés**

Run: `npm run build`
Expected: sikeres build (a komponensek importjai feloldódnak; még senki nem használja őket).

- [ ] **Step 5: Commit**

```bash
git add src/pages/exercise-library/MediaUpload.jsx src/pages/exercise-library/ChipMultiSelect.jsx src/pages/exercise-library/MusclePicker.jsx
git commit -m "feat: shared exercise-form fields (media upload, chip multiselect, muscle picker)"
```

---

### Task 5: CreateExerciseModal — feltöltés, választók, részletes izmok

**Files:**
- Modify: `src/pages/exercise-library/CreateExerciseModal.jsx`

**Interfaces:**
- Consumes: `MediaUpload`, `ChipMultiSelect`, `MusclePicker`; `MUSCLE_GROUPS`, `MODALITIES` (`../../lib/exerciseTaxonomy`).
- Új prop-ok: `equipmentTypes`, `muscles`, `detailMuscles`, `setDetailMuscles` (a részletes izom-form állapota a szülőben él, l. Task 7).

- [ ] **Step 1: Mezők cseréje**

A `CreateExerciseModal` importjai bővülnek:
```jsx
import { MUSCLE_GROUPS, MODALITIES } from '../../lib/exerciseTaxonomy'
import MediaUpload from './MediaUpload'
import ChipMultiSelect from './ChipMultiSelect'
import MusclePicker from './MusclePicker'
```
A komponens signature új prop-okkal:
```jsx
export default function CreateExerciseModal({
  setShowCreateModal, newExercise, setNewExercise, createExercise, loading,
  equipmentTypes, muscles, detailMuscles, setDetailMuscles,
}) {
```
A „GIF útvonal" szabadszöveg-blokk (`<input ... gif_path ...>`) HELYÉRE:
```jsx
<MediaUpload
  value={newExercise.gif_path}
  onChange={(path) => setNewExercise({ ...newExercise, gif_path: path })}
  slugBase={newExercise.name_en || newExercise.name}
/>
```
A „Modality & Type" rácsból a **Típus** oszlop TÖRLENDŐ (marad a Modalitás egyedül, `grid-cols-2` → `grid-cols-1` vagy a Modalitás a Nehézség mellé). Az „Szükséges eszközök" szabadszöveg-blokk HELYÉRE:
```jsx
<div>
  <label className="block text-sm font-medium text-white mb-2">Szükséges eszközök</label>
  <ChipMultiSelect
    options={(equipmentTypes || []).map((e) => ({ value: e.code, label: e.name_hu }))}
    value={newExercise.equipment}
    onChange={(v) => setNewExercise({ ...newExercise, equipment: v })}
    placeholder="Eszköz hozzáadása..."
  />
</div>
```
A „Másodlagos izomcsoportok" szabadszöveg-blokk HELYÉRE:
```jsx
<div>
  <label className="block text-sm font-medium text-white mb-2">Másodlagos izomcsoportok</label>
  <ChipMultiSelect
    options={MUSCLE_GROUPS.map((g) => ({ value: g.id, label: g.name }))}
    value={newExercise.secondary_muscles}
    onChange={(v) => setNewExercise({ ...newExercise, secondary_muscles: v })}
    placeholder="Csoport hozzáadása..."
  />
</div>
```
A „Tippek" blokk után (a záró akciógombok elé) a részletes izmok:
```jsx
<MusclePicker muscles={muscles || []} value={detailMuscles} onChange={setDetailMuscles} />
```

- [ ] **Step 2: Build ellenőrzés**

Run: `npm run build`
Expected: sikeres build. (A `detailMuscles`/`equipmentTypes`/`muscles` propokat a Task 7 adja át; addig a modal nem renderelődik hibásan, mert csak a Task 7 nyitja meg.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/exercise-library/CreateExerciseModal.jsx
git commit -m "feat: create-exercise modal uses media upload + code-list selectors + muscle picker"
```

---

### Task 6: EditExerciseModal — ugyanazok a mezők, előtöltve

**Files:**
- Modify: `src/pages/exercise-library/EditExerciseModal.jsx`

**Interfaces:**
- Consumes: ugyanaz mint Task 5. Új prop-ok: `equipmentTypes`, `muscles`, `detailMuscles`, `setDetailMuscles`.

- [ ] **Step 1: Mezők cseréje (a Task 5-tel azonos minta)**

Importok:
```jsx
import { MUSCLE_GROUPS, MODALITIES } from '../../lib/exerciseTaxonomy'
import MediaUpload from './MediaUpload'
import ChipMultiSelect from './ChipMultiSelect'
import MusclePicker from './MusclePicker'
```
Signature:
```jsx
export default function EditExerciseModal({
  setShowEditModal, editingExercise, setEditingExercise, updateExercise, loading,
  equipmentTypes, muscles, detailMuscles, setDetailMuscles,
}) {
```
A „GIF útvonal" input HELYÉRE:
```jsx
<MediaUpload
  value={editingExercise.gif_path}
  onChange={(path) => setEditingExercise({ ...editingExercise, gif_path: path })}
  slugBase={editingExercise.name_en || editingExercise.name}
/>
```
A **Típus** oszlop törlendő. Az eszköz-szabadszöveg HELYÉRE:
```jsx
<ChipMultiSelect
  options={(equipmentTypes || []).map((e) => ({ value: e.code, label: e.name_hu }))}
  value={editingExercise.equipment}
  onChange={(v) => setEditingExercise({ ...editingExercise, equipment: v })}
  placeholder="Eszköz hozzáadása..."
/>
```
A másodlagos-izom szabadszöveg HELYÉRE:
```jsx
<ChipMultiSelect
  options={MUSCLE_GROUPS.map((g) => ({ value: g.id, label: g.name }))}
  value={editingExercise.secondary_muscles}
  onChange={(v) => setEditingExercise({ ...editingExercise, secondary_muscles: v })}
  placeholder="Csoport hozzáadása..."
/>
```
A tippek után:
```jsx
<MusclePicker muscles={muscles || []} value={detailMuscles} onChange={setDetailMuscles} />
```

- [ ] **Step 2: Build ellenőrzés**

Run: `npm run build`
Expected: sikeres build.

- [ ] **Step 3: Commit**

```bash
git add src/pages/exercise-library/EditExerciseModal.jsx
git commit -m "feat: edit-exercise modal uses media upload + code-list selectors + muscle picker"
```

---

### Task 7: ExerciseLibrary bekötése — egy csoport, izom-keresés, ablakozás, mentés

**Files:**
- Modify: `src/pages/ExerciseLibrary.jsx`

**Interfaces:**
- Consumes: a Task 3 hook mezői; `filterExercises` (Task 2); a modalok új prop-jai (Task 5–6).

- [ ] **Step 1: Hook-mezők + állapot**

A `useExerciseLibraryData()` destrukturálás bővül:
```js
const {
  exercises, favorites, loading,
  muscles, equipmentTypes, musclesByExercise, muscleSearchByExercise,
  fetchExerciseDetail, saveExerciseMuscles,
  createExercise: createExerciseOp, updateExercise: updateExerciseOp,
  deleteExercise: deleteExerciseOp, toggleFavorite,
} = useExerciseLibraryData()
```
Új/megváltozott állapot:
```js
const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('mell') // volt 'all'
const [visibleCount, setVisibleCount] = useState(60)
const [detailMuscles, setDetailMuscles] = useState([]) // a modal részletes izmai
```
A `selectedType` állapot és minden hivatkozása TÖRLENDŐ.

- [ ] **Step 2: Szűrés a pure helperrel + ablakozás**

`import { filterExercises } from './exercise-library/filterExercises'` a fájl tetejére.
A `muscleGroups` lista az „Összes" elem NÉLKÜL:
```js
const muscleGroups = MUSCLE_GROUPS.map((g) => ({ ...g, icon: GROUP_ICONS[g.id] || Activity }))
```
A régi `filterExercises`/`filteredExercises` useState + useEffect helyett származtatott érték:
```js
const filtered = useMemo(() => filterExercises(exercises, {
  searchTerm, muscleGroup: selectedMuscleGroup, difficulty: selectedDifficulty,
  modality: selectedModality, favoritesOnly: showFavoritesOnly, favorites, muscleSearchByExercise,
}), [exercises, searchTerm, selectedMuscleGroup, selectedDifficulty, selectedModality, showFavoritesOnly, favorites, muscleSearchByExercise])

const visible = filtered.slice(0, visibleCount)
```
(A `useMemo`-t importáld a react-ből.) A `visibleCount` visszaáll 60-ra a szűrők változásakor:
```js
useEffect(() => { setVisibleCount(60) }, [searchTerm, selectedMuscleGroup, selectedDifficulty, selectedModality, showFavoritesOnly])
```
A `groupExercisesByMuscleGroup` a `visible` halmazon dolgozzon (a `filteredExercises` helyett `visible`). A fejléc-számláló: `{filtered.length} gyakorlat` (és ha `filtered.length > visible.length`, jelezd: „(látszik: {visible.length})").

- [ ] **Step 3: „Összes" gomb eltávolítása + „Továbbiak" gomb**

A `muscleGroups.map(...)` gombsor változatlan, de már nincs benne `all` elem, így mindig egy konkrét csoport aktív. A gyakorlat-rács UTÁN:
```jsx
{filtered.length > visible.length && (
  <div className="flex justify-center pt-4">
    <button
      onClick={() => setVisibleCount((c) => c + 60)}
      className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
    >
      Továbbiak ({filtered.length - visible.length})
    </button>
  </div>
)}
```

- [ ] **Step 4: Részletnézet — teljes sor + cache-elt izmok**

A kártya-kattintás kezelője a `selectedExercise` beállításakor teljes sort tölt és az izmokat a cache-ből veszi. Ahol most `setSelectedExercise(ex)` van, ott:
```js
const openDetail = async (ex) => {
  const full = await fetchExerciseDetail(ex.id)
  setSelectedExercise(full || ex)
  setSelectedExerciseMuscles(musclesByExercise[ex.id] || [])
}
```
A meglévő „részletes izmok betöltése" `useEffect` (ami a régi `fetchExerciseMuscles`-t hívta) TÖRLENDŐ; helyette az `openDetail` állítja a `selectedExerciseMuscles`-t. A `musclesByRole` számítás változatlan.

- [ ] **Step 5: Create/Edit — propok + mentés részletes izmokkal**

Az „Új gyakorlat" gomb megnyitásakor ürítsd a `detailMuscles`-t: `onClick={() => { setDetailMuscles([]); setShowCreateModal(true) }}`.
A `startEditExercise` töltse fel a `detailMuscles`-t a cache-ből:
```js
const startEditExercise = (exercise) => {
  setEditingExercise({ ...exercise, equipment: exercise.equipment || [], instructions: exercise.instructions || [], tips: exercise.tips || [], secondary_muscles: exercise.secondary_muscles || [] })
  setDetailMuscles((musclesByExercise[exercise.id] || []).map((m) => ({ muscle_code: m.code, role: m.role })))
  setShowEditModal(true)
}
```
A `createExercise`/`updateExercise` wrapperek mentsék az izmokat is:
```js
const createExercise = async () => {
  const id = await createExerciseOp(newExercise)
  if (id) {
    await saveExerciseMuscles(id, detailMuscles)
    fetchExercises()
    setNewExercise({ name:'', name_en:'', muscle_group:'mell', secondary_muscles:[], difficulty:'beginner', type:'gym', modality:'erosites', gif_path:'', equipment:[], description:'', instructions:[], tips:[], parameters:{ sets:3, reps:'10-12', rest:'60s' } })
    setDetailMuscles([])
    setShowCreateModal(false)
  }
}
const updateExercise = async () => {
  const ok = await updateExerciseOp(editingExercise)
  if (ok) {
    await saveExerciseMuscles(editingExercise.id, detailMuscles)
    fetchExercises()
    setShowEditModal(false); setEditingExercise(null); setDetailMuscles([])
  }
}
```
A modal-render propjai bővülnek mindkét helyen:
```jsx
<CreateExerciseModal ... equipmentTypes={equipmentTypes} muscles={muscles} detailMuscles={detailMuscles} setDetailMuscles={setDetailMuscles} />
<EditExerciseModal ... equipmentTypes={equipmentTypes} muscles={muscles} detailMuscles={detailMuscles} setDetailMuscles={setDetailMuscles} />
```

- [ ] **Step 6: Build + teszt**

Run: `npm run build`
Expected: sikeres build (nincs `selectedType`/`filteredExercises` maradék hivatkozás).
Run: `npm test`
Expected: az összes eddigi teszt + az új pure tesztek PASS.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ExerciseLibrary.jsx
git commit -m "feat: exercise library single-group browse, cross-group muscle search, windowing, media+muscle save"
```

---

### Task 8: Kézi ellenőrzés localhoston

**Files:** nincs (verifikáció).

- [ ] **Step 1: Dev szerver + smoke**

Run: `npm run dev` (a Gyakorlat Könyvtár megnyitása).
Ellenőrizd:
1. Alapból egy izomcsoport (Mell) látszik, gyorsan tölt; csoportváltás azonnali.
2. Keresés „latissimus" / „széles hátizom" → hát-gyakorlatok jelennek meg csoporttól függetlenül.
3. Sok találatnál a „Továbbiak" gomb betölt +60-at.
4. Új gyakorlat: GIF/kép feltöltés (előnézet), eszköz + másodlagos csoport választó, opcionális részletes izom (fő/segéd) → mentés után megjelenik a listában, részletnézetben GIF + latin izmok, és megtalálható izom-kereséssel.
5. Meglévő gyakorlat szerkesztése: a mezők + részletes izmok előtöltve; mentés működik.

- [ ] **Step 2: Záró commit (ha volt apró javítás)**

```bash
git add -A
git commit -m "fix: exercise library review follow-ups"
```
(Ha nincs javítanivaló, ez a lépés kihagyható.)

---

## Önellenőrzés (spec-lefedettség)

- Teljesítmény (karcsú lista + egy csoport + ablakozás): Task 3 (lista), Task 7 (egy csoport, ablakozás). ✓
- Izom-keresés (névre): Task 2 (pure szűrő), Task 3 (izom-index), Task 7 (bekötés). ✓
- Create/Edit GIF-feltöltés: Task 1 (helper), Task 4 (MediaUpload), Task 5–6 (modalok). ✓
- Eszköz/másodlagos választók a kód-listákból: Task 3 (katalógusok), Task 4 (ChipMultiSelect), Task 5–6. ✓
- Opcionális részletes izom-réteg: Task 3 (`saveExerciseMuscles`), Task 4 (MusclePicker), Task 5–7. ✓
- „Típus" (gym/both/ball) kivezetése a UI-ból, `type='gym'` marad: Task 5–6 (UI), a hook változatlanul írja a `type`-ot. ✓
- Nincs séma-migráció: egyik task sem ad hozzá. ✓
- Tesztek (pure helperek): Task 1, Task 2. Kézi: Task 8. ✓
