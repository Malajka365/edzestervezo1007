import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useExercises } from '../hooks/useExercises'
import { useThemeColors } from '../hooks/useThemeColors'
import AvailabilityPill from '../components/availability/AvailabilityPill'
import LoadingSpinner from '../components/LoadingSpinner'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Panel from '../components/ui/Panel'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import { Field, Input, Select } from '../components/ui/Field'
import {
  Calendar,
  TrendingUp,
  Award,
  ArrowLeft,
  BarChart3,
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'

// `availabilityStatus`: a játékos aktuális elérhetősége (a Játékosok oldal adja át).
export default function PlayerProfile({ player, onBack, availabilityStatus }) {
  // Recharts-ban nem használható Tailwind osztály: a témaszíneket a tokenekből olvassuk.
  // A tartalék értékek csak olyan környezetben számítanak, ahol nincs betöltött téma (pl. jsdom).
  const themeColors = useThemeColors()
  const chart = {
    grid: themeColors.line ?? 'gray',
    axis: themeColors.muted ?? 'gray',
    surface: themeColors.surface ?? 'white',
    accent: themeColors.accent ?? 'blue',
    ok: themeColors.ok ?? 'green',
    warn: themeColors.warn ?? 'orange',
    bad: themeColors.bad ?? 'red',
  }
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalMeasurements: 0,
    latestWeight: null,
    latestHeight: null,
    best1RMs: [],
  })
  // Exercises come from the shared, cached useExercises query (was a local fetch).
  const { data: exercises = [] } = useExercises()
  const [selectedExercise, setSelectedExercise] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [progressData, setProgressData] = useState([])
  
  // Filters for All Measurements table
  const [filterExercise, setFilterExercise] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (player) {
      fetchPlayerData()
    }
  }, [player])

  // Auto-select the first exercise once the catalog loads (was done inside the
  // old fetchExercises).
  useEffect(() => {
    if (exercises.length > 0 && !selectedExercise) {
      setSelectedExercise(exercises[0].id)
    }
  }, [exercises, selectedExercise])

  useEffect(() => {
    if (player && selectedExercise) {
      fetchProgressData()
    }
  }, [player, selectedExercise, dateFrom, dateTo])

  const fetchPlayerData = async () => {
    setLoading(true)
    try {
      // Fetch all measurements for this player
      const { data: measurementsData, error: measurementsError } = await supabase
        .from('measurements')
        .select(`
          *,
          exercise:exercises(id, name, unit, category)
        `)
        .eq('player_id', player.id)
        .order('measured_at', { ascending: false })

      if (measurementsError) throw measurementsError

      setMeasurements(measurementsData || [])

      // Calculate stats
      const totalMeasurements = measurementsData?.length || 0

      // Latest weight
      const weightMeasurement = measurementsData?.find(
        (m) => m.exercise?.name === 'Testsúly'
      )
      const latestWeight = weightMeasurement?.value

      // Latest height
      const heightMeasurement = measurementsData?.find(
        (m) => m.exercise?.name === 'Testmagasság'
      )
      const latestHeight = heightMeasurement?.value

      // Best 1RMs (top 5)
      const oneRMMeasurements = measurementsData
        ?.filter((m) => m.one_rm && m.exercise?.unit === 'kg' && m.exercise?.category !== 'player_params')
        .sort((a, b) => parseFloat(b.one_rm) - parseFloat(a.one_rm))
        .slice(0, 5)

      setStats({
        totalMeasurements,
        latestWeight,
        latestHeight,
        best1RMs: oneRMMeasurements || [],
      })
    } catch (error) {
      console.error('Error fetching player data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProgressData = async () => {
    try {
      let query = supabase
        .from('measurements')
        .select(`
          *,
          exercise:exercises(id, name, unit, category)
        `)
        .eq('player_id', player.id)
        .eq('exercise_id', selectedExercise)

      if (dateFrom) {
        query = query.gte('measured_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('measured_at', dateTo)
      }

      query = query.order('measured_at', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      const formattedData = data.map((m, index) => {
        const baseData = {
          date: new Date(m.measured_at).toLocaleDateString('hu-HU', {
            month: 'short',
            day: 'numeric',
          }),
          fullDate: new Date(m.measured_at).toLocaleDateString('hu-HU'),
          rawDate: new Date(m.measured_at),
          value: parseFloat(m.value),
          reps: m.reps,
          oneRM: m.one_rm ? parseFloat(m.one_rm) : null,
        }

        // Calculate growth rate for height measurements
        if (index > 0 && m.exercise?.name === 'Testmagasság') {
          const prevMeasurement = data[index - 1]
          const heightDiff = parseFloat(m.value) - parseFloat(prevMeasurement.value)
          const timeDiff = (new Date(m.measured_at) - new Date(prevMeasurement.measured_at)) / (1000 * 60 * 60 * 24 * 365.25)
          baseData.growthRate = timeDiff > 0 ? heightDiff / timeDiff : 0
        }

        return baseData
      })

      setProgressData(formattedData)
    } catch (error) {
      console.error('Error fetching progress data:', error)
    }
  }

  const calculateAge = (birthDate) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const calculatePHVStatus = (data) => {
    if (!data || data.length < 3) return []

    const exercise = exercises.find((e) => e.id === selectedExercise)
    if (exercise?.name !== 'Testmagasság') return []

    // Find PHV (peak growth rate)
    let phvIndex = -1
    let maxGrowthRate = 0

    data.forEach((point, index) => {
      if (point.growthRate && point.growthRate > maxGrowthRate) {
        maxGrowthRate = point.growthRate
        phvIndex = index
      }
    })

    // Determine status for each point
    return data.map((point, index) => {
      if (!point.growthRate) return null

      if (index < phvIndex) {
        // Before PHV
        return { status: 'pre-phv', color: chart.warn, label: 'PHV előtt' }
      } else if (index === phvIndex && maxGrowthRate >= 7) {
        // At PHV (if growth rate >= 7 cm/year)
        return { status: 'phv', color: chart.bad, label: 'PHV' }
      } else {
        // After PHV - check if growth consistently below 3 cm/year
        const recentGrowth = data.slice(Math.max(0, index - 2), index + 1)
          .filter(p => p.growthRate)
          .map(p => p.growthRate)
        
        const avgRecentGrowth = recentGrowth.reduce((a, b) => a + b, 0) / recentGrowth.length
        
        if (avgRecentGrowth < 3) {
          return { status: 'post-phv-stable', color: chart.accent, label: 'PHV után (stabil)' }
        } else {
          return { status: 'post-phv', color: chart.ok, label: 'PHV után' }
        }
      }
    })
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const exercise = exercises.find((e) => e.id === selectedExercise)
      const phvStatuses = calculatePHVStatus(progressData)
      const currentIndex = progressData.findIndex(p => p.fullDate === data.fullDate)
      const phvStatus = phvStatuses[currentIndex]

      return (
        <div className="bg-surface border border-line rounded-lg p-3 shadow-lg">
          <p className="text-fg font-semibold mb-2">{data.fullDate}</p>
          <p className="text-accent text-sm">
            Érték: {data.value} {exercise?.unit}
          </p>
          {data.growthRate !== undefined && (
            <p className="text-warn text-sm">
              Növekedés: {data.growthRate.toFixed(1)} cm/év
            </p>
          )}
          {phvStatus && (
            <p className="text-sm font-semibold mt-1" style={{ color: phvStatus.color }}>
              {phvStatus.label}
            </p>
          )}
          {data.reps && data.reps > 1 && (
            <p className="text-fg text-sm">Ismétlések: {data.reps}</p>
          )}
          {data.oneRM && (
            <p className="text-ok text-sm font-semibold">
              1RM: {data.oneRM} {exercise?.unit}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  const header = (
    <PageHeader
      eyebrow={player.jersey_number ? `#${player.jersey_number}` : undefined}
      title={player.name}
      description={player.position || undefined}
      actions={
        <>
        {availabilityStatus && <AvailabilityPill status={availabilityStatus} />}
        <Button variant="ghost" icon={ArrowLeft} onClick={onBack}>
          Vissza a játékosokhoz
        </Button>
        </>
      }
    />
  )

  if (loading) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        {header}
        <Panel>
          <LoadingSpinner size="inline" />
        </Panel>
      </div>
    )
  }

  const selectedExerciseObj = exercises.find((e) => e.id === selectedExercise)
  const unit = selectedExerciseObj?.unit
  const isHeight = selectedExerciseObj?.name === 'Testmagasság'
  const phvStatuses = isHeight ? calculatePHVStatus(progressData) : []
  const phvIndex = phvStatuses.findIndex((st) => st && st.status === 'phv')
  const phvPoint = phvIndex !== -1 ? progressData[phvIndex] : null

  const filteredMeasurements = measurements.filter((m) => {
    if (filterExercise && m.exercise_id !== filterExercise) return false
    if (filterCategory && m.exercise?.category !== filterCategory) return false
    if (filterDateFrom && new Date(m.measured_at) < new Date(filterDateFrom)) return false
    if (filterDateTo && new Date(m.measured_at) > new Date(filterDateTo)) return false
    return true
  })
  const hasActiveFilters = filterExercise || filterCategory || filterDateFrom || filterDateTo
  const totalPages = Math.ceil(filteredMeasurements.length / ITEMS_PER_PAGE)

  const clearFilters = () => {
    setFilterExercise('')
    setFilterCategory('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const age = calculateAge(player.birth_date)
  const hasBasicInfo =
    player.birth_date || stats.latestWeight || stats.latestHeight || player.notes
  const progress =
    progressData.length > 1
      ? progressData[progressData.length - 1].value - progressData[0].value
      : 0

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      {header}

      <div className="space-y-6">
        {/* Alapadatok */}
        {hasBasicInfo && (
          <Panel>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {player.birth_date && (
                <div className="rounded-[10px] bg-surface-2 p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted">
                    <Calendar className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm">Születési dátum</span>
                  </div>
                  <p className="font-semibold text-fg">
                    {new Date(player.birth_date).toLocaleDateString('hu-HU')}
                  </p>
                  {age && <p className="mt-1 text-sm text-muted">{age} éves</p>}
                </div>
              )}

              {stats.latestWeight && (
                <div className="rounded-[10px] bg-surface-2 p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted">
                    <Activity className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm">Testsúly</span>
                  </div>
                  <p className="font-mono text-2xl font-medium text-fg">{stats.latestWeight} kg</p>
                </div>
              )}

              {stats.latestHeight && (
                <div className="rounded-[10px] bg-surface-2 p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted">
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm">Testmagasság</span>
                  </div>
                  <p className="font-mono text-2xl font-medium text-fg">{stats.latestHeight} cm</p>
                </div>
              )}
            </div>

            {player.notes && (
              <div className="mt-4 rounded-[10px] bg-surface-2 p-4">
                <p className="text-sm text-fg">{player.notes}</p>
              </div>
            )}
          </Panel>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Best 1RMs */}
          <Panel title="Top 5 1RM" icon={Award}>
            {stats.best1RMs.length === 0 ? (
              <p className="py-8 text-center text-muted">Még nincs 1RM mérés</p>
            ) : (
              <div className="space-y-3">
                {stats.best1RMs.map((measurement, index) => (
                  <div
                    key={measurement.id}
                    className="flex items-center justify-between rounded-[10px] bg-surface-2 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xl font-medium text-accent">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-fg">{measurement.exercise?.name}</p>
                        <p className="text-xs text-muted">
                          {new Date(measurement.measured_at).toLocaleDateString('hu-HU')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xl font-medium text-accent">
                        {measurement.one_rm} kg
                      </p>
                      {stats.latestWeight && (
                        <p className="text-xs text-muted">
                          Relatív:{' '}
                          {(parseFloat(measurement.one_rm) / parseFloat(stats.latestWeight)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Measurement Summary */}
          <Panel title="Mérési összesítő" icon={BarChart3}>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-[10px] bg-surface-2 p-4">
                <span className="text-muted">Összes mérés</span>
                <span className="font-mono text-2xl font-medium text-fg">
                  {stats.totalMeasurements}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[10px] bg-surface-2 p-4">
                <span className="text-muted">Különböző gyakorlatok</span>
                <span className="font-mono text-2xl font-medium text-fg">
                  {new Set(measurements.map((m) => m.exercise_id)).size}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-[10px] bg-surface-2 p-4">
                <span className="text-muted">Legutóbbi mérés</span>
                <span className="font-semibold text-fg">
                  {measurements.length > 0
                    ? new Date(measurements[0].measured_at).toLocaleDateString('hu-HU')
                    : '-'}
                </span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Progress Chart */}
        <Panel title="Progresszió diagram" icon={TrendingUp}>
          {/* Exercise and Date Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Gyakorlat" htmlFor="progress-exercise">
              <Select
                id="progress-exercise"
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name} ({exercise.unit})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Dátum-tól" htmlFor="progress-date-from">
              <Input
                id="progress-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Field>

            <Field label="Dátum-ig" htmlFor="progress-date-to">
              <Input
                id="progress-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Field>
          </div>

          {progressData.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title={`Nincs mérési adat ehhez a gyakorlathoz${
                dateFrom || dateTo ? ' a kiválasztott időszakban' : ''
              }`}
            />
          ) : (
            <>
              <div className="mb-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis dataKey="date" stroke={chart.axis} style={{ fontSize: '12px' }} />
                    <YAxis
                      stroke={chart.axis}
                      style={{ fontSize: '12px' }}
                      label={{
                        value: unit || '',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fill: chart.axis },
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px', color: chart.axis }}
                      iconType="line"
                    />

                    {/* PHV Marker for Height measurements */}
                    {phvPoint && (
                      <ReferenceDot
                        x={phvPoint.date}
                        y={phvPoint.value}
                        r={8}
                        fill={chart.bad}
                        stroke={chart.surface}
                        strokeWidth={2}
                        label={{
                          value: 'PHV',
                          position: 'bottom',
                          fill: chart.bad,
                          fontSize: 14,
                          fontWeight: 'bold',
                          offset: 10,
                        }}
                      />
                    )}

                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chart.accent}
                      strokeWidth={3}
                      dot={(props) => {
                        if (isHeight) {
                          const index = progressData.findIndex((p) => p.date === props.payload.date)
                          const phvStatus = phvStatuses[index]
                          if (phvStatus) {
                            return (
                              <circle
                                key={props.key}
                                cx={props.cx}
                                cy={props.cy}
                                r={5}
                                fill={phvStatus.color}
                                stroke={chart.surface}
                                strokeWidth={1}
                              />
                            )
                          }
                        }
                        return (
                          <circle key={props.key} cx={props.cx} cy={props.cy} r={5} fill={chart.accent} />
                        )
                      }}
                      activeDot={{ r: 7 }}
                      name={`Érték (${unit})`}
                    />
                    {progressData.some((d) => d.oneRM) && (
                      <Line
                        type="monotone"
                        dataKey="oneRM"
                        stroke={chart.ok}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: chart.ok, r: 4 }}
                        name={`1RM (${unit})`}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* PHV Legend for Height */}
              {isHeight && progressData.length > 1 && (
                <div className="mb-4 rounded-[10px] bg-surface-2 p-3">
                  <p className="mb-2 text-xs font-semibold text-fg">PHV státusz:</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-warn" aria-hidden="true" />
                      <span className="text-fg">PHV előtt (gyorsuló növekedés)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-bad" aria-hidden="true" />
                      <span className="text-fg">PHV (csúcs növekedés ≥7 cm/év)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-ok" aria-hidden="true" />
                      <span className="text-fg">PHV után (lassuló növekedés)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-accent" aria-hidden="true" />
                      <span className="text-fg">Stabil (&lt;3 cm/év)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {progressData.length > 1 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-[10px] bg-surface-2 p-3">
                    <p className="mb-1 text-xs text-muted">Első</p>
                    <p className="font-mono text-lg font-medium text-fg">
                      {progressData[0].value} {unit}
                    </p>
                  </div>
                  <div className="rounded-[10px] bg-surface-2 p-3">
                    <p className="mb-1 text-xs text-muted">Utolsó</p>
                    <p className="font-mono text-lg font-medium text-fg">
                      {progressData[progressData.length - 1].value} {unit}
                    </p>
                  </div>
                  <div className="rounded-[10px] bg-surface-2 p-3">
                    <p className="mb-1 text-xs text-muted">Fejlődés</p>
                    <p
                      className={`font-mono text-lg font-medium ${
                        progress >= 0 ? 'text-ok' : 'text-bad'
                      }`}
                    >
                      {progress > 0 ? '+' : ''}
                      {progress.toFixed(1)} {unit}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {((progress / progressData[0].value) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-[10px] bg-surface-2 p-3">
                    <p className="mb-1 text-xs text-muted">Legjobb</p>
                    <p className="font-mono text-lg font-medium text-accent">
                      {Math.max(...progressData.map((d) => d.value))} {unit}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>

        {/* All Measurements */}
        <Panel
          title={`Összes mérés (${filteredMeasurements.length})`}
          icon={BarChart3}
          actions={
            hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Szűrők törlése
              </Button>
            )
          }
        >
          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Gyakorlat" htmlFor="filter-exercise">
              <Select
                id="filter-exercise"
                value={filterExercise}
                onChange={(e) => {
                  setFilterExercise(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Összes gyakorlat</option>
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Kategória" htmlFor="filter-category">
              <Select
                id="filter-category"
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Összes kategória</option>
                <option value="Erő">Erő</option>
                <option value="Antropometria">Antropometria</option>
                <option value="Gyorsaság">Gyorsaság</option>
                <option value="Állóképesség">Állóképesség</option>
              </Select>
            </Field>

            <Field label="Dátum-tól" htmlFor="filter-date-from">
              <Input
                id="filter-date-from"
                type="date"
                value={filterDateFrom}
                onChange={(e) => {
                  setFilterDateFrom(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </Field>

            <Field label="Dátum-ig" htmlFor="filter-date-to">
              <Input
                id="filter-date-to"
                type="date"
                value={filterDateTo}
                onChange={(e) => {
                  setFilterDateTo(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </Field>
          </div>

          {measurements.length === 0 ? (
            <p className="py-8 text-center text-muted">Még nincs mérés rögzítve</p>
          ) : filteredMeasurements.length === 0 ? (
            <EmptyState
              icon={Filter}
              title="Nincs mérés a kiválasztott szűrőkkel"
              actionLabel="Szűrők törlése"
              onAction={clearFilters}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                        Dátum
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                        Gyakorlat
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted">
                        Érték
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted">
                        Ismétlések
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted">
                        1RM
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted">
                        Jegyzetek
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredMeasurements
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((measurement) => (
                        <tr key={measurement.id} className="transition-colors hover:bg-surface-2">
                          <td className="px-4 py-3 text-fg">
                            {new Date(measurement.measured_at).toLocaleDateString('hu-HU')}
                          </td>
                          <td className="px-4 py-3 font-medium text-fg">
                            {measurement.exercise?.name}
                          </td>
                          <td className="px-4 py-3 text-center text-fg">
                            {measurement.value} {measurement.exercise?.unit}
                          </td>
                          <td className="px-4 py-3 text-center text-fg">
                            {measurement.reps || '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-accent">
                            {measurement.one_rm && measurement.exercise?.unit !== 'cm'
                              ? `${measurement.one_rm} ${measurement.exercise?.unit}`
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted">
                            {measurement.notes || '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredMeasurements.length > ITEMS_PER_PAGE && (
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <div className="text-sm text-muted">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredMeasurements.length)} /{' '}
                    {filteredMeasurements.length} mérés
                  </div>
                  <div className="flex items-center gap-2">
                    <IconButton
                      icon={ChevronLeft}
                      label="Előző oldal"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    />
                    <span className="text-sm font-medium text-fg">
                      {currentPage} / {totalPages}
                    </span>
                    <IconButton
                      icon={ChevronRight}
                      label="Következő oldal"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
