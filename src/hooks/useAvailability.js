import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { currentAvailability, todayIso } from '../lib/availability'

/**
 * A csapat elérhetőségi naplója (`player_availability`) és a belőle számolt
 * aktuális állapot. `onDate` (YYYY-MM-DD) megadásával egy múltbeli nap
 * állapotát adja (pl. egy korábbi edzéshez).
 */
export function useAvailability(teamId, onDate) {
  const queryClient = useQueryClient()
  const key = ['availability', teamId]

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_availability')
        .select('*')
        .eq('team_id', teamId)
        .order('started_on', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!teamId,
  })

  const day = onDate || todayIso()
  const byPlayer = useMemo(() => currentAvailability(entries, day), [entries, day])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key })

  const insertMutation = useMutation({
    mutationFn: async ({ playerId, status, started_on, expected_return, note }) => {
      const { error } = await supabase.from('player_availability').insert({
        team_id: teamId,
        player_id: playerId,
        status,
        started_on: started_on || todayIso(),
        expected_return: expected_return || null,
        note: note || null,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }) => {
      const { error } = await supabase.from('player_availability').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('player_availability').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return {
    entries,
    byPlayer,
    // Betöltési hibánál a byPlayer üres (mindenki "bevethető" lenne): a hívó
    // ezt jelezze, ne állítsa, hogy mindenki bevethető.
    error,
    loading: isLoading,
    setStatus: insertMutation.mutateAsync,
    updateEntry: (id, patch) => updateMutation.mutateAsync({ id, patch }),
    deleteEntry: deleteMutation.mutateAsync,
  }
}
