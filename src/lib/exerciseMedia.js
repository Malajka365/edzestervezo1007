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
