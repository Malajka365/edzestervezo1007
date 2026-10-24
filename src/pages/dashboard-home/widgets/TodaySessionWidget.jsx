// Widget: "Mai edzés" — a mai (vagy következő) edzés lényege; a részletek és
// a jelenlét-felvétel a Mai edzés oldalon. Beállítás: detail ('blocks' | 'compact').
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Timer, MapPin, CheckSquare, ArrowUpRight } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { supabase } from '../../../lib/supabase'
import { todayIso } from '../../../lib/availability'
import { pickSession } from '../../../lib/sessionAttendance'
import { getSessionType } from '../../calendar/sessionTypes'
import LoadingSpinner from '../../../components/LoadingSpinner'

const hm = (t) => (t ? String(t).slice(0, 5) : null)

function blocksOf(session) {
  const d = session?.session_data || {}
  if (Array.isArray(d.exercises) && d.exercises.length) {
    return d.exercises.map((e) => (e.sets && e.reps ? `${e.name} ${e.sets}×${e.reps}` : e.name))
  }
  if (Array.isArray(d.training_types)) return d.training_types
  return []
}

export default function TodaySessionWidget({ settings = {}, size = { w: 2, h: 2 } }) {
  const { selectedTeam } = useTeams()
  const today = todayIso()
  const { data: pick, isLoading, error } = useQuery({
    queryKey: ['widget', 'today_session', selectedTeam?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('id, date, start_time, end_time, type, location, session_data')
        .eq('team_id', selectedTeam.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(20)
      if (error) throw error
      return pickSession(data || [], today)
    },
    enabled: !!selectedTeam?.id,
  })

  const session = pick?.session
  const detailsTo = session ? `/dashboard/mai-edzes?session=${session.id}` : '/dashboard/mai-edzes'
  const blocks = settings.detail === 'compact' || size.w < 2 ? [] : blocksOf(session).slice(0, 6)

  return (
    <WidgetCard icon={Timer} title="Mai edzés">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : error ? (
        <p className="text-sm text-bad">Nem sikerült betölteni</p>
      ) : !session ? (
        <p className="text-sm text-muted">Nincs közelgő edzés a naptárban.</p>
      ) : (
        <div className="space-y-2">
          {pick.mode === 'next' && (
            <p className="text-[12px] text-muted">
              Ma nincs edzés · a következő:{' '}
              {new Date(`${session.date}T12:00:00`).toLocaleDateString('hu-HU', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          )}
          <div className="flex items-center gap-3">
            <span className="font-display text-[34px] font-bold leading-none text-fg">{hm(session.start_time) ?? '–'}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">{getSessionType(session.type).label}</p>
              {session.location && (
                <p className="flex items-center gap-1 truncate text-[12.5px] text-muted">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {session.location}
                </p>
              )}
            </div>
          </div>
          {blocks.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {blocks.map((b, i) => (
                <span key={i} className="rounded-[6px] border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg">
                  {b}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {pick.mode === 'today' && (
              <Link
                to={detailsTo}
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover"
              >
                <CheckSquare className="h-4 w-4" aria-hidden="true" />
                Jelenlét
              </Link>
            )}
            <Link
              to={detailsTo}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-line px-3 py-1.5 text-[13px] font-semibold text-fg hover:bg-surface-2"
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              Részletek
            </Link>
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
