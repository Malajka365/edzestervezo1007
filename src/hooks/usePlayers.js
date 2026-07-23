import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Shared, cached query for a team's players.
 *
 * Previously seven screens each fetched `players` independently, so every
 * module switch re-hit Supabase. This hook centralises that fetch behind a
 * single React Query cache entry keyed by `['players', teamId]`, so all
 * screens share one cached roster (see docs/review/03-teljesitmeny.md, KT3).
 *
 * The query uses `select('*')` (a superset of every call site's needs) ordered
 * by `name`. Screens that previously displayed players ordered by jersey number
 * (Teams, TrainingLoad) sort the returned array client-side to preserve their
 * ordering while still sharing this single cache entry.
 *
 * After any player create/update/delete (only Teams.jsx mutates players), call
 * `queryClient.invalidateQueries({ queryKey: ['players', teamId] })` so every
 * screen sees the fresh roster.
 *
 * @param {string|undefined} teamId - The selected team's id. The query is
 *   disabled while this is falsy.
 * @returns The React Query result. Destructure `data` (the players array),
 *   `isLoading`, `error`, and `refetch` at the call site.
 */
export function usePlayers(teamId) {
  return useQuery({
    queryKey: ['players', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: !!teamId,
  })
}
