import { supabase } from './supabase'

// A gyakorlat-GIF-ek a publikus 'exercise-gifs' Storage bucketben vannak.
// A training_exercises.gif_path a bucketen belüli útvonalat tárolja
// (pl. "mell/bench-press.gif"), így a projekt-URL sehol nincs beégetve.
const BUCKET = 'exercise-gifs'

export function exerciseGifUrl(gifPath) {
  if (!gifPath) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(gifPath)
  return data?.publicUrl || null
}

// Kis, statikus thumbnail a kártyákhoz: a GIF első kockájából készült WEBP a
// bucket 'thumbs/' prefixében (pl. mell/bench-press.gif -> thumbs/mell/bench-press.webp).
// A kártya csak ezt tölti: ha nincs gif_path (null) vagy a thumb hiányzik, a UI
// semleges ikont mutat — a nagy GIF csak a részletnézetben töltődik.
export function exerciseThumbUrl(gifPath) {
  if (!gifPath) return null
  const webp = gifPath.replace(/\.[^.]+$/, '.webp')
  return exerciseGifUrl(`thumbs/${webp}`)
}

const MAX_BYTES = 8 * 1024 * 1024
// A támogatott MIME-ok és a hozzájuk tartozó kiterjesztés EGY forrásból jön: ha
// két külön lista lenne, elcsúszhatnának, és az upload `undefined` kiterjesztéssel
// építené az útvonalat.
const EXT_BY_MIME = { 'image/gif': 'gif', 'image/png': 'png', 'image/jpeg': 'jpg' }
const ALLOWED_MIME = Object.keys(EXT_BY_MIME)

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
