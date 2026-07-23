import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Shared, cached query for the current user's measurement exercise catalog.
 *
 * `exercises` is a GLOBAL (non-team-scoped) catalog of measurement exercise
 * types. Previously six screens each fetched it independently, so every module
 * switch re-hit Supabase. This hook centralises that fetch behind a single
 * React Query cache entry keyed by `['exercises']`, so all screens share one
 * cached catalog (see docs/review/03-teljesitmeny.md).
 *
 * The rows are scoped to the signed-in user by RLS (`created_by = auth.uid()`),
 * so the query key needs no user/team id. The query uses `select('*')` (a
 * superset of every call site's needs) ordered by `name`. Screens that only
 * want a subset (e.g. Leaderboard/TrainingLoad show `unit = 'kg'`) filter the
 * returned array client-side, still sharing this single cache entry.
 *
 * Only Measurements.jsx mutates exercises (create/update/delete via the
 * exercise-management modal). After each successful mutation it calls
 * `queryClient.invalidateQueries({ queryKey: ['exercises'] })` so every screen
 * sees the fresh catalog.
 *
 * @returns The React Query result. Destructure `data` (the exercises array),
 *   `isLoading`, `error`, and `refetch` at the call site.
 */
export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    },
  })
}
