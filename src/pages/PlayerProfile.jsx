import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  User,
  Calendar,
  Hash,
  TrendingUp,
  Award,
  ArrowLeft,
  BarChart3,
  Activity,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
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
  ReferenceArea,
} from 'recharts'

export default function PlayerProfile({ player, onBack }) {
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [stats, setStats] = useState({
    totalMeasurements: 0,
    latestWeight: null,
    latestHeight: null,
    best1RMs: [],
  })
  const [exercises, setExercises] = useState([])
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
      fetchExercises()
    }
  }, [player])

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

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name')

      if (error) throw error
      setExercises(data || [])
      
      // Auto-select first exercise
      if (data && data.length > 0 && !selectedExercise) {
        setSelectedExercise(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching exercises:', error)
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
        return { status: 'pre-phv', color: '#f59e0b', label: 'PHV előtt' }
      } else if (index === phvIndex && maxGrowthRate >= 7) {
        // At PHV (if growth rate >= 7 cm/year)
        return { status: 'phv', color: '#ef4444', label: 'PHV' }
      } else {
        // After PHV - check if growth consistently below 3 cm/year
        const recentGrowth = data.slice(Math.max(0, index - 2), index + 1)
          .filter(p => p.growthRate)
          .map(p => p.growthRate)
        
        const avgRecentGrowth = recentGrowth.reduce((a, b) => a + b, 0) / recentGrowth.length
        
        if (avgRecentGrowth < 3) {
          return { status: 'post-phv-stable', color: '#3b82f6', label: 'PHV után (stabil)' }
        } else {
          return { status: 'post-phv', color: '#10b981', label: 'PHV után' }
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
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{data.fullDate}</p>
          <p className="text-primary-400 text-sm">
            Érték: {data.value} {exercise?.unit}
          </p>
          {data.growthRate !== undefined && (
            <p className="text-yellow-400 text-sm">
              Növekedés: {data.growthRate.toFixed(1)} cm/év
            </p>
          )}
          {phvStatus && (
            <p className="text-sm font-semibold mt-1" style={{ color: phvStatus.color }}>
              {phvStatus.label}
            </p>
          )}
          {data.reps && data.reps > 1 && (
            <p className="text-slate-300 text-sm">Ismétlések: {data.reps}</p>
          )}
          {data.oneRM && (
            <p className="text-green-400 text-sm font-semibold">
              1RM: {data.oneRM} {exercise?.unit}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="card text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">Betöltés...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Vissza a csapathoz</span>
      </button>

      {/* Player Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                {player.jersey_number && (
                  <span className="text-3xl font-bold text-primary-400">
                    #{player.jersey_number}
                  </span>
                )}
                <h1 className="text-3xl font-bold text-white">{player.name}</h1>
              </div>
              {player.position && (
                <p className="text-lg text-slate-400">{player.position}</p>
              )}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {player.birth_date && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-slate-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Születési dátum</span>
              </div>
              <p className="text-white font-semibold">
                {new Date(player.birth_date).toLocaleDateString('hu-HU')}
              </p>
              {calculateAge(player.birth_date) && (
                <p className="text-sm text-slate-400 mt-1">
                  {calculateAge(player.birth_date)} éves
                </p>
              )}
            </div>
          )}

          {stats.latestWeight && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-slate-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Testsúly</span>
              </div>
              <p className="text-white font-semibold text-2xl">
                {stats.latestWeight} kg
              </p>
            </div>
          )}

          {stats.latestHeight && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-slate-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">Testmagasság</span>
              </div>
              <p className="text-white font-semibold text-2xl">
                {stats.latestHeight} cm
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        {player.notes && (
          <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
            <p className="text-sm text-slate-300">{player.notes}</p>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Best 1RMs */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Award className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Top 5 1RM</h3>
          </div>

          {stats.best1RMs.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Még nincs 1RM mérés</p>
          ) : (
            <div className="space-y-3">
              {stats.best1RMs.map((measurement, index) => (
                <div
                  key={measurement.id}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-bold text-primary-400">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-white font-medium">
                        {measurement.exercise?.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(measurement.measured_at).toLocaleDateString('hu-HU')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-400">
                      {measurement.one_rm} kg
                    </p>
                    {stats.latestWeight && (
                      <p className="text-xs text-slate-400">
                        Relatív: {(parseFloat(measurement.one_rm) / parseFloat(stats.latestWeight)).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Measurement Summary */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-white">Mérési Összesítő</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
              <span className="text-slate-400">Összes mérés</span>
              <span className="text-2xl font-bold text-white">
                {stats.totalMeasurements}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
              <span className="text-slate-400">Különböző gyakorlatok</span>
              <span className="text-2xl font-bold text-white">
                {new Set(measurements.map((m) => m.exercise_id)).size}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
              <span className="text-slate-400">Legutóbbi mérés</span>
              <span className="text-white font-semibold">
                {measurements.length > 0
                  ? new Date(measurements[0].measured_at).toLocaleDateString('hu-HU')
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">Progresszió Diagram</h3>
        </div>

        {/* Exercise and Date Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Dumbbell className="w-4 h-4 inline mr-2" />
              Gyakorlat
            </label>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="input-field"
            >
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name} ({exercise.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Dátum-tól
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Dátum-ig
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        {progressData.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              Nincs mérési adat ehhez a gyakorlathoz
              {(dateFrom || dateTo) && ' a kiválasztott időszakban'}
            </p>
          </div>
        ) : (
          <>
            <div className="h-80 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                    label={{
                      value: exercises.find((e) => e.id === selectedExercise)?.unit || '',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#94a3b8' },
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                  
                  {/* PHV Marker for Height measurements */}
                  {exercises.find((e) => e.id === selectedExercise)?.name === 'Testmagasság' &&
                    (() => {
                      const phvStatuses = calculatePHVStatus(progressData)
                      const phvIndex = phvStatuses.findIndex(s => s && s.status === 'phv')
                      if (phvIndex !== -1) {
                        const phvPoint = progressData[phvIndex]
                        return (
                          <ReferenceDot
                            x={phvPoint.date}
                            y={phvPoint.value}
                            r={8}
                            fill="#ef4444"
                            stroke="#fff"
                            strokeWidth={2}
                            label={{
                              value: 'PHV',
                              position: 'bottom',
                              fill: '#ef4444',
                              fontSize: 14,
                              fontWeight: 'bold',
                              offset: 10,
                            }}
                          />
                        )
                      }
                      return null
                    })()}
                  
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={(props) => {
                      if (exercises.find((e) => e.id === selectedExercise)?.name === 'Testmagasság') {
                        const phvStatuses = calculatePHVStatus(progressData)
                        const index = progressData.findIndex(p => p.date === props.payload.date)
                        const phvStatus = phvStatuses[index]
                        if (phvStatus) {
                          return (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={5}
                              fill={phvStatus.color}
                              stroke="#fff"
                              strokeWidth={1}
                            />
                          )
                        }
                      }
                      return <circle cx={props.cx} cy={props.cy} r={5} fill="#3b82f6" />
                    }}
                    activeDot={{ r: 7 }}
                    name={`Érték (${exercises.find((e) => e.id === selectedExercise)?.unit})`}
                  />
                  {progressData.some((d) => d.oneRM) && (
                    <Line
                      type="monotone"
                      dataKey="oneRM"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#10b981', r: 4 }}
                      name={`1RM (${exercises.find((e) => e.id === selectedExercise)?.unit})`}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* PHV Legend for Height */}
            {exercises.find((e) => e.id === selectedExercise)?.name === 'Testmagasság' && progressData.length > 1 && (
              <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                <p className="text-xs font-semibold text-slate-300 mb-2">PHV Státusz:</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                    <span className="text-slate-300">PHV előtt (gyorsuló növekedés)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                    <span className="text-slate-300">PHV (csúcs növekedés ≥7 cm/év)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                    <span className="text-slate-300">PHV után (lassuló növekedés)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                    <span className="text-slate-300">Stabil (&lt;3 cm/év)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            {progressData.length > 1 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Első</p>
                  <p className="text-lg font-bold text-white">
                    {progressData[0].value} {exercises.find((e) => e.id === selectedExercise)?.unit}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Utolsó</p>
                  <p className="text-lg font-bold text-white">
                    {progressData[progressData.length - 1].value}{' '}
                    {exercises.find((e) => e.id === selectedExercise)?.unit}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Fejlődés</p>
                  <p
                    className={`text-lg font-bold ${
                      progressData[progressData.length - 1].value - progressData[0].value >= 0
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}
                  >
                    {progressData[progressData.length - 1].value - progressData[0].value > 0
                      ? '+'
                      : ''}
                    {(progressData[progressData.length - 1].value - progressData[0].value).toFixed(1)}{' '}
                    {exercises.find((e) => e.id === selectedExercise)?.unit}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(
                      ((progressData[progressData.length - 1].value - progressData[0].value) /
                        progressData[0].value) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-1">Legjobb</p>
                  <p className="text-lg font-bold text-primary-400">
                    {Math.max(...progressData.map((d) => d.value))}{' '}
                    {exercises.find((e) => e.id === selectedExercise)?.unit}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* All Measurements */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-white">
              Összes Mérés ({measurements.filter(m => {
                if (filterExercise && m.exercise_id !== filterExercise) return false
                if (filterCategory && m.exercise?.category !== filterCategory) return false
                if (filterDateFrom && new Date(m.measured_at) < new Date(filterDateFrom)) return false
                if (filterDateTo && new Date(m.measured_at) > new Date(filterDateTo)) return false
                return true
              }).length})
            </h3>
          </div>
          {(filterExercise || filterCategory || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => {
                setFilterExercise('')
                setFilterCategory('')
                setFilterDateFrom('')
                setFilterDateTo('')
              }}
              className="text-sm text-primary-400 hover:text-primary-300 font-medium"
            >
              Szűrők törlése
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Dumbbell className="w-4 h-4 inline mr-2" />
              Gyakorlat
            </label>
            <select
              value={filterExercise}
              onChange={(e) => {
                setFilterExercise(e.target.value)
                setCurrentPage(1)
              }}
              className="input-field"
            >
              <option value="">Összes gyakorlat</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Filter className="w-4 h-4 inline mr-2" />
              Kategória
            </label>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="input-field"
            >
              <option value="">Összes kategória</option>
              <option value="Erő">Erő</option>
              <option value="Antropometria">Antropometria</option>
              <option value="Gyorsaság">Gyorsaság</option>
              <option value="Állóképesség">Állóképesség</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Dátum-tól
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => {
                setFilterDateFrom(e.target.value)
                setCurrentPage(1)
              }}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Dátum-ig
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => {
                setFilterDateTo(e.target.value)
                setCurrentPage(1)
              }}
              className="input-field"
            />
          </div>
        </div>

        {measurements.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Még nincs mérés rögzítve</p>
        ) : measurements.filter(m => {
            if (filterExercise && m.exercise_id !== filterExercise) return false
            if (filterCategory && m.exercise?.category !== filterCategory) return false
            if (filterDateFrom && new Date(m.measured_at) < new Date(filterDateFrom)) return false
            if (filterDateTo && new Date(m.measured_at) > new Date(filterDateTo)) return false
            return true
          }).length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nincs mérés a kiválasztott szűrőkkel</p>
            <button
              onClick={() => {
                setFilterExercise('')
                setFilterCategory('')
                setFilterDateFrom('')
                setFilterDateTo('')
              }}
              className="mt-4 text-sm text-primary-400 hover:text-primary-300 font-medium"
            >
              Szűrők törlése
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                      Dátum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                      Gyakorlat
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
                      Érték
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
                      Ismétlések
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
                      1RM
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                      Jegyzetek
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {measurements
                    .filter(m => {
                      if (filterExercise && m.exercise_id !== filterExercise) return false
                      if (filterCategory && m.exercise?.category !== filterCategory) return false
                      if (filterDateFrom && new Date(m.measured_at) < new Date(filterDateFrom)) return false
                      if (filterDateTo && new Date(m.measured_at) > new Date(filterDateTo)) return false
                      return true
                    })
                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                    .map((measurement) => (
                  <tr key={measurement.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(measurement.measured_at).toLocaleDateString('hu-HU')}
                    </td>
                    <td className="px-4 py-3 text-white font-medium">
                      {measurement.exercise?.name}
                    </td>
                    <td className="px-4 py-3 text-center text-white">
                      {measurement.value} {measurement.exercise?.unit}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {measurement.reps || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-primary-400 font-semibold">
                      {measurement.one_rm && measurement.exercise?.unit !== 'cm'
                        ? `${measurement.one_rm} ${measurement.exercise?.unit}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {measurement.notes || '-'}
                    </td>
                  </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(() => {
            const filteredMeasurements = measurements.filter(m => {
              if (filterExercise && m.exercise_id !== filterExercise) return false
              if (filterCategory && m.exercise?.category !== filterCategory) return false
              if (filterDateFrom && new Date(m.measured_at) < new Date(filterDateFrom)) return false
              if (filterDateTo && new Date(m.measured_at) > new Date(filterDateTo)) return false
              return true
            })
            
            if (filteredMeasurements.length <= ITEMS_PER_PAGE) return null
            
            return (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <div className="text-sm text-slate-400">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredMeasurements.length)} / {filteredMeasurements.length} mérés
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-white" />
                  </button>
                  <span className="text-sm text-white font-medium">
                    {currentPage} / {Math.ceil(filteredMeasurements.length / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(filteredMeasurements.length / ITEMS_PER_PAGE)}
                    className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            )
          })()}
          </>
        )}
      </div>
    </div>
  )
}
