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
