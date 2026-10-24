// src/pages/dashboard-home/widgets/UpcomingWeekWidget.jsx
//
// Widget: "Következő napok" — edzések és mérkőzések időrendben.
// Beállítás: days ('7' | '14'), types ('all' | 'match' | 'train').
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Dumbbell, Medal } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { supabase } from '../../../lib/supabase'
import { todayIso } from '../../../lib/availability'
import { filterAgendaByType } from '../../../lib/widgetData'
import LoadingSpinner from '../../../components/LoadingSpinner'

const TRAINING_TYPE_LABELS = {
  gym: 'Konditerem',
  ball: 'Labdás edzés',
  tactic: 'Taktika & Technika',
  other: 'Egyéb',
}

const formatShortDate = (dateStr) =>
  new Date(`${dateStr}T12:00:00`).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', weekday: 'short' })

function useUpcoming(teamId, days) {
  return useQuery({
    queryKey: ['widget', 'upcoming_week', teamId, days],
    queryFn: async () => {
      const start = todayIso()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + days)
      const end = todayIso(endDate)

      const [sessionsRes, matchesRes] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('id, date, start_time, type, location')
          .eq('team_id', teamId)
          .gte('date', start)
          .lt('date', end)
          .order('date', { ascending: true }),
        supabase
          .from('matches')
          .select('id, date, time, opponent')
          .eq('team_id', teamId)
          .gte('date', start)
          .lt('date', end)
          .order('date', { ascending: true }),
      ])
      if (sessionsRes.error) throw sessionsRes.error
      if (matchesRes.error) throw matchesRes.error

      const sessionItems = (sessionsRes.data || []).map((s) => ({
        id: `session-${s.id}`,
        date: s.date,
        time: s.start_time || '',
        kind: 'session',
        title: TRAINING_TYPE_LABELS[s.type] || 'Edzés',
      }))
      const matchItems = (matchesRes.data || []).map((m) => ({
        id: `match-${m.id}`,
        date: m.date,
        time: m.time || '',
        kind: 'match',
        title: `vs ${m.opponent || '(Ellenfél nincs megadva)'}`,
      }))
      return [...sessionItems, ...matchItems].sort(
        (a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')
      )
    },
    enabled: !!teamId,
  })
}

export default function UpcomingWeekWidget({ settings = {}, size = { w: 2, h: 2 } }) {
  const { selectedTeam } = useTeams()
  const days = parseInt(settings.days || '7', 10)
  const { data: items, isLoading, error } = useUpcoming(selectedTeam?.id, days)
  const shown = filterAgendaByType(items || [], settings.types || 'all').slice(0, size.h >= 2 ? 12 : 5)

  return (
    <WidgetCard icon={CalendarDays} title="Következő napok">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : error ? (
        <p className="text-sm text-bad">Nem sikerült betölteni</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">Nincs esemény a következő {days} napban.</p>
      ) : (
        <ul className="space-y-2">
          {shown.map((item) => {
            const Icon = item.kind === 'match' ? Medal : Dumbbell
            return (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 flex-shrink-0 text-muted" aria-hidden="true" />
                <span className="flex-shrink-0 text-muted">{formatShortDate(item.date)}</span>
                {item.time && <span className="flex-shrink-0 font-mono text-[12px] text-muted">{item.time.slice(0, 5)}</span>}
                <span className="truncate text-fg">{item.title}</span>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}
