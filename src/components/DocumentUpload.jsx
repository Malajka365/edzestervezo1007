import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, FileText, Image as ImageIcon } from 'lucide-react'
import Button from './ui/Button'
import Modal from './ui/Modal'
import { Field, Input, Select, Textarea } from './ui/Field'
import toast from 'react-hot-toast'

const UPLOAD_FORM_ID = 'document-upload-form'

export default function DocumentUpload({ player, teamId, onUploaded, canEdit = true }) {
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
    // A mező kiürítése, hogy ugyanaz a fájl Mégse után újra kiválasztható legyen.
    e.target.value = ''
    if (file) {
      // Ellenőrizzük a fájl típust
      const allowedTypes = ['image/jpeg', 'image/jpg', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Csak JPEG/JPG és PDF fájlok tölthetők fel!')
        return
      }

      // Ellenőrizzük a fájl méretét (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('A fájl mérete maximum 10MB lehet!')
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

      toast.success('Dokumentum sikeresen feltöltve!')
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
      toast.error('Hiba történt a feltöltés során!')
    } finally {
      setUploading(false)
    }
  }

  if (!canEdit) {
    return null
  }

  const closeForm = () => {
    setShowForm(false)
    setSelectedFile(null)
  }

  return (
    <div>
      <label className="block cursor-pointer rounded-[14px] border border-line bg-surface px-4 py-8 text-center transition-colors hover:border-accent focus-within:ring-2 focus-within:ring-accent">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
          <Upload className="h-8 w-8 text-accent" aria-hidden="true" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-fg">Dokumentum feltöltése</h3>
        <p className="text-sm text-muted">JPEG, JPG vagy PDF (max 10MB)</p>
        <input
          type="file"
          accept="image/jpeg,image/jpg,application/pdf"
          onChange={handleFileSelect}
          className="sr-only"
        />
      </label>

      <Modal
        open={showForm && !!selectedFile}
        onClose={closeForm}
        title="Dokumentum adatok"
        footer={
          <>
            <Button onClick={closeForm}>Mégse</Button>
            <Button
              type="submit"
              form={UPLOAD_FORM_ID}
              variant="primary"
              loading={uploading}
            >
              {uploading ? 'Feltöltés...' : 'Feltöltés'}
            </Button>
          </>
        }
      >
        {selectedFile && (
          <form id={UPLOAD_FORM_ID} onSubmit={handleUpload} className="space-y-4">
            {/* Selected File Info */}
            <div className="flex items-center gap-3 rounded-[10px] bg-surface-2 p-3">
              {selectedFile.type.startsWith('image/') ? (
                <ImageIcon className="h-8 w-8 flex-shrink-0 text-accent" aria-hidden="true" />
              ) : (
                <FileText className="h-8 w-8 flex-shrink-0 text-bad" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg">{selectedFile.name}</p>
                <p className="text-sm text-muted">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            <Field label="Cím *" htmlFor="doc-title">
              <Input
                id="doc-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="pl. MRI lelet 2025.01"
                required
              />
            </Field>

            <Field label="Leírás" htmlFor="doc-description">
              <Textarea
                id="doc-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                placeholder="Rövid leírás a dokumentumról..."
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Kategória" htmlFor="doc-category">
                <Select
                  id="doc-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="anamnézis">Anamnézis</option>
                  <option value="lelet">Lelet</option>
                  <option value="rtg">RTG</option>
                  <option value="mri">MRI</option>
                  <option value="egyéb">Egyéb</option>
                </Select>
              </Field>

              <Field label="Dátum" htmlFor="doc-date">
                <Input
                  id="doc-date"
                  type="date"
                  value={formData.document_date}
                  onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Címkék" htmlFor="doc-tags">
              <Input
                id="doc-tags"
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="pl. térd, műtét, kontroll (vesszővel elválasztva)"
              />
            </Field>
          </form>
        )}
      </Modal>
    </div>
  )
}
