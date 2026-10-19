// Thumbnail-generátor: minden gyakorlat GIF-jéből (első kocka) kis WEBP thumb,
// a lokális D:\edzes gif forrásból, feltöltve a bucket 'thumbs/' prefixébe hosszú cache-sel.
// Futtatás: SUPABASE_URL + SUPABASE_SERVICE_KEY env, majd `node scripts/gen-thumbnails.mjs`.
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
if (!URL || !KEY) { console.error('Hiányzik SUPABASE_URL / SUPABASE_SERVICE_KEY'); process.exit(1) }
const sb = createClient(URL, KEY, { auth: { persistSession: false } })

const BASE = 'D:/edzes gif'
// source_category -> lokális mappa
const M5 = `${BASE}/5° GIFs DE MUSCULACIÓN-20260721T115027Z-1-001/5° GIFs DE MUSCULACIÓN`
const FOLDER = {
  '5° GIFs DE MUSCULACIÓN / ABDOMEN CORE': `${M5}/ABDOMEN CORE (1)`,
  '5° GIFs DE MUSCULACIÓN / BÍCEPS y ANTEBRAZO': `${M5}/BÍCEPS y ANTEBRAZO (1)`,
  '5° GIFs DE MUSCULACIÓN / DELTOIDES': `${M5}/DELTOIDES (1)`,
  '5° GIFs DE MUSCULACIÓN / ESPALDA Y TRAPECIO': `${M5}/ESPALDA Y TRAPECIO (1)`,
  '5° GIFs DE MUSCULACIÓN / MIEMBROS INFERIORES Y GLÚTEOS': `${M5}/MIEMBROS INFERIORES Y GLÚTEOS (1)`,
  '5° GIFs DE MUSCULACIÓN / PANTORRILLA': `${M5}/PANTORRILLA (1)`,
  '5° GIFs DE MUSCULACIÓN / PECTORAL': `${M5}/PECTORAL (1)`,
  '5° GIFs DE MUSCULACIÓN / TRÍCEPS': `${M5}/TRÍCEPS (1)`,
  '6° GIFs DE CALISTENIA': `${BASE}/6° GIFs DE CALISTENIA-20260721T094242Z-1-001/6° GIFs DE CALISTENIA`,
  '7° GIFs DE ENTRENAMIENTO FUNCIONAL Y HIIT': `${BASE}/7° GIFs DE ENTRENAMIENTO FUNCIONAL Y HIIT-20260721T075332Z-1-001/7° GIFs DE ENTRENAMIENTO FUNCIONAL Y HIIT`,
  '8° GIFs DE ESTIRAMIENTO Y MOVILIDAD': `${BASE}/8° MANUAL DE ESTIRAMIENTO Y MOVILIDAD-20260720T145154Z-1-001/8° MANUAL DE ESTIRAMIENTO Y MOVILIDAD/GIFs DE ESTIRAMIENTO Y MOVILIDAD`,
}

// Az összes gyakorlat lekérése lapozva (PostgREST 1000-es limit).
const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('training_exercises')
    .select('gif_path, source_file, source_category').not('gif_path', 'is', null)
    .range(from, from + 999)
  if (error) { console.error(error); process.exit(1) }
  rows.push(...(data || []))
  if (!data || data.length < 1000) break
}
console.log('gyakorlat:', rows.length)

let ok = 0, skip = 0, fail = 0
for (const r of rows) {
  const dir = FOLDER[r.source_category]
  if (!dir) { skip++; continue }
  const local = path.join(dir, r.source_file)
  if (!existsSync(local)) { console.warn('nincs forrás:', r.source_file); skip++; continue }
  const thumbPath = 'thumbs/' + r.gif_path.replace(/\.[^.]+$/, '.webp')
  try {
    const buf = await readFile(local)
    const webp = await sharp(buf, { animated: false, pages: 1 })
      .resize({ width: 360, withoutEnlargement: true })
      .webp({ quality: 72 }).toBuffer()
    const { error } = await sb.storage.from('exercise-gifs')
      .upload(thumbPath, webp, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' })
    if (error) throw error
    ok++
    process.stdout.write(`\r✔ ${ok}/${rows.length}   `)
  } catch (e) { fail++; console.error('\n✗', thumbPath, e.message) }
}
console.log(`\nKész. Thumb: ${ok}, kihagyva: ${skip}, hiba: ${fail}.`)
