// Widget: "Teendők" — ami figyelmet kér (szabályok: src/lib/todos.js).
// Beállítás: src ('all' | 'perf' | 'health').
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, AlertTriangle, HeartPulse, Info } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { usePlayers } from '../../../hooks/usePlayers'
import { useAvailability } from '../../../hooks/useAvailability'
import { supabase } from '../../../lib/supabase'
import { todayIso } from '../../../lib/availability'
import { computeTodos } from '../../../lib/todos'
import LoadingSpinner from '../../../components/LoadingSpinner'

const ICON = { warn: AlertTriangle, bad: HeartPulse, info: Info }
const TONE = { warn: 'text-warn', bad: 'text-bad', info: 'text-accent' }

export default function TodosWidget({ settings = {} }) {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const teamId = selectedTeam?.id
  const { data: players = [], isLoading: playersLoading } = usePlayers(teamId)
  const { byPlayer, loading: availabilityLoading } = useAvailability(teamId)
  const today = todayIso()

  const { data, isLoading } = useQuery({
    queryKey: ['widget', 'todos', teamId, today],
    queryFn: async () => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const from = todayIso(weekAgo)
      const [measurements, sessions, attendance, seasons] = await Promise.all([
        supabase.from('measurements').select('player_id, measured_at').eq('team_id', teamId).order('measured_at', { ascending: false }).limit(1000),
        supabase.from('training_sessions').select('id, date').eq('team_id', teamId).gte('date', from).lt('date', today),
        supabase.from('player_attendance').select('date').eq('team_id', teamId).gte('date', from).lt('date', today),
        supabase.from('training_seasons').select('name, start_date, end_date').eq('team_id', teamId).order('start_date', { ascending: false }),
      ])
      const lastMeasuredByPlayer = new Map()
      for (const m of measurements.data || []) {
        if (!lastMeasuredByPlayer.has(m.player_id)) lastMeasuredByPlayer.set(m.player_id, m.measured_at)
      }
      const seasonList = seasons.data || []
      const season =
        seasonList.find((s) => s.start_date <= today && today <= s.end_date) ||
        seasonList.find((s) => s.start_date > today) ||
        null
      return {
        lastMeasuredByPlayer,
        sessionsLast7: sessions.data || [],
        attendanceDates: new Set((attendance.data || []).map((r) => r.date)),
        season,
      }
    },
    enabled: !!teamId,
  })

  const todos = data
    ? computeTodos({ today, perms: currentUserPermissions, players, availabilityByPlayer: byPlayer, src: settings.src || 'all', ...data })
    : []

  return (
    <WidgetCard icon={Bell} title="Teendők">
      {isLoading || playersLoading || availabilityLoading ? (
        <LoadingSpinner size="xs" />
      ) : todos.length === 0 ? (
        <p className="text-sm text-muted">Minden rendben.</p>
      ) : (
        <ul className="divide-y divide-line">
          {todos.map((t) => {
            const Icon = ICON[t.tone] ?? Info
            return (
              <li key={t.id} className="py-1.5">
                <Link to={t.to} className="flex items-start gap-2 rounded-[6px] text-sm hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  <Icon className={`mt-0.5 h-4 w-4 flex-none ${TONE[t.tone]}`} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="text-fg">{t.text}</span>
                    {t.detail && <span className="block truncate text-[12px] text-muted">{t.detail}</span>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}
