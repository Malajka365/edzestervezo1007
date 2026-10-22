import { useState } from 'react'
import { Users } from 'lucide-react'
import EmptyState from '../ui/EmptyState'
import CreateTeamModal from '../team/CreateTeamModal'

export default function NoTeamState() {
  const [creating, setCreating] = useState(false)

  return (
    <div className="mx-auto flex min-h-full max-w-xl items-center p-6">
      <div className="w-full">
        <EmptyState
          icon={Users}
          title="Hozd létre az első csapatodat"
          description="Vagy kérj meghívót az edződtől, és nyisd meg a kapott linket."
          actionLabel="Új csapat létrehozása"
          onAction={() => setCreating(true)}
        />
      </div>
      <CreateTeamModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
