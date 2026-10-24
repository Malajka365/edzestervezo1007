// src/pages/dashboard-home/widgets/WeeklyAttendanceWidget.jsx
//
// Widget: "Heti jelenlét" — jelenléti arány a választott időszakra
// (period: 'week' | 'month' | 'season'), magasabb méretben a legtöbbet hiányzókkal.
import { useQuery } from '@tanstack/react-query'
import { UserCheck } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { supabase } from '../../../lib/supabase'
import { todayIso } from '../../../lib/availability'
import { attendanceSummary, periodStart } from '../../../lib/widgetData'
import LoadingSpinner from '../../../components/LoadingSpinner'

const PERIOD_TEXT = { week: 'ezen a héten', month: 'ebben a hónapban', season: 'a szezonban' }

export default function WeeklyAttendanceWidget({ settings = {}, size = { w: 1, h: 1 } }) {
  const { selectedTeam } = useTeams()
  const period = settings.period || 'week'
  const { data, isLoading, error } = useQuery({
    queryKey: ['widget', 'weekly_attendance', selectedTeam?.id, period],
    queryFn: async () => {
      const today = todayIso()
      const { data, error } = await supabase
        .from('player_attendance')
        .select('player_id, status, players(name)')
        .eq('team_id', selectedTeam.id)
        .gte('date', periodStart(period, today))
        .lte('date', today)
      if (error) throw error
      return attendanceSummary(data || [])
    },
    enabled: !!selectedTeam?.id,
  })

  return (
    <WidgetCard icon={UserCheck} title="Heti jelenlét">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : error ? (
        <p className="text-sm text-bad">Nem sikerült betölteni</p>
      ) : !data || data.total === 0 ? (
        <p className="text-sm text-muted">Nincs jelenléti adat {PERIOD_TEXT[period]}.</p>
      ) : (
        <div className="space-y-2">
          <p className="font-display text-[34px] font-bold leading-none text-fg">
            {data.rate}
            <span className="text-base text-muted"> %</span>
          </p>
          <div className="h-1.5 rounded-full bg-surface-2">
            <div className="h-1.5 rounded-full bg-accent" style={{ width: `${data.rate}%` }} />
          </div>
          {data.mostAbsent.length > 0 &&
            (size.h > 1 ? (
              <ul className="space-y-1 pt-1 text-sm">
                {data.mostAbsent.map((p) => (
                  <li key={p.playerId} className="flex justify-between gap-2">
                    <span className="truncate text-fg">{p.name}</span>
                    <span className="text-muted">{p.absent} hiányzás</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="truncate text-[12px] text-muted">Legtöbbet hiányzott: {data.mostAbsent[0].name}</p>
            ))}
        </div>
      )}
    </WidgetCard>
  )
}
