import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toStored } from '../lib/dashboardLayout'

/**
 * A bejelentkezett felhasználó dashboard widget-beállításai az adott csapatra.
 *
 * A `user_dashboard_prefs` táblából (PK: user_id, team_id) tölti be a sort
 * `maybeSingle`-lel (nincs sor => null). A `prefs` a `widgets` tömb
 * (`[{key, visible}, ...]`) vagy null, ha még nincs mentett beállítás — ilyenkor
 * a Kezdőlap a szerepkör alap-elrendezésére esik vissza (dashboardLayout.normalizeLayout).
 *
 * A `savePrefs(widgets)` upsert-el ment (onConflict 'user_id,team_id'), majd
 * invalidálja a lekérdezést, hogy a friss sor újratöltődjön.
 *
 * @param {string|undefined} userId - a bejelentkezett felhasználó id-ja.
 * @param {string|undefined} teamId - a kiválasztott csapat id-ja.
 * @returns {{ prefs: Array|null, loading: boolean, savePrefs: (widgets:Array, teamId?:string)=>Promise }}
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
    mutationFn: async ({ widgets, teamId: targetTeamId }) => {
      const { error } = await supabase
        .from('user_dashboard_prefs')
        .upsert(
          { user_id: userId, team_id: targetTeamId, widgets: toStored(widgets), updated_at: new Date().toISOString() },
          { onConflict: 'user_id,team_id' }
        )

      if (error) throw error
    },
    onSuccess: (_data, { teamId: targetTeamId }) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard_prefs', userId, targetTeamId] })
    },
  })

  return {
    prefs: data ?? null,
    loading: isLoading,
    // A csapat a mentés ütemezésekor rögzül: egy késleltetett mentés csapatváltás
    // után is a régi csapathoz kerül.
    savePrefs: (widgets, targetTeamId = teamId) => mutation.mutateAsync({ widgets, teamId: targetTeamId }),
  }
}
