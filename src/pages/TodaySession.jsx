import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Timer, Pencil, CalendarDays, ShieldCheck, StickyNote } from 'lucide-react'
import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'
import { AVAILABILITY, availabilityOf } from '../lib/availability'
import { canRecordAttendance } from '../lib/sessionAttendance'
import { getSessionType } from './calendar/sessionTypes'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import Tabs from '../components/ui/Tabs'
import EmptyState from '../components/ui/EmptyState'
import { Textarea } from '../components/ui/Field'
import LoadingSpinner from '../components/LoadingSpinner'
import AvailabilityPill from '../components/availability/AvailabilityPill'
import TrainingSessionModal from '../components/TrainingSessionModal'
import SessionPlan from './today-session/SessionPlan'
import AttendanceRoster from './today-session/AttendanceRoster'
import { useTodaySession } from './today-session/useTodaySession'

const TONE_TEXT = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }
const hm = (t) => (t ? String(t).slice(0, 5) : null)
const longDate = (iso) =>
  new Intl.DateTimeFormat('hu-HU', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${iso}T12:00:00`))

export default function TodaySession() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const [params, setParams] = useSearchParams()
  const queryClient = useQueryClient()
  const sessionParam = params.get('session')
  const { today, pick, session, templateName, byPlayer, availabilityError, roster, loading, saveAttendance, saveNotes } = useTodaySession(
    selectedTeam?.id,
    sessionParam
  )
  const [editingSession, setEditingSession] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => setNotes(session?.notes ?? ''), [session?.id, session?.notes])

  const canEditCalendar = canEditModule(currentUserPermissions, 'calendar')
  const canEditAttendance = canEditModule(currentUserPermissions, 'attendance')

  if (loading) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="Mai edzés" />
        <LoadingSpinner size="inline" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="Mai edzés" />
        <EmptyState
          icon={Timer}
          title="Nincs közelgő edzés"
          description="Ma nincs edzés, és a naptárban sincs következő. Hozz létre egyet a naptárban."
        />
        <div className="mt-4 flex justify-center">
          <Link to="/dashboard/naptar" className="text-sm font-semibold text-accent hover:underline">
            Ugrás a naptárhoz
          </Link>
        </div>
      </div>
    )
  }

  const type = getSessionType(session.type)
  const time = [hm(session.start_time), hm(session.end_time)].filter(Boolean).join('–')
  const eyebrow =
    pick.mode === 'today' ? 'Ma' : pick.mode === 'next' ? 'Ma nincs edzés · a következő' : 'Korábbi edzés'
  const description = [longDate(session.date), time, session.location, templateName && `Sablon: ${templateName}`]
    .filter(Boolean)
    .join(' · ')

  const counts = { available: 0, limited: 0, injured: 0 }
  const notAvailable = []
  for (const r of roster.rows) {
    const status = availabilityOf(byPlayer, r.player.id).status
    counts[status] += 1
    if (status !== 'available') notAvailable.push({ player: r.player, status })
  }

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['today_sessions', selectedTeam?.id] })
    queryClient.invalidateQueries({ queryKey: ['training_session', selectedTeam?.id, session.id] })
  }

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        eyebrow={eyebrow}
        title="Mai edzés"
        description={description}
        actions={
          <>
            {canEditCalendar && (
              <Button icon={Pencil} onClick={() => setEditingSession(true)}>
                Szerkesztés
              </Button>
            )}
            <Link
              to="/dashboard/naptar"
              className="inline-flex min-h-[36px] items-center gap-2 rounded-[9px] border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg hover:bg-surface-2"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Naptárban
            </Link>
          </>
        }
        tabs={
          pick.todays.length > 1 ? (
            <Tabs
              items={pick.todays.map((s) => ({ id: s.id, label: `${hm(s.start_time) ?? 'Időpont nélkül'} · ${getSessionType(s.type).label}` }))}
              value={session.id}
              onChange={(id) => setParams({ session: id })}
            />
          ) : null
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${type.solid}`}>
          <type.icon className="h-3.5 w-3.5" aria-hidden="true" />
          {type.label}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <SessionPlan session={session} />
          <Panel
            title="Edzés jegyzet"
            icon={StickyNote}
            actions={
              canEditCalendar ? (
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await saveNotes(notes)
                      toast.success('Jegyzet mentve')
                    } catch (error) {
                      console.error(error)
                      toast.error('Nem sikerült menteni a jegyzetet')
                    }
                  }}
                >
                  Jegyzet mentése
                </Button>
              ) : null
            }
          >
            {canEditCalendar ? (
              <Textarea aria-label="Edzés jegyzet" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            ) : (
              <p className="text-sm text-muted">{session.notes || 'Nincs jegyzet.'}</p>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Elérhetőség" icon={ShieldCheck}>
            {availabilityError && (
              <p role="alert" className="mb-2 rounded-[9px] bg-bad-soft px-2.5 py-1.5 text-[12.5px] font-semibold text-bad">
                Az elérhetőség nem tölthető be, a sérültek nincsenek jelölve. Frissítsd az oldalt.
              </p>
            )}
            <div className="mb-2 grid grid-cols-3 gap-2">
              {Object.entries(AVAILABILITY).map(([status, meta]) => (
                <div key={status} className="rounded-[9px] bg-surface-2 px-2.5 py-2">
                  <p className={`font-display text-[26px] font-bold leading-none ${TONE_TEXT[meta.tone]}`}>{counts[status]}</p>
                  <p className="text-[11px] text-muted">{meta.label}</p>
                </div>
              ))}
            </div>
            {notAvailable.length > 0 && (
              <ul className="divide-y divide-line">
                {notAvailable.map(({ player, status }) => (
                  <li key={player.id} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className="text-fg">{player.name}</span>
                    <span className="ml-auto">
                      <AvailabilityPill status={status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <AttendanceRoster
            roster={roster}
            byPlayer={byPlayer}
            canEdit={canEditAttendance}
            canRecord={canRecordAttendance(session, today)}
            onSave={saveAttendance}
          />
        </div>
      </div>

      {editingSession && (
        <TrainingSessionModal
          date={new Date(`${session.date}T12:00:00`)}
          session={session}
          selectedTeam={selectedTeam}
          onClose={() => setEditingSession(false)}
          onSave={() => {
            setEditingSession(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}
