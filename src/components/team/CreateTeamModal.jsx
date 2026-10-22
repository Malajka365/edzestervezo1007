import { useState } from 'react'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTeams } from '../../context/TeamContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { Field, Input, Textarea } from '../ui/Field'

const EMPTY_FORM = { name: '', sport: '', description: '' }
const FORM_ID = 'create-team-form'

export default function CreateTeamModal({ open, onClose }) {
  const { createTeam } = useTeams()
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const handleClose = () => {
    setForm(EMPTY_FORM)
    onClose?.()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await createTeam(form)
      if (result.success) {
        handleClose()
      } else {
        toast.error('Hiba történt a csapat létrehozásakor')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Új csapat"
      size="sm"
      footer={
        <>
          <Button onClick={handleClose}>Mégse</Button>
          <Button type="submit" form={FORM_ID} variant="primary" icon={Save} loading={submitting}>
            Létrehozás
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="grid gap-4">
        <Field label="Csapat neve *" htmlFor="team-name">
          <Input
            id="team-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="pl. U19 Férfi"
          />
        </Field>
        <Field label="Sportág" htmlFor="team-sport">
          <Input
            id="team-sport"
            type="text"
            value={form.sport}
            onChange={(e) => setForm({ ...form, sport: e.target.value })}
            placeholder="pl. Labdarúgás, Kézilabda"
          />
        </Field>
        <Field label="Leírás" htmlFor="team-description">
          <Textarea
            id="team-description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="resize-none"
            placeholder="Rövid leírás a csapatról..."
          />
        </Field>
      </form>
    </Modal>
  )
}
