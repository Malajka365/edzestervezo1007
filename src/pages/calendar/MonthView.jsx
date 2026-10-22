import { Home, Plane } from 'lucide-react'
import { MATCH_STYLE, getSessionType } from './sessionTypes'

export default function MonthView({
  currentDate,
  daysOfWeek,
  daysOfWeekShort,
  trainingDayOptions,
  getDaysInMonth,
  getDayData,
  getTrainingSessionsForDate,
  getMatchesForDate,
  isToday,
  isCurrentMonth,
  setCurrentDate,
  setView,
}) {
  return (
    <div>
      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1 sm:gap-2">
        {daysOfWeek.map((day, index) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-muted sm:text-sm">
            <span className="sm:hidden">{daysOfWeekShort?.[index] ?? day.slice(0, 2)}</span>
            <span className="hidden sm:inline">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {getDaysInMonth(currentDate).map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const dayData = getDayData(date)
          const dayConfig = dayData ? trainingDayOptions[dayData] : null
          const daySessions = getTrainingSessionsForDate(date)
          const dayMatches = getMatchesForDate(date)

          return (
            <div
              key={date.toISOString()}
              className={`aspect-square cursor-pointer overflow-hidden rounded-lg border p-1 transition-all sm:p-2 ${
                isToday(date)
                  ? 'border-accent bg-accent-soft'
                  : isCurrentMonth(date)
                  ? 'border-line bg-surface hover:border-line-strong'
                  : 'border-line bg-bg/50 opacity-50'
              }`}
              onClick={() => {
                setCurrentDate(date)
                setView('day')
              }}
            >
              <div className="flex h-full flex-col">
                <div className={`mb-1 text-xs font-medium sm:text-sm ${
                  isToday(date) ? 'text-accent' : 'text-fg'
                }`}>
                  {date.getDate()}
                </div>

                {/* Macrocycle planning indicator */}
                {dayConfig && dayConfig.shortLabel !== '-' && (
                  <div className={`mb-1 h-1.5 truncate rounded sm:h-auto sm:px-1 sm:text-[10px] ${dayConfig.color} ${dayConfig.textColor}`}>
                    <span className="sr-only sm:not-sr-only">{dayConfig.shortLabel}</span>
                  </div>
                )}

                {/* Kis kijelzőn: pontok a címkék helyett */}
                {(daySessions.length > 0 || dayMatches.length > 0) && (
                  <div className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden="true">
                    {daySessions.map((session, idx) => (
                      <span
                        key={`dot-s-${idx}`}
                        className={`h-1.5 w-1.5 rounded-full ${getSessionType(session.type).solid}`}
                      />
                    ))}
                    {dayMatches.map((match, idx) => (
                      <span
                        key={`dot-m-${idx}`}
                        className={`h-1.5 w-1.5 rounded-full ${MATCH_STYLE.solid}`}
                      />
                    ))}
                  </div>
                )}

                {/* Training sessions */}
                {daySessions.length > 0 && (
                  <div className="mb-1 hidden space-y-1 sm:block">
                    {daySessions.map((session, idx) => {
                      const sessionType = getSessionType(session.type)
                      const TypeIcon = sessionType.icon

                      return (
                        <div key={idx} className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] ${sessionType.solid}`}>
                          <TypeIcon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                          {session.start_time && (
                            <span className="flex-shrink-0">{session.start_time.substring(0, 5)}</span>
                          )}
                          {session.location && (
                            <span className="truncate text-[9px] opacity-90">
                              {session.location}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Matches */}
                {dayMatches.length > 0 && (
                  <div className="mt-1 hidden space-y-1 sm:block">
                    {dayMatches.map((match, idx) => {
                      const isHome = match.home_away === 'home'
                      const LocationIcon = isHome ? Home : Plane

                      return (
                        <div key={idx} className={`flex items-center gap-1 rounded px-1 py-1 text-[10px] ${MATCH_STYLE.solid}`}>
                          <LocationIcon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                          <span className="flex-1 truncate">
                            {match.opponent}
                          </span>
                          {match.time && (
                            <span className="flex-shrink-0 text-[9px] opacity-80">
                              {match.time.substring(0, 5)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
