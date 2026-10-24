import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ClipboardList } from 'lucide-react'
import Panel from '../../components/ui/Panel'
import Button from '../../components/ui/Button'
import { Field, Select } from '../../components/ui/Field'
import { supabase } from '../../lib/supabase'

// Üres tervnél (szerkesztési joggal) a csapat egyik sablonja tölthető be.
function TemplatePicker({ teamId, onApply }) {
  const [templateId, setTemplateId] = useState('')
  const [applying, setApplying] = useState(false)
  const { data: templates = [] } = useQuery({
    queryKey: ['training_templates', teamId],
    queryFn: async () => {
      const { data, error } = await supabase.from('training_templates').select('*').eq('team_id', teamId).order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!teamId,
  })

  if (templates.length === 0) return null

  const apply = async () => {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
    setApplying(true)
    try {
      await onApply(template)
      toast.success('Sablon alkalmazva')
    } catch (error) {
      console.error('Sablon alkalmazása sikertelen:', error)
      toast.error('Nem sikerült alkalmazni a sablont')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <div className="min-w-[200px] flex-1">
        <Field label="Sablon" htmlFor="session-template">
          <Select id="session-template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">Válassz sablont…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button variant="primary" disabled={!templateId} loading={applying} onClick={apply}>
        Sablon alkalmazása
      </Button>
    </div>
  )
}

// Az edzésterv a session_data alapján, típus szerint.
export default function SessionPlan({ session, canEdit = false, teamId, onApplyTemplate }) {
  const data = session?.session_data || {}
  const exercises = Array.isArray(data.exercises) ? data.exercises : []
  const ball = data.training_types || data.drills
  const tactic = data.tactical_goal || data.technical_goal

  let body
  if (exercises.length) {
    body = (
      <div className="overflow-x-auto">
        <table className="table w-full text-sm">
          <thead>
            <tr>
              <th>Gyakorlat</th>
              <th className="num">Sorozat × ism.</th>
              <th className="num">Terhelés</th>
              <th className="num">Pihenő</th>
              <th>Megjegyzés</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex, i) => (
              <tr key={ex.id ?? i}>
                <td className="font-semibold text-fg">{ex.name}</td>
                <td className="num">{ex.sets && ex.reps ? `${ex.sets} × ${ex.reps}` : '–'}</td>
                <td className="num">{ex.load || '–'}</td>
                <td className="num">{ex.rest_seconds ? `${ex.rest_seconds} mp` : '–'}</td>
                <td className="text-muted">{[ex.tempo && `tempó ${ex.tempo}`, ex.notes].filter(Boolean).join(' · ') || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  } else if (ball && (data.training_types?.length || data.drills?.length)) {
    body = (
      <div className="space-y-3 text-sm">
        {data.training_types?.length > 0 && (
          <p>
            <span className="text-muted">Edzéstípusok: </span>
            <span className="text-fg">{data.training_types.join(', ')}</span>
          </p>
        )}
        {data.drills?.length > 0 && (
          <ul className="divide-y divide-line">
            {data.drills.map((d, i) => (
              <li key={i} className="flex justify-between gap-3 py-1.5">
                <span className="text-fg">{d.name || d.title || `Gyakorlat ${i + 1}`}</span>
                {d.duration && <span className="font-mono text-[12px] text-muted">{d.duration} perc</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  } else if (tactic && (tactic.attack_details || tactic.defense_details || data.technical_goal?.attack_details)) {
    const goals = [
      ['Taktikai cél – támadás', data.tactical_goal?.attack_details],
      ['Taktikai cél – védekezés', data.tactical_goal?.defense_details],
      ['Technikai cél – támadás', data.technical_goal?.attack_details],
      ['Technikai cél – védekezés', data.technical_goal?.defense_details],
    ].filter(([, v]) => v)
    body = (
      <dl className="space-y-2 text-sm">
        {goals.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="text-fg">{value}</dd>
          </div>
        ))}
      </dl>
    )
  } else {
    body = (
      <>
        <p className="text-sm text-muted">Ehhez az edzéshez nincs terv.</p>
        {canEdit && onApplyTemplate && <TemplatePicker teamId={teamId} onApply={onApplyTemplate} />}
      </>
    )
  }

  return (
    <Panel title="Edzésterv" icon={ClipboardList}>
      {body}
    </Panel>
  )
}
