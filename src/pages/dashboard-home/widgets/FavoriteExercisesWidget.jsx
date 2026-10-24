// Widget: "Kedvenc gyakorlatok" — a gyakorlattárban csillagozott gyakorlatok.
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'

export default function FavoriteExercisesWidget() {
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['widget', 'favorite_exercises'],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth?.user?.id
      if (!userId) return []
      const { data: favs, error } = await supabase
        .from('user_exercise_favorites')
        .select('exercise_id')
        .eq('user_id', userId)
      if (error) throw error
      const ids = (favs || []).map((f) => f.exercise_id)
      if (ids.length === 0) return []
      const { data, error: exError } = await supabase
        .from('training_exercises')
        .select('id, name')
        .in('id', ids)
        .order('name')
      if (exError) throw exError
      return data || []
    },
  })

  return (
    <WidgetCard icon={Star} title="Kedvenc gyakorlatok">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : favorites.length === 0 ? (
        <p className="text-sm text-muted">A gyakorlattárban a csillaggal jelölheted a kedvenceidet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {favorites.map((ex) => (
            <li key={ex.id} className="py-1.5">
              <Link to={`/dashboard/gyakorlatok?exercise=${ex.id}`} className="flex items-center gap-2 text-sm text-fg hover:text-accent">
                <Star className="h-3.5 w-3.5 fill-current text-warn" aria-hidden="true" />
                <span className="truncate">{ex.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
