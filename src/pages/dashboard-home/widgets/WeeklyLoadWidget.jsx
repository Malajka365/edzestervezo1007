// Widget: "Heti terhelés" — az aktuális hét tervezett terhelése napokra bontva
// (a naptár heti nézetében rögzített keringési + mechanikai terhelés, 2–10).
// A tényleges terhelés (sRPE) a 4. szakaszban kerül mellé.
import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { supabase } from '../../../lib/supabase'
import { todayIso } from '../../../lib/availability'
import { periodStart } from '../../../lib/widgetData'
import LoadingSpinner from '../../../components/LoadingSpinner'

const DAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']

export default function WeeklyLoadWidget() {
  const { selectedTeam } = useTeams()
  const today = todayIso()
  const monday = periodStart('week', today)

  const { data: loads = [], isLoading } = useQuery({
    queryKey: ['widget', 'weekly_load', selectedTeam?.id, monday],
    queryFn: async () => {
      const end = new Date(`${monday}T12:00:00`)
      end.setDate(end.getDate() + 6)
      const { data, error } = await supabase
        .from('training_load_factors')
        .select('date, circulation_load, mechanical_load')
        .eq('team_id', selectedTeam.id)
        .gte('date', monday)
        .lte('date', todayIso(end))
      if (error) throw error
      const byDate = new Map((data || []).map((r) => [r.date, (r.circulation_load || 0) + (r.mechanical_load || 0)]))
      return DAYS.map((label, i) => {
        const d = new Date(`${monday}T12:00:00`)
        d.setDate(d.getDate() + i)
        const key = todayIso(d)
        return { label, date: key, value: byDate.get(key) ?? 0 }
      })
    },
    enabled: !!selectedTeam?.id,
  })

  return (
    <WidgetCard icon={BarChart3} title="Heti terhelés">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : loads.every((d) => !d.value) ? (
        <p className="text-sm text-muted">Erre a hétre nincs tervezett terhelés a naptárban.</p>
      ) : (
        <div className="flex h-full min-h-[70px] items-end gap-1.5" role="img" aria-label="Heti tervezett terhelés">
          {loads.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div
                className={`w-full max-w-[28px] rounded-t-[4px] ${d.date === today ? 'bg-accent' : 'bg-surface-3'}`}
                style={{ height: `${Math.max(4, d.value * 10)}%` }}
                title={`${d.label}: ${d.value}/10`}
              />
              <span className="font-mono text-[10px] text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
