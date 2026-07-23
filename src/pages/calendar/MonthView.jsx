import { Home, Plane } from 'lucide-react'

export default function MonthView({
  currentDate,
  daysOfWeek,
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
      <div className="grid grid-cols-7 gap-2 mb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
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
              className={`aspect-square border rounded-lg p-2 transition-all cursor-pointer ${
                isToday(date)
                  ? 'border-primary-500 bg-primary-500/10'
                  : isCurrentMonth(date)
                  ? 'border-slate-600 hover:border-slate-500 bg-slate-800'
                  : 'border-slate-700 bg-slate-900/50 opacity-50'
              }`}
              onClick={() => {
                setCurrentDate(date)
                setView('day')
              }}
            >
              <div className="flex flex-col h-full">
                <div className={`text-sm font-medium mb-1 ${
                  isToday(date) ? 'text-primary-400' : 'text-slate-300'
                }`}>
                  {date.getDate()}
                </div>

                {/* Macrocycle planning indicator */}
                {dayConfig && dayConfig.shortLabel !== '-' && (
                  <div className={`text-[10px] px-1 rounded ${dayConfig.color} ${dayConfig.textColor} mb-1`}>
                    {dayConfig.shortLabel}
                  </div>
                )}

                {/* Training sessions */}
                {daySessions.length > 0 && (
                  <div className="space-y-1 mb-1">
                    {daySessions.map((session, idx) => {
                      const isGym = session.type === 'gym'
                      const isBall = session.type === 'ball'
                      const bgColor = isGym ? 'bg-purple-600' : isBall ? 'bg-teal-600' : 'bg-blue-600'
                      const icon = isGym ? '🏋️' : isBall ? '⚽' : '📝'

                      return (
                        <div key={idx} className={`text-[10px] px-1 py-0.5 rounded ${bgColor} text-white flex items-center gap-1`}>
                          <span className="flex-shrink-0">{icon}</span>
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
                  <div className="space-y-1 mt-1">
                    {dayMatches.map((match, idx) => {
                      const isHome = match.home_away === 'home'
                      const LocationIcon = isHome ? Home : Plane

                      return (
                        <div key={idx} className="text-[10px] px-1 py-1 rounded bg-pink-600 text-white flex items-center gap-1">
                          <LocationIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate flex-1">
                            {match.opponent}
                          </span>
                          {match.time && (
                            <span className="text-[9px] opacity-80 flex-shrink-0">
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
