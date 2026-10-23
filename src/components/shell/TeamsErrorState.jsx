import { AlertTriangle } from 'lucide-react'
import EmptyState from '../ui/EmptyState'

// A csapatlista lekérése hibára futott: nem a "hozd létre az első csapatod" üzenetet
// mutatjuk (a felhasználónak lehetnek csapatai), hanem újrapróbálási lehetőséget.
export default function TeamsErrorState({ onRetry }) {
  return (
    <div role="alert" className="mx-auto flex min-h-full max-w-xl items-center p-6">
      <div className="w-full">
        <EmptyState
          icon={AlertTriangle}
          title="Nem sikerült betölteni a csapatokat."
          description="Ellenőrizd az internetkapcsolatot, majd próbáld újra."
          actionLabel="Újrapróbálás"
          onAction={onRetry}
        />
      </div>
    </div>
  )
}
