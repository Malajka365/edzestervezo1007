// src/pages/dashboard-home/widgets/WeeklyAttendanceWidget.jsx
//
// Widget: "Heti jelenlét" — player_attendance e heti aránya, hiányzók.
import { useQuery } from '@tanstack/react-query'
import { UserCheck } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'
import { ATTENDANCE_STATUSES, getStatusLabel, getStatusColor } from '../../../lib/attendance'

// Monday..Sunday range containing today, as YYYY-MM-DD keys (local time).
const getCurrentWeekRange = () => {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const toKey = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return { start: toKey(monday), end: toKey(sunday) }
}

function useWeeklyAttendance(teamId) {
  return useQuery({
    queryKey: ['widget', 'weekly_attendance', teamId],
    queryFn: async () => {
      const { start, end } = getCurrentWeekRange()

      const { data, error } = await supabase
        .from('player_attendance')
        .select('id, status')
        .eq('team_id', teamId)
        .gte('date', start)
        .lte('date', end)

      if (error) throw error

      const records = data || []
      const total = records.length
      const present = records.filter((r) => r.status === 'jelen').length

      const counts = {}
      for (const r of records) {
        counts[r.status] = (counts[r.status] || 0) + 1
      }

      return {
        total,
        ratio: total > 0 ? Math.round((present / total) * 100) : null,
        counts,
      }
    },
    enabled: !!teamId,
  })
}

export default function WeeklyAttendanceWidget() {
  const { selectedTeam } = useTeams()
  const { data, isLoading, error } = useWeeklyAttendance(selectedTeam?.id)

  return (
    <WidgetCard icon={UserCheck} title="Heti jelenlét">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : error ? (
        <p className="text-sm text-red-400">Nem sikerült betölteni</p>
      ) : !data || data.total === 0 ? (
        <p className="text-sm text-slate-400">Nincs jelenléti adat ezen a héten.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-3xl font-bold text-white">{data.ratio}%</p>
          <ul className="space-y-1">
            {ATTENDANCE_STATUSES.filter((s) => data.counts[s.value]).map((s) => (
              <li key={s.value} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(s.value)}`} />
                <span className="text-slate-300">{getStatusLabel(s.value)}</span>
                <span className="text-slate-400 ml-auto">{data.counts[s.value]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  )
}
