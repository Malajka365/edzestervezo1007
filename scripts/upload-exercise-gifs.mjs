#!/usr/bin/env node
/**
 * upload-exercise-gifs.mjs
 * ------------------------------------------------------------------
 * Feltölti a gyakorlat-GIF-eket a Supabase Storage 'exercise-gifs' bucketjébe,
 * a manifest (scripts/exercise-gif-manifest.json) alapján stabil útvonalra:
 *   <muscle_group>/<slug>.gif   (pl. mell/bench-press.gif)
 *
 * A training_exercises.gif_path oszlop pontosan ezt az útvonalat tárolja, így
 * az app a supabase.storage.from('exercise-gifs').getPublicUrl(gif_path)
 * hívással jeleníti meg a GIF-et — a projekt URL-je sehol nincs beégetve.
 *
 * Használat:
 *   1) Előbb futtasd le a 3 migrációt (supabase/migrations) az új projekten
 *      (supabase db push, vagy a Dashboard SQL editorában).
 *   2) Állítsd be a környezeti változókat és a GIF-forrásmappát:
 *
 *      # PowerShell (Windows):
 *      $env:SUPABASE_URL="https://<uj-projekt-ref>.supabase.co"
 *      $env:SUPABASE_SERVICE_KEY="<service_role kulcs a Settings > API-ból>"
 *      $env:GIF_SOURCE_DIR="D:\edzes gif\5° GIFs DE MUSCULACIÓN-...\5° GIFs DE MUSCULACIÓN\PECTORAL (1)"
 *
 *      node scripts/upload-exercise-gifs.mjs
 *
 * Megjegyzés: a SERVICE_ROLE kulcs titkos — soha ne kerüljön a repóba/kliensbe.
 * A szkript csak lokálisan, egyszeri feltöltésre való.
 */
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY
const SRC = process.env.GIF_SOURCE_DIR
const BUCKET = 'exercise-gifs'

if (!URL || !KEY) {
  console.error('Hiányzik a SUPABASE_URL vagy a SUPABASE_SERVICE_KEY környezeti változó.')
  process.exit(1)
}
if (!SRC || !existsSync(SRC)) {
  console.error('A GIF_SOURCE_DIR nincs beállítva vagy nem létezik:', SRC)
  process.exit(1)
}

const supabase = createClient(URL, KEY, { auth: { persistSession: false } })

const manifest = JSON.parse(
  await readFile(path.join(__dirname, 'exercise-gif-manifest.json'), 'utf8')
)

let ok = 0, skip = 0, fail = 0
for (const item of manifest) {
  const localPath = path.join(SRC, item.source_file)
  if (!existsSync(localPath)) {
    console.warn('⚠ nincs meg a forrásfájl, kihagyva:', item.source_file)
    skip++; continue
  }
  try {
    const bytes = await readFile(localPath)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(item.gif_path, bytes, {
        contentType: 'image/gif',
        upsert: true,
      })
    if (error) throw error
    ok++
    process.stdout.write(`\r✔ feltöltve: ${ok}/${manifest.length}   `)
  } catch (e) {
    fail++
    console.error('\n✗ hiba:', item.gif_path, e.message)
  }
}
console.log(`\nKész. Feltöltve: ${ok}, kihagyva: ${skip}, hiba: ${fail}.`)
