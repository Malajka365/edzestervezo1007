import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, X, File, FileText, Image as ImageIcon, Trash2 } from 'lucide-react'

export default function DocumentUpload({ player, teamId, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'egyéb',
    tags: '',
    document_date: new Date().toISOString().split('T')[0],
  })
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Ellenőrizzük a fájl típust
      const allowedTypes = ['image/jpeg', 'image/jpg', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        alert('Csak JPEG/JPG és PDF fájlok tölthetők fel!')
        return
      }

      // Ellenőrizzük a fájl méretét (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('A fájl mérete maximum 10MB lehet!')
        return
      }

      setSelectedFile(file)
      setShowForm(true)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    try {
      // 1. Fájl feltöltése Supabase Storage-ba
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${player.id}_${Date.now()}.${fileExt}`
      const filePath = `${teamId}/${player.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('player-documents')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // 2. Metadata mentése az adatbázisba (filePath tárolása, nem URL)
      const { error: dbError } = await supabase
        .from('player_documents')
        .insert({
          player_id: player.id,
          team_id: teamId,
          title: formData.title,
          description: formData.description,
          file_type: fileExt.toUpperCase(),
          file_url: filePath, // Csak az elérési út, nem a teljes URL
          file_size: selectedFile.size,
          tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
          category: formData.category,
          document_date: formData.document_date,
        })

      if (dbError) throw dbError

      alert('✅ Dokumentum sikeresen feltöltve!')
      setShowForm(false)
      setSelectedFile(null)
      setFormData({
        title: '',
        description: '',
        category: 'egyéb',
        tags: '',
        document_date: new Date().toISOString().split('T')[0],
      })
      onUploaded?.()
    } catch (error) {
      console.error('Error uploading document:', error)
      alert('❌ Hiba történt a feltöltés során!')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {!showForm ? (
        <label className="block cursor-pointer">
          <div className="card hover:border-primary-500 transition-all duration-200 text-center py-8">
            <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Dokumentum feltöltése
            </h3>
            <p className="text-sm text-slate-400">
              JPEG, JPG vagy PDF (max 10MB)
            </p>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/jpg,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Dokumentum adatok</h3>
            <button
              onClick={() => {
                setShowForm(false)
                setSelectedFile(null)
              }}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            {/* Selected File Info */}
            <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
              {selectedFile.type.startsWith('image/') ? (
                <ImageIcon className="w-8 h-8 text-blue-400" />
              ) : (
                <FileText className="w-8 h-8 text-red-400" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Cím *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="pl. MRI lelet 2025.01"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Leírás
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                rows="3"
                placeholder="Rövid leírás a dokumentumról..."
              />
            </div>

            {/* Category and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Kategória
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="anamnézis">Amnézis</option>
                  <option value="lelet">Lelet</option>
                  <option value="rtg">RTG</option>
                  <option value="mri">MRI</option>
                  <option value="egyéb">Egyéb</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Dátum
                </label>
                <input
                  type="date"
                  value={formData.document_date}
                  onChange={(e) => setFormData({...formData, document_date: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Címkék
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                placeholder="pl. térd, műtét, kontroll (vesszővel elválasztva)"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setSelectedFile(null)
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Feltöltés...' : 'Feltöltés'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
