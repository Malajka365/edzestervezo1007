// src/pages/dashboard-home/widgets/RehabStatusWidget.jsx
//
// Widget: "Rehab-státusz" — aktív anamnézisek száma, legfrissebbek.
import { useQuery } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'

function useRehabStatus(teamId) {
  return useQuery({
    queryKey: ['widget', 'rehab_status', teamId],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('player_anamnesis')
        .select('id, player_id, admission_date, players(name)', { count: 'exact' })
        .eq('team_id', teamId)
        .order('admission_date', { ascending: false })
        .limit(3)

      if (error) throw error

      return {
        total: count ?? (data || []).length,
        recent: data || [],
      }
    },
    enabled: !!teamId,
  })
}

export default function RehabStatusWidget() {
  const { selectedTeam } = useTeams()
  const { data, isLoading, error } = useRehabStatus(selectedTeam?.id)

  return (
    <WidgetCard icon={Heart} title="Rehab-státusz">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : error ? (
        <p className="text-sm text-red-400">Nem sikerült betölteni</p>
      ) : !data || data.total === 0 ? (
        <p className="text-sm text-slate-400">Nincs aktív rehabilitációs eset.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            <span className="text-2xl font-bold text-white">{data.total}</span>{' '}
            <span className="text-slate-400">anamnézis rögzítve</span>
          </p>
          <ul className="space-y-1">
            {data.recent.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-slate-300 truncate">{item.players?.name || 'N/A'}</span>
                <span className="text-slate-400 flex-shrink-0">
                  {item.admission_date
                    ? new Date(item.admission_date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
                    : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  )
}
