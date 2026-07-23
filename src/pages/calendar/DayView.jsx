import { Plus, Edit, Trash2, Calendar as CalendarIcon } from 'lucide-react'

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
        <div className="text-3xl font-bold text-white mb-2">
          {currentDate.toLocaleDateString('hu-HU', { weekday: 'long' })}
        </div>
        <div className="text-lg text-slate-400">
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
              <div className="card bg-slate-800">
                <h3 className="text-lg font-semibold text-white mb-4">📅 Makrociklus Tervezés</h3>
                <div className={`p-6 rounded-lg ${dayConfig.color} ${dayConfig.textColor} text-center`}>
                  <div className="text-2xl font-bold mb-2">{dayData}</div>
                  <div className="text-sm opacity-90">
                    {dayConfig.shortLabel !== '-' ? 'Tervezett aktivitás típusa' : 'Nincs tervezett aktivitás'}
                  </div>
                </div>
              </div>
            )}

            {/* Training Sessions */}
            <div className="card bg-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">🏋️ Edzések ({daySessions.length})</h3>
                {canEdit && (
                  <button
                    onClick={() => {
                      setSelectedDateForSession(currentDate)
                      setEditingSession(null)
                      setShowSessionModal(true)
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Edzés hozzáadása</span>
                  </button>
                )}
              </div>

              {daySessions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>Nincs edzés erre a napra</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {daySessions.map(session => (
                    <div key={session.id} className="bg-teal-600/20 border border-teal-600/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-white">{session.type === 'gym' ? '🏋️ Konditerem' : session.type === 'ball' ? '⚽ Labdás' : session.type === 'tactic' ? '🎯 Taktika' : '📝 Egyéb'}</div>
                          {session.start_time && (
                            <div className="text-sm text-slate-400 mt-1">
                              {session.start_time} {session.end_time && `- ${session.end_time}`}
                            </div>
                          )}
                          {session.location && (
                            <div className="text-sm text-slate-400 mt-1">📍 {session.location}</div>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingSession(session)
                                setShowSessionModal(true)
                              }}
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Szerkesztés"
                            >
                              <Edit className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => deleteTrainingSession(session.id)}
                              className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                              title="Törlés"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        )}
                      </div>
                      {session.notes && (
                        <p className="text-sm text-slate-300 mt-2">{session.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Matches */}
            {dayMatches.length > 0 && (
              <div className="card bg-slate-800">
                <h3 className="text-lg font-semibold text-white mb-4">🏆 Mérkőzések ({dayMatches.length})</h3>
                <div className="space-y-3">
                  {dayMatches.map(match => (
                    <div key={match.id} className="bg-pink-600/20 border border-pink-600/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-xl font-bold text-white mb-1">
                            {match.home_away === 'home' ? '🏠' : '✈️'} vs {match.opponent}
                          </div>
                          {match.time && (
                            <div className="text-sm text-slate-400">
                              ⏰ {match.time}
                            </div>
                          )}
                          {match.location && (
                            <div className="text-sm text-slate-400 mt-1">
                              📍 {match.location}
                            </div>
                          )}
                        </div>
                        {match.our_score !== null && match.opponent_score !== null && (
                          <div className="text-2xl font-bold text-white">
                            {match.our_score} : {match.opponent_score}
                          </div>
                        )}
                      </div>
                      {match.notes && (
                        <p className="text-sm text-slate-300 mt-2">{match.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No activities */}
            {!dayConfig && daySessions.length === 0 && dayMatches.length === 0 && (
              <div className="card bg-slate-800 text-center py-12">
                <CalendarIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Nincs program erre a napra</h3>
                <p className="text-slate-400">
                  Adj hozzá edzést vagy mérkőzést a naptárhoz!
                </p>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
