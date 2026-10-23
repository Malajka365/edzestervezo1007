import { TeamProvider } from '../context/TeamContext'
import AppShell from '../components/shell/AppShell'

export default function Dashboard({ session }) {
  return (
    <TeamProvider session={session}>
      <AppShell session={session} />
    </TeamProvider>
  )
}
