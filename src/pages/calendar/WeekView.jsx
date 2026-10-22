import { Home, Plane, Star, MapPin, Clock, CalendarDays } from 'lucide-react'
import { MATCH_STYLE, getSessionType } from './sessionTypes'

// sm fölött 7 oszlop (egy nap = egy oszlop), alatta a napok egymás alatt jelennek meg.
// A napi blokkok sm fölött `contents`-ek, így a sorok (fejléc / tartalom / terhelés /
// taktika) minden oszlopban egy vonalban maradnak.
const COL_START = [
  'sm:col-start-1',
  'sm:col-start-2',
  'sm:col-start-3',
  'sm:col-start-4',
  'sm:col-start-5',
  'sm:col-start-6',
  'sm:col-start-7',
]

const ENERGY_OPTIONS = [
  { value: 'aerob', label: 'Aerob' },
  { value: 'anaerob_laktat', label: 'Anaerob laktát' },
  { value: 'anaerob_alaktat', label: 'Anaerob alaktát' },
  { value: 'vegyes', label: 'Vegyes' },
]

const RATIO_OPTIONS = ['1:1', '1:2', '1:3', '1:4', '1:5', '2:1', '3:1', '4:1']

// Taktika & Technika sorok: kulcs a getTacticsTechnique-hoz, 'text' vagy 'yesno' vezérlő,
// a vastag elválasztók a csoportokat jelölik.
const TACTIC_FIELDS = [
  { key: 'tactical_support', label: 'Taktikai - Támadás', type: 'text' },
  { key: 'tactical_defense', label: 'Taktikai - Védekezés', type: 'text' },
  { key: 'technical_support', label: 'Technikai - Támadás', type: 'text' },
  { key: 'technical_defense', label: 'Technikai - Védekezés', type: 'text' },
  { key: 'video_url', label: 'Videó', type: 'yesno', heavyTop: true, heavyBottom: true },
  { key: 'practice_support_common', label: 'Gyak - Tám Közös', type: 'text' },
  { key: 'practice_support_wide', label: 'Gyak - Tám Szélső', type: 'text' },
  { key: 'practice_support_inside', label: 'Gyak - Tám Beálló', type: 'text' },
  { key: 'practice_support_main_direction', label: 'Gyak - Tám Átlövő', type: 'text', heavyBottom: true },
  { key: 'practice_defense_common', label: 'Gyak - Véd Közös', type: 'text' },
  { key: 'practice_defense_wide', label: 'Gyak - Véd Szélső', type: 'text' },
  { key: 'practice_defense_inside', label: 'Gyak - Véd Beálló', type: 'text' },
  { key: 'practice_defense_main_direction', label: 'Gyak - Véd Átlövő', type: 'text' },
  { key: 'practice_game', label: 'Kapus edzés', type: 'yesno', heavyTop: true },
]

const controlClass = (disabled) =>
  `w-full rounded border-0 bg-surface-2 px-1 py-1 text-center text-[10px] text-fg placeholder:text-subtle focus:outline-none focus:ring-1 focus:ring-accent ${
    disabled ? 'cursor-not-allowed opacity-50' : ''
  }`

function Cell({ label, dim, heavyTop, heavyBottom, children }) {
  return (
    <div
      className={`border-b border-line px-2 py-2 last:border-b-0 ${dim ? 'bg-surface-2/50' : ''} ${
        heavyTop ? 'sm:border-t-[3px] sm:border-t-line-strong' : ''
      } ${heavyBottom ? 'sm:border-b-[3px] sm:border-b-line-strong' : ''}`}
    >
      <div className="mb-1 text-center text-[10px] text-muted">{label}</div>
      {children}
    </div>
  )
}

function StarRating({ label, value, disabled, hasBall, fillClass, onChange }) {
  return (
    <div className="flex justify-center gap-0.5" role="group" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          aria-label={`${label}: ${star}`}
          onClick={() => onChange(star)}
          className={`p-0.5 transition-colors ${!hasBall ? 'cursor-not-allowed' : 'hover:scale-110'}`}
        >
          <Star
            className={`h-3 w-3 ${star <= (value || 0) ? fillClass : 'text-subtle'}`}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  )
}

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
  const weekDays = getWeekDays(currentDate)

  return (
    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-7 sm:gap-x-2 sm:gap-y-3">
      {weekDays.map((date, index) => {
        const dayData = getDayData(date)
        const dayConfig = dayData ? trainingDayOptions[dayData] : null
        const daySessions = getTrainingSessionsForDate(date)
        const dayMatches = getMatchesForDate(date)
        const hasBall = hasBallTraining(date)
        const controlsDisabled = !hasBall || !canEdit
        const col = COL_START[index]
        const today = isToday(date)
        const surface = today ? 'border-accent bg-accent-soft' : 'border-line bg-surface'

        return (
          <div key={date.toISOString()} className="flex flex-col gap-2 sm:contents">
            {/* Day header */}
            <div className={`${col} rounded-lg border p-3 text-center sm:row-start-1 ${surface}`}>
              <div className={`mb-1 text-sm font-medium ${today ? 'text-accent' : 'text-muted'}`}>
                {daysOfWeek[index]}
              </div>
              <div className={`mb-2 text-lg font-bold ${today ? 'text-accent' : 'text-fg'}`}>
                {date.getDate()}
              </div>
              <div className="text-xs text-muted">
                {date.toLocaleDateString('hu-HU', { month: 'short' })}
              </div>
              {dayConfig && dayConfig.shortLabel !== '-' && (
                <div className={`mt-2 rounded px-2 py-1 text-xs ${dayConfig.color} ${dayConfig.textColor}`}>
                  {dayConfig.shortLabel}
                </div>
              )}
            </div>

            {/* Day content */}
            <div
              className={`${col} min-h-[80px] cursor-pointer rounded-lg border p-3 transition-all sm:row-start-2 sm:min-h-[300px] ${
                today ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong'
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
                    <div className="mb-2 text-xs font-semibold text-muted">
                      Edzések ({daySessions.length})
                    </div>
                    {daySessions.map((session, idx) => {
                      const sessionType = getSessionType(session.type)
                      const TypeIcon = sessionType.icon

                      return (
                        <div key={idx} className={`rounded px-2 py-2 text-xs ${sessionType.solid}`}>
                          <div className="mb-1 flex items-center gap-1 font-semibold">
                            <TypeIcon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                            {session.start_time ? session.start_time.substring(0, 5) : ''}
                          </div>
                          {session.location && (
                            <div className="flex items-center gap-1 text-[10px] opacity-90">
                              <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{session.location}</span>
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
                    <div className="mb-2 text-xs font-semibold text-muted">
                      Mérkőzések ({dayMatches.length})
                    </div>
                    {dayMatches.map((match, idx) => {
                      const LocationIcon = match.home_away === 'home' ? Home : Plane

                      return (
                        <div key={idx} className={`rounded px-2 py-2 text-xs ${MATCH_STYLE.solid}`}>
                          <div className="mb-1 flex items-center gap-1">
                            <LocationIcon className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                            <span className="truncate font-semibold">
                              {match.opponent}
                            </span>
                          </div>
                          {match.time && (
                            <div className="flex items-center gap-1 text-[10px] opacity-90">
                              <Clock className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                              {match.time.substring(0, 5)}
                            </div>
                          )}
                          {match.location && (
                            <div className="flex items-center gap-1 text-[10px] opacity-90">
                              <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{match.location}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Empty state */}
                {daySessions.length === 0 && dayMatches.length === 0 && (
                  <div className="py-8 text-center text-subtle">
                    <CalendarDays className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
                    <div className="text-xs">Nincs esemény</div>
                  </div>
                )}
              </div>
            </div>

            {/* Load factors */}
            <div
              className={`${col} overflow-hidden rounded-lg border sm:row-start-3 ${surface} ${
                !hasBall ? 'opacity-50' : ''
              }`}
            >
              <div className="grid grid-cols-2 sm:grid-cols-1">
                <Cell label="Keringési" dim={!hasBall}>
                  <StarRating
                    label="Keringési terhelés"
                    value={getLoadFactor(date, 'circulation')}
                    disabled={controlsDisabled}
                    hasBall={hasBall}
                    fillClass="fill-warn text-warn"
                    onChange={(star) => updateLoadFactor(date, 'circulation', star, true)}
                  />
                </Cell>

                <Cell label="Mechanikai" dim={!hasBall}>
                  <StarRating
                    label="Mechanikai terhelés"
                    value={getLoadFactor(date, 'mechanical')}
                    disabled={controlsDisabled}
                    hasBall={hasBall}
                    fillClass="fill-t-match text-t-match"
                    onChange={(star) => updateLoadFactor(date, 'mechanical', star, true)}
                  />
                </Cell>

                <Cell label="Energiarendszer" dim={!hasBall}>
                  <select
                    aria-label="Energiarendszer"
                    disabled={controlsDisabled}
                    value={getLoadFactor(date, 'energy')}
                    onChange={(e) => updateLoadFactor(date, 'energy', e.target.value, true)}
                    className={controlClass(!hasBall)}
                  >
                    <option value="">-</option>
                    {ENERGY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Cell>

                <Cell label="Időtartam" dim={!hasBall}>
                  <input
                    type="text"
                    aria-label="Időtartam"
                    disabled={controlsDisabled}
                    value={getLoadFactor(date, 'duration')}
                    onChange={(e) => updateLoadFactor(date, 'duration', e.target.value)}
                    placeholder={hasBall ? 'pl. 90p' : ''}
                    className={controlClass(!hasBall)}
                  />
                </Cell>

                <Cell label="Terhelés:Pihenő" dim={!hasBall}>
                  <select
                    aria-label="Terhelés:Pihenő"
                    disabled={controlsDisabled}
                    value={getLoadFactor(date, 'ratio')}
                    onChange={(e) => updateLoadFactor(date, 'ratio', e.target.value, true)}
                    className={controlClass(!hasBall)}
                  >
                    <option value="">-</option>
                    {RATIO_OPTIONS.map((ratio) => (
                      <option key={ratio} value={ratio}>{ratio}</option>
                    ))}
                  </select>
                </Cell>

                <Cell label="Típus" dim={!hasBall}>
                  <input
                    type="text"
                    aria-label="Típus"
                    disabled={controlsDisabled}
                    value={getLoadFactor(date, 'type')}
                    onChange={(e) => updateLoadFactor(date, 'type', e.target.value)}
                    placeholder={hasBall ? 'pl. HIIT' : ''}
                    className={controlClass(!hasBall)}
                  />
                </Cell>
              </div>
            </div>

            {/* Tactics & technique */}
            <div
              className={`${col} overflow-hidden rounded-lg border sm:row-start-5 ${surface} ${
                !hasBall ? 'opacity-50' : ''
              }`}
            >
              <div className="border-b border-line bg-surface-2 px-2 py-1.5 text-center text-xs font-semibold text-fg sm:hidden">
                Taktika & Technika
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-1">
                {TACTIC_FIELDS.map((field) => (
                  <Cell
                    key={field.key}
                    label={field.label}
                    dim={!hasBall}
                    heavyTop={field.heavyTop}
                    heavyBottom={field.heavyBottom}
                  >
                    {field.type === 'yesno' ? (
                      <select
                        aria-label={field.label}
                        disabled={controlsDisabled}
                        value={getTacticsTechnique(date, field.key) || ''}
                        onChange={(e) => updateTacticsTechnique(date, field.key, e.target.value)}
                        className={controlClass(!hasBall)}
                      >
                        <option value="">-</option>
                        <option value="Igen">Igen</option>
                        <option value="Nem">Nem</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        aria-label={field.label}
                        disabled={controlsDisabled}
                        value={getTacticsTechnique(date, field.key)}
                        onChange={(e) => updateTacticsTechnique(date, field.key, e.target.value)}
                        placeholder={hasBall ? '-' : ''}
                        className={controlClass(!hasBall)}
                      />
                    )}
                  </Cell>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {/* Taktika & Technika sáv: csak 7 oszlopos nézetben, a napok oszlopai fölött */}
      <div className="hidden rounded-t-lg border border-line bg-surface-2 px-4 py-2 text-center sm:col-span-7 sm:col-start-1 sm:row-start-4 sm:block">
        <h3 className="text-sm font-semibold text-fg">Taktika & Technika</h3>
      </div>
    </div>
  )
}
