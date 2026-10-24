import StatusPill from '../ui/StatusPill'
import { AVAILABILITY } from '../../lib/availability'

export default function AvailabilityPill({ status = 'available' }) {
  const meta = AVAILABILITY[status] ?? AVAILABILITY.available
  return <StatusPill status={meta.tone}>{meta.label}</StatusPill>
}
