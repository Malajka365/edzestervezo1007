import {
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  CalendarCheck,
  Dumbbell,
  MapPin,
  Trophy,
  Home,
  Plane,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'
import Panel from '../../components/ui/Panel'
import EmptyState from '../../components/ui/EmptyState'
import { MATCH_STYLE, getSessionType } from './sessionTypes'

export default function DayView({
  currentDate,
  trainingDayOptions,
  getDayData,
  getTrainingSessionsForDate,
  getMatchesForDate,
  canEdit,
  setSelectedDateForSession,
  setEditingSession,
  setShowSessionModal,
  deleteTrainingSession,
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mb-2 text-3xl font-bold text-fg">
          {currentDate.toLocaleDateString('hu-HU', { weekday: 'long' })}
        </div>
        <div className="text-lg text-muted">
          {currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {(() => {
        const dayData = getDayData(currentDate)
        const dayConfig = dayData ? trainingDayOptions[dayData] : null
        const daySessions = getTrainingSessionsForDate(currentDate)
        const dayMatches = getMatchesForDate(currentDate)

        return (
          <div className="space-y-4">
            {/* Macrocycle Planning */}
            {dayConfig && (
              <Panel title="Makrociklus tervezés" icon={CalendarCheck}>
                <div className={`rounded-lg p-6 text-center ${dayConfig.color} ${dayConfig.textColor}`}>
                  <div className="mb-2 text-2xl font-bold">{dayData}</div>
                  <div className="text-sm opacity-90">
                    {dayConfig.shortLabel !== '-' ? 'Tervezett aktivitás típusa' : 'Nincs tervezett aktivitás'}
                  </div>
                </div>
              </Panel>
            )}

            {/* Training Sessions */}
            <Panel
              title={`Edzések (${daySessions.length})`}
              icon={Dumbbell}
              actions={
                canEdit && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => {
                      setSelectedDateForSession(currentDate)
                      setEditingSession(null)
                      setShowSessionModal(true)
                    }}
                  >
                    Edzés hozzáadása
                  </Button>
                )
              }
            >
              {daySessions.length === 0 ? (
                <div className="py-8 text-center text-muted">
                  <p>Nincs edzés erre a napra</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {daySessions.map(session => {
                    const sessionType = getSessionType(session.type)
                    const TypeIcon = sessionType.icon

                    return (
                      <div key={session.id} className={`rounded-lg border p-4 ${sessionType.soft}`}>
                        <div className="mb-2 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 font-semibold text-fg">
                              <TypeIcon className="h-4 w-4" aria-hidden="true" />
                              {sessionType.label}
                            </div>
                            {session.start_time && (
                              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                {session.start_time} {session.end_time && `- ${session.end_time}`}
                              </div>
                            )}
                            {session.location && (
                              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                {session.location}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Link
                              to={`/dashboard/mai-edzes?session=${session.id}`}
                              className="rounded-[7px] px-2 py-1 text-[12px] font-semibold text-accent hover:bg-accent-soft"
                            >
                              Mai edzés oldal
                            </Link>
                          {canEdit && (
                            <>
                              <IconButton
                                icon={Pencil}
                                label="Szerkesztés"
                                onClick={() => {
                                  setEditingSession(session)
                                  setShowSessionModal(true)
                                }}
                              />
                              <IconButton
                                icon={Trash2}
                                label="Törlés"
                                onClick={() => deleteTrainingSession(session.id)}
                                className="hover:!bg-bad-soft hover:!text-bad"
                              />
                            </>
                          )}
                          </div>
                        </div>
                        {session.notes && (
                          <p className="mt-2 text-sm text-fg">{session.notes}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>

            {/* Matches */}
            {dayMatches.length > 0 && (
              <Panel title={`Mérkőzések (${dayMatches.length})`} icon={Trophy}>
                <div className="space-y-3">
                  {dayMatches.map(match => {
                    const LocationIcon = match.home_away === 'home' ? Home : Plane

                    return (
                      <div key={match.id} className={`rounded-lg border p-4 ${MATCH_STYLE.soft}`}>
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <div className="mb-1 flex items-center gap-2 text-xl font-bold text-fg">
                              <LocationIcon className="h-5 w-5" aria-hidden="true" />
                              vs {match.opponent}
                            </div>
                            {match.time && (
                              <div className="flex items-center gap-1.5 text-sm text-muted">
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                {match.time}
                              </div>
                            )}
                            {match.location && (
                              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                                {match.location}
                              </div>
                            )}
                          </div>
                          {match.our_score !== null && match.opponent_score !== null && (
                            <div className="text-2xl font-bold text-fg">
                              {match.our_score} : {match.opponent_score}
                            </div>
                          )}
                        </div>
                        {match.notes && (
                          <p className="mt-2 text-sm text-fg">{match.notes}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Panel>
            )}

            {/* No activities */}
            {!dayConfig && daySessions.length === 0 && dayMatches.length === 0 && (
              <EmptyState
                icon={CalendarDays}
                title="Nincs program erre a napra"
                description="Adj hozzá edzést vagy mérkőzést a naptárhoz!"
              />
            )}
          </div>
        )
      })()}
    </div>
  )
}
