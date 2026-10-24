import { Link } from 'react-router-dom'
import { ArrowUpRight, Pencil, Trash2, MapPin, Clock } from 'lucide-react'
import Drawer from '../../components/ui/Drawer'
import Button from '../../components/ui/Button'
import { getSessionType } from './sessionTypes'

const longDate = (iso) =>
  new Intl.DateTimeFormat('hu-HU', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${iso}T12:00:00`))

// Egy meglévő edzés műveletei a naptárban: megnyitás a Mai edzés oldalon,
// szerkesztés, törlés (jog szerint).
export default function SessionActions({ session, canEdit, onClose, onEdit, onDelete }) {
  const type = session ? getSessionType(session.type) : null
  return (
    <Drawer open={!!session} onClose={onClose} title={session ? `${type.label} · ${longDate(session.date)}` : ''}>
      {session && (
        <div className="space-y-4">
          <div className="space-y-1 text-sm text-muted">
            {session.start_time && (
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {session.start_time.slice(0, 5)}
                {session.end_time && `–${session.end_time.slice(0, 5)}`}
              </p>
            )}
            {session.location && (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {session.location}
              </p>
            )}
          </div>
          <Link
            to={`/dashboard/mai-edzes?session=${session.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-[9px] border border-accent bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            Megnyitás a Mai edzés oldalon
          </Link>
          {canEdit && (
            <div className="flex gap-2">
              <Button className="flex-1" icon={Pencil} onClick={() => onEdit(session)}>
                Szerkesztés
              </Button>
              <Button className="flex-1" variant="danger" icon={Trash2} onClick={() => onDelete(session)}>
                Törlés
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
