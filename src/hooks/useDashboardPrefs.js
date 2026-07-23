import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * A bejelentkezett felhasználó dashboard widget-beállításai az adott csapatra.
 *
 * A `user_dashboard_prefs` táblából (PK: user_id, team_id) tölti be a sort
 * `maybeSingle`-lel (nincs sor => null). A `prefs` a `widgets` tömb
 * (`[{key, visible}, ...]`) vagy null, ha még nincs mentett beállítás — ilyenkor
 * a hívó szerepkör-alapú defaultra esik vissza (getDefaultWidgets).
 *
 * A `savePrefs(widgets)` upsert-el ment (onConflict 'user_id,team_id'), majd
 * invalidálja a lekérdezést, hogy a friss sor újratöltődjön.
 *
 * @param {string|undefined} userId - a bejelentkezett felhasználó id-ja.
 * @param {string|undefined} teamId - a kiválasztott csapat id-ja.
 * @returns {{ prefs: Array|null, loading: boolean, savePrefs: (widgets:Array)=>Promise }}
 */
export function useDashboardPrefs(userId, teamId) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard_prefs', userId, teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_dashboard_prefs')
        .select('widgets')
        .eq('user_id', userId)
        .eq('team_id', teamId)
        .maybeSingle()

      if (error) throw error
      // Nincs sor => null; egyébként a widgets tömb (null-védetten).
      return data ? data.widgets ?? [] : null
    },
    enabled: !!userId && !!teamId,
  })

  const mutation = useMutation({
    mutationFn: async (widgets) => {
      const { error } = await supabase
        .from('user_dashboard_prefs')
        .upsert(
          { user_id: userId, team_id: teamId, widgets, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,team_id' }
        )

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_prefs', userId, teamId] })
    },
  })

  return {
    prefs: data ?? null,
    loading: isLoading,
    savePrefs: mutation.mutateAsync,
  }
}
