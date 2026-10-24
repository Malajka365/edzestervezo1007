import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'
import PageHeader from '../components/ui/PageHeader'
import TeamAttendanceCalendar from '../components/TeamAttendanceCalendar'

// A csapat jelenléti naptára saját menüpontként (korábban az Egészség oldal
// "Csapat jelenlét" füle). Szerkesztés az 'attendance' joggal.
export default function Attendance() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'attendance')

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader title="Jelenlét" description="A csapat jelenléte edzésenként és naponként" />
      {selectedTeam && <TeamAttendanceCalendar teamId={selectedTeam.id} canEdit={canEdit} />}
    </div>
  )
}
