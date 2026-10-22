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
      <p className="mb-1.5 text-xs font-semibold text-muted">GIF / kép</p>
      <div className="flex items-center gap-4">
        {previewUrl && (
          <img src={previewUrl} alt="előnézet" className="w-24 h-24 object-cover rounded-lg border border-line" />
        )}
        <label className="inline-flex min-h-[36px] cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface-2 focus-within:ring-2 focus-within:ring-accent">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
          <span>{uploading ? 'Feltöltés...' : 'Fájl kiválasztása'}</span>
          <input type="file" accept="image/gif,image/png,image/jpeg" className="sr-only" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {value && <p className="text-xs text-muted mt-1 truncate">{value}</p>}
    </div>
  )
}
