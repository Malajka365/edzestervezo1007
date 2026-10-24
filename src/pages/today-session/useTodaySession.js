import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { usePlayers } from '../../hooks/usePlayers'
import { useAvailability } from '../../hooks/useAvailability'
import { todayIso } from '../../lib/availability'
import { pickSession, resolveRoster, buildAttendanceWrites } from '../../lib/sessionAttendance'

// A Mai edzés oldal adatai: a választott edzés (ma / következő / ?session=),
// a névsor a meglévő jelenlét-sorokból, és a mentés.
export function useTodaySession(teamId, sessionIdParam) {
  const queryClient = useQueryClient()
  const today = todayIso()

  const upcoming = useQuery({
    queryKey: ['today_sessions', teamId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('team_id', teamId)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(30)
      if (error) throw error
      return data || []
    },
    enabled: !!teamId,
  })

  // A ?session= csak a kiválasztott csapat edzését nyithatja meg; idegen vagy
  // nem létező azonosítónál az automatikus választás marad.
  const explicit = useQuery({
    queryKey: ['training_session', teamId, sessionIdParam],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', sessionIdParam)
        .eq('team_id', teamId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!teamId && !!sessionIdParam,
  })

  const pick = useMemo(() => {
    const auto = pickSession(upcoming.data || [], today)
    const s = sessionIdParam ? explicit.data : null
    if (!s) return auto
    const mode = s.date === today ? 'today' : s.date > today ? 'next' : 'past'
    return { mode, session: s, todays: mode === 'today' ? auto.todays : [] }
  }, [sessionIdParam, explicit.data, upcoming.data, today])

  const session = pick.session
  const { data: players = [], isLoading: playersLoading } = usePlayers(teamId)
  const { byPlayer, loading: availabilityLoading, error: availabilityError } = useAvailability(teamId, session?.date)

  const day = useQuery({
    queryKey: ['session_day', teamId, session?.id, session?.date],
    queryFn: async () => {
      const [sameDay, attendance] = await Promise.all([
        supabase.from('training_sessions').select('id, start_time').eq('team_id', teamId).eq('date', session.date),
        supabase.from('player_attendance').select('*').eq('team_id', teamId).eq('date', session.date),
      ])
      if (sameDay.error) throw sameDay.error
      if (attendance.error) throw attendance.error
      return { sessionsThatDay: sameDay.data || [], attendance: attendance.data || [] }
    },
    enabled: !!teamId && !!session,
  })

  const template = useQuery({
    queryKey: ['training_template', session?.template_id],
    queryFn: async () => {
      const { data } = await supabase.from('training_templates').select('id, name').eq('id', session.template_id).maybeSingle()
      return data
    },
    enabled: !!session?.template_id,
  })

  const roster = useMemo(() => {
    if (!session) return { rows: [], recorded: false }
    const attendance = day.data?.attendance || []
    return resolveRoster({
      session,
      players: [...players].sort((a, b) => (a.jersey_number ?? 999) - (b.jersey_number ?? 999)),
      linkedRows: attendance.filter((r) => r.training_session_id === session.id),
      dayRows: attendance.filter((r) => !r.training_session_id),
      sessionsThatDay: day.data?.sessionsThatDay || [session],
      availabilityByPlayer: byPlayer,
    })
  }, [session, players, day.data, byPlayer])

  // Részleges hiba (pl. a beszúrás sikerült, egy frissítés nem) után is
  // újratöltjük a napot, hogy a következő mentés ne szúrja be újra a sorokat.
  const saveAttendance = async (rows) => {
    const { inserts, updates } = buildAttendanceWrites(session, rows, teamId)
    try {
      if (inserts.length) {
        const { error } = await supabase.from('player_attendance').insert(inserts)
        if (error) throw error
      }
      for (const { id, patch } of updates) {
        const { error } = await supabase.from('player_attendance').update(patch).eq('id', id)
        if (error) throw error
      }
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['session_day', teamId] }),
        queryClient.invalidateQueries({ queryKey: ['widget'] }),
      ])
    }
  }

  const saveNotes = async (notes) => {
    const { error } = await supabase.from('training_sessions').update({ notes }).eq('id', session.id)
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: ['today_sessions', teamId] })
    await queryClient.invalidateQueries({ queryKey: ['training_session', teamId, session.id] })
  }

  // Sablon betöltése az üres tervű edzésbe (mint a szerkesztő "Sablon" gombja).
  const applyTemplate = async (template) => {
    const { error } = await supabase
      .from('training_sessions')
      .update({ template_id: template.id, type: template.type, session_data: template.template_data })
      .eq('id', session.id)
    if (error) throw error
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['today_sessions', teamId] }),
      queryClient.invalidateQueries({ queryKey: ['training_session', teamId, session.id] }),
    ])
  }

  const loading =
    upcoming.isLoading || (sessionIdParam && explicit.isLoading) || playersLoading || availabilityLoading || (!!session && day.isLoading)

  return {
    today,
    pick,
    session,
    templateName: template.data?.name ?? null,
    byPlayer,
    availabilityError: !!availabilityError,
    roster,
    loading,
    saveAttendance,
    saveNotes,
    applyTemplate,
  }
}
