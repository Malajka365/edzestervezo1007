import { Home, Plane, Star } from 'lucide-react'

export default function WeekView({
  currentDate,
  daysOfWeek,
  trainingDayOptions,
  getWeekDays,
  getDayData,
  getTrainingSessionsForDate,
  getMatchesForDate,
  isToday,
  setCurrentDate,
  setView,
  hasBallTraining,
  canEdit,
  updateLoadFactor,
  getLoadFactor,
  getTacticsTechnique,
  updateTacticsTechnique,
}) {
  return (
    <div>
      {/* Day headers - horizontal */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {getWeekDays(currentDate).map((date, index) => {
          const dayData = getDayData(date)
          const dayConfig = dayData ? trainingDayOptions[dayData] : null

          return (
            <div
              key={`header-${date.toISOString()}`}
              className={`text-center p-3 rounded-lg border ${
                isToday(date)
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-slate-600 bg-slate-800'
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${
                isToday(date) ? 'text-primary-400' : 'text-slate-400'
              }`}>
                {daysOfWeek[index]}
              </div>
              <div className={`text-lg font-bold mb-2 ${
                isToday(date) ? 'text-primary-300' : 'text-white'
              }`}>
                {date.getDate()}
              </div>
              <div className="text-xs text-slate-500">
                {date.toLocaleDateString('hu-HU', { month: 'short' })}
              </div>
              {dayConfig && dayConfig.shortLabel !== '-' && (
                <div className={`mt-2 text-xs px-2 py-1 rounded ${dayConfig.color} ${dayConfig.textColor}`}>
                  {dayConfig.shortLabel}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Day content - horizontal */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {getWeekDays(currentDate).map((date, index) => {
          const daySessions = getTrainingSessionsForDate(date)
          const dayMatches = getMatchesForDate(date)

          return (
            <div
              key={`content-${date.toISOString()}`}
              className={`border rounded-lg p-3 min-h-[300px] transition-all cursor-pointer ${
                isToday(date)
                  ? 'border-primary-500 bg-primary-500/5'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-800'
              }`}
              onClick={() => {
                setCurrentDate(date)
                setView('day')
              }}
            >
              <div className="space-y-2">
                {/* Training sessions */}
                {daySessions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-400 mb-2">
                      Edzések ({daySessions.length})
                    </div>
                    {daySessions.map((session, idx) => {
                      const isGym = session.type === 'gym'
                      const isBall = session.type === 'ball'
                      const bgColor = isGym ? 'bg-purple-600' : isBall ? 'bg-teal-600' : 'bg-blue-600'
                      const icon = isGym ? '🏋️' : isBall ? '⚽' : '📝'

                      return (
                        <div key={idx} className={`text-xs px-2 py-2 rounded ${bgColor} text-white`}>
                          <div className="font-semibold mb-1">{icon} {session.start_time ? session.start_time.substring(0, 5) : ''}</div>
                          {session.location && (
                            <div className="text-[10px] opacity-90 truncate">
                              📍 {session.location}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Matches */}
                {dayMatches.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-400 mb-2">
                      Mérkőzések ({dayMatches.length})
                    </div>
                    {dayMatches.map((match, idx) => {
                      const isHome = match.home_away === 'home'
                      const LocationIcon = isHome ? Home : Plane

                      return (
                        <div key={idx} className="text-xs px-2 py-2 rounded bg-pink-600 text-white">
                          <div className="flex items-center gap-1 mb-1">
                            <LocationIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="font-semibold truncate">
                              {match.opponent}
                            </span>
                          </div>
                          {match.time && (
                            <div className="text-[10px] opacity-90">
                              🕐 {match.time.substring(0, 5)}
                            </div>
                          )}
                          {match.location && (
                            <div className="text-[10px] opacity-90 truncate">
                              📍 {match.location}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Empty state */}
                {daySessions.length === 0 && dayMatches.length === 0 && (
                  <div className="text-center py-8 text-slate-600">
                    <div className="text-2xl mb-2">📅</div>
                    <div className="text-xs">Nincs esemény</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Load Factors Table */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {getWeekDays(currentDate).map((date) => {
          const hasBall = hasBallTraining(date)

          return (
            <div
              key={`load-factors-${date.toISOString()}`}
              className={`border rounded-lg overflow-hidden ${
                isToday(date)
                  ? 'border-primary-500 bg-primary-500/5'
                  : 'border-slate-600 bg-slate-800'
              } ${!hasBall ? 'opacity-50' : ''}`}
            >
              {/* Keringési terhelés - Star Rating */}
              <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                <div className="text-[10px] text-slate-400 mb-1 text-center">Keringési</div>
                <div className="flex justify-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={`circ-star-${star}`}
                      disabled={!hasBall || !canEdit}
                      onClick={() => updateLoadFactor(date, 'circulation', star, true)}
                      className={`p-0.5 transition-colors ${
                        !hasBall ? 'cursor-not-allowed' : 'hover:scale-110'
                      }`}
                    >
                      <Star
                        className={`w-3 h-3 ${
                          star <= (getLoadFactor(date, 'circulation') || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Mechanikai terhelés - Star Rating */}
              <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                <div className="text-[10px] text-slate-400 mb-1 text-center">Mechanikai</div>
                <div className="flex justify-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={`mech-star-${star}`}
                      disabled={!hasBall || !canEdit}
                      onClick={() => updateLoadFactor(date, 'mechanical', star, true)}
                      className={`p-0.5 transition-colors ${
                        !hasBall ? 'cursor-not-allowed' : 'hover:scale-110'
                      }`}
                    >
                      <Star
                        className={`w-3 h-3 ${
                          star <= (getLoadFactor(date, 'mechanical') || 0)
                            ? 'fill-orange-400 text-orange-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Energiarendszer - Dropdown */}
              <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                <div className="text-[10px] text-slate-400 mb-1 text-center">Energiarendszer</div>
                <select
                  disabled={!hasBall || !canEdit}
                  value={getLoadFactor(date, 'energy')}
                  onChange={(e) => updateLoadFactor(date, 'energy', e.target.value, true)}
                  className={`w-full px-1 py-1 text-[10px] text-center bg-slate-700 text-white rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    !hasBall ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <option value="">-</option>
                  <option value="aerob">Aerob</option>
                  <option value="anaerob_laktat">Anaerob laktát</option>
                  <option value="anaerob_alaktat">Anaerob alaktát</option>
                  <option value="vegyes">Vegyes</option>
                </select>
              </div>

              {/* Időtartam - Text Input */}
              <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                <div className="text-[10px] text-slate-400 mb-1 text-center">Időtartam</div>
                <input
                  type="text"
                  disabled={!hasBall || !canEdit}
                  value={getLoadFactor(date, 'duration')}
                  onChange={(e) => updateLoadFactor(date, 'duration', e.target.value)}
                  placeholder={hasBall ? 'pl. 90p' : ''}
                  className={`w-full px-1 py-1 text-[10px] text-center bg-slate-700 text-white rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    !hasBall ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                />
              </div>

              {/* Terhelés:Pihenő - Dropdown */}
              <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                <div className="text-[10px] text-slate-400 mb-1 text-center">Terhelés:Pihenő</div>
                <select
                  disabled={!hasBall || !canEdit}
                  value={getLoadFactor(date, 'ratio')}
                  onChange={(e) => updateLoadFactor(date, 'ratio', e.target.value, true)}
                  className={`w-full px-1 py-1 text-[10px] text-center bg-slate-700 text-white rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    !hasBall ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <option value="">-</option>
                  <option value="1:1">1:1</option>
                  <option value="1:2">1:2</option>
                  <option value="1:3">1:3</option>
                  <option value="1:4">1:4</option>
                  <option value="1:5">1:5</option>
                  <option value="2:1">2:1</option>
                  <option value="3:1">3:1</option>
                  <option value="4:1">4:1</option>
                </select>
              </div>

              {/* Típus - Text Input */}
              <div className={`px-2 py-2 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                <div className="text-[10px] text-slate-400 mb-1 text-center">Típus</div>
                <input
                  type="text"
                  disabled={!hasBall || !canEdit}
                  value={getLoadFactor(date, 'type')}
                  onChange={(e) => updateLoadFactor(date, 'type', e.target.value)}
                  placeholder={hasBall ? 'pl. HIIT' : ''}
                  className={`w-full px-1 py-1 text-[10px] text-center bg-slate-700 text-white rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    !hasBall ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Tactics & Technique Table */}
      <div className="mb-4">
        <div className="bg-slate-700 px-4 py-2 text-center rounded-t-lg border border-slate-600">
          <h3 className="text-sm font-semibold text-white">Taktika & Technika</h3>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {getWeekDays(currentDate).map((date) => {
            const hasBall = hasBallTraining(date)

            return (
              <div
                key={`tactics-${date.toISOString()}`}
                className={`border rounded-lg overflow-hidden ${
                  isToday(date)
                    ? 'border-primary-500 bg-primary-500/5'
                    : 'border-slate-600 bg-slate-800'
                } ${!hasBall ? 'opacity-50' : ''}`}
              >
                {/* Taktikai cél - Támadás */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Taktikai - Támadás</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'tactical_support')}
                    onChange={(e) => updateTacticsTechnique(date, 'tactical_support', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Taktikai cél - Védekezés */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Taktikai - Védekezés</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'tactical_defense')}
                    onChange={(e) => updateTacticsTechnique(date, 'tactical_defense', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Technikai cél - Támadás */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Technikai - Támadás</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'technical_support')}
                    onChange={(e) => updateTacticsTechnique(date, 'technical_support', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Technikai cél - Védekezés */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Technikai - Védekezés</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'technical_defense')}
                    onChange={(e) => updateTacticsTechnique(date, 'technical_defense', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Videó */}
                <div className={`px-2 py-2 border-t-[3px] border-b-[3px] border-slate-400 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Videó</div>
                  <select
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'video_url') || ''}
                    onChange={(e) => updateTacticsTechnique(date, 'video_url', e.target.value)}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    <option value="">-</option>
                    <option value="Igen">Igen</option>
                    <option value="Nem">Nem</option>
                  </select>
                </div>

                {/* Gyakorlat - Támadás Közös */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Gyak - Tám Közös</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'practice_support_common')}
                    onChange={(e) => updateTacticsTechnique(date, 'practice_support_common', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Gyakorlat - Támadás Szélső */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Gyak - Tám Szélső</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'practice_support_wide')}
                    onChange={(e) => updateTacticsTechnique(date, 'practice_support_wide', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Gyakorlat - Támadás Beálló */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Gyak - Tám Beálló</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'practice_support_inside')}
                    onChange={(e) => updateTacticsTechnique(date, 'practice_support_inside', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Gyakorlat - Támadás Átlövő-Irány */}
                <div className={`px-2 py-2 border-b-[3px] border-slate-400 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Gyak - Tám Átlövő</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'practice_support_main_direction')}
                    onChange={(e) => updateTacticsTechnique(date, 'practice_support_main_direction', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Gyakorlat - Védekezés Közös */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Gyak - Véd Közös</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'practice_defense_common')}
                    onChange={(e) => updateTacticsTechnique(date, 'practice_defense_common', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Gyakorlat - Védekezés Szélső */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Gyak - Véd Szélső</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'practice_defense_wide')}
                    onChange={(e) => updateTacticsTechnique(date, 'practice_defense_wide', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Gyakorlat - Védekezés Beálló */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Gyak - Véd Beálló</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'practice_defense_inside')}
                    onChange={(e) => updateTacticsTechnique(date, 'practice_defense_inside', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Gyakorlat - Védekezés Átlövő-Irány */}
                <div className={`px-2 py-2 border-b border-slate-600 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Gyak - Véd Átlövő</div>
                  <input
                    type="text"
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'practice_defense_main_direction')}
                    onChange={(e) => updateTacticsTechnique(date, 'practice_defense_main_direction', e.target.value)}
                    placeholder={hasBall ? '-' : ''}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                </div>

                {/* Kapus edzés */}
                <div className={`px-2 py-2 border-t-[3px] border-slate-400 ${!hasBall ? 'bg-slate-700/50' : ''}`}>
                  <div className="text-[10px] text-slate-400 mb-1 text-center">Kapus edzés</div>
                  <select
                    disabled={!hasBall || !canEdit}
                    value={getTacticsTechnique(date, 'practice_game') || ''}
                    onChange={(e) => updateTacticsTechnique(date, 'practice_game', e.target.value)}
                    className={`w-full px-1 py-1 text-center bg-slate-700 text-white text-[10px] rounded border-0 focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                      !hasBall ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  >
                    <option value="">-</option>
                    <option value="Igen">Igen</option>
                    <option value="Nem">Nem</option>
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
