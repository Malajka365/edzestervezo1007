import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import {
  TrendingUp,
  Users,
  Dumbbell,
  Calendar,
  BarChart3,
  Filter,
  Download,
} from 'lucide-react'
import TeamSelector from '../components/TeamSelector'
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
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

export default function PlayerProgress() {
  const { selectedTeam } = useTeams()
  const [players, setPlayers] = useState([])
  const [exercises, setExercises] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [measurements, setMeasurements] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const chartRef = useRef(null)

  useEffect(() => {
    if (selectedTeam) {
      fetchPlayers()
      fetchExercises()
    }
  }, [selectedTeam])

  useEffect(() => {
    if (selectedPlayer && selectedExercise) {
      fetchMeasurements()
    }
  }, [selectedPlayer, selectedExercise, dateFrom, dateTo])

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('name')

      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error('Error fetching players:', error)
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
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }

  const fetchMeasurements = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('measurements')
        .select(`
          *,
          exercise:exercises(id, name, unit, category)
        `)
        .eq('player_id', selectedPlayer)
        .eq('exercise_id', selectedExercise)

      // Apply date filters if set
      if (dateFrom) {
        query = query.gte('measured_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('measured_at', dateTo)
      }

      query = query.order('measured_at', { ascending: true })

      const { data, error } = await query

      if (error) throw error

      setMeasurements(data || [])

      // Prepare chart data
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
          notes: m.notes,
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

      setChartData(formattedData)
    } catch (error) {
      console.error('Error fetching measurements:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSelectedPlayer = () => {
    return players.find((p) => p.id === selectedPlayer)
  }

  const getSelectedExercise = () => {
    return exercises.find((e) => e.id === selectedExercise)
  }

  const calculatePHVStatus = (data) => {
    if (!data || data.length < 3) return []

    const exercise = getSelectedExercise()
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

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF()
      const player = getSelectedPlayer()
      const exercise = getSelectedExercise()

      if (!player || !exercise) return

      // Title
      doc.setFontSize(18)
      doc.text(`${player.name} - ${exercise.name} - Progresszió`, 14, 15)

      // Subtitle
      doc.setFontSize(10)
      const dateRange = dateFrom && dateTo
        ? `${new Date(dateFrom).toLocaleDateString('hu-HU')} - ${new Date(dateTo).toLocaleDateString('hu-HU')}`
        : dateFrom
        ? `${new Date(dateFrom).toLocaleDateString('hu-HU')} -tól`
        : dateTo
        ? `${new Date(dateTo).toLocaleDateString('hu-HU')} -ig`
        : `${chartData[0]?.fullDate} - ${chartData[chartData.length - 1]?.fullDate}`
      
      doc.text(`Időszak: ${dateRange}`, 14, 22)
      doc.text(`Generálva: ${new Date().toLocaleDateString('hu-HU')}`, 14, 28)

      // Capture chart as image
      if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current, {
          backgroundColor: '#1e293b',
          scale: 2,
        })
        const imgData = canvas.toDataURL('image/png')
        doc.addImage(imgData, 'PNG', 14, 35, 180, 90)
      }

      // Stats
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Statisztikák:', 14, 135)
      
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text(`Első mérés: ${chartData[0]?.value} ${exercise.unit} (${chartData[0]?.fullDate})`, 14, 142)
      doc.text(`Legutóbbi mérés: ${chartData[chartData.length - 1]?.value} ${exercise.unit} (${chartData[chartData.length - 1]?.fullDate})`, 14, 149)
      
      const progress = (chartData[chartData.length - 1]?.value - chartData[0]?.value).toFixed(1)
      const progressPercent = (((chartData[chartData.length - 1]?.value - chartData[0]?.value) / chartData[0]?.value) * 100).toFixed(1)
      doc.text(`Fejlődés: ${progress > 0 ? '+' : ''}${progress} ${exercise.unit} (${progressPercent}%)`, 14, 156)
      
      const bestValue = Math.max(...chartData.map((d) => d.value))
      const bestDate = chartData.find((d) => d.value === bestValue)?.fullDate
      doc.text(`Legjobb eredmény: ${bestValue} ${exercise.unit} (${bestDate})`, 14, 163)

      // Measurements table
      doc.addPage()
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Mérések Részletesen', 14, 15)

      const headers = ['Dátum', 'Érték', 'Ismétlések', '1RM', 'Jegyzetek']
      const rows = measurements.map((m) => [
        new Date(m.measured_at).toLocaleDateString('hu-HU'),
        `${m.value} ${exercise.unit}`,
        m.reps || '-',
        m.one_rm && exercise.unit !== 'cm' ? `${m.one_rm} ${exercise.unit}` : '-',
        m.notes || '-',
      ])

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 25,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] },
          4: { cellWidth: 65 },
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      })

      // Save PDF
      const fileName = `${player.name.replace(/\s+/g, '_')}_${exercise.name.replace(/\s+/g, '_')}_Progresszio_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

      console.log('PDF exported successfully:', fileName)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Hiba történt a PDF exportálás során!')
    }
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const phvStatuses = calculatePHVStatus(chartData)
      const currentIndex = chartData.findIndex(p => p.fullDate === data.fullDate)
      const phvStatus = phvStatuses[currentIndex]

      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{data.fullDate}</p>
          <p className="text-primary-400 text-sm">
            Érték: {data.value} {getSelectedExercise()?.unit}
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
              1RM: {data.oneRM} {getSelectedExercise()?.unit}
            </p>
          )}
          {data.notes && (
            <p className="text-slate-400 text-xs mt-1">{data.notes}</p>
          )}
        </div>
      )
    }
    return null
  }

  if (!selectedTeam) {
    return (
      <div className="h-screen flex flex-col">
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">Játékos Progresszió</h1>
              <p className="text-sm text-slate-400 hidden sm:block">Játékosok fejlődése</p>
            </div>
            <div className="flex-shrink-0">
              <TeamSelector />
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Válassz csapatot</h3>
            <p className="text-slate-400">Válassz egy csapatot a progresszió megtekintéséhez</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header - Dashboard stílusban */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-4 gap-4 flex-wrap lg:flex-nowrap">
          {/* Bal oldal: Cím */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-400" />
                <span>Játékos Progresszió</span>
              </h1>
              <p className="text-sm text-slate-400 hidden sm:block">
                Kövesd nyomon a játékosok fejlődését gyakorlatonként
              </p>
            </div>
          </div>

          {/* Közép: Játékos és Gyakorlat selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="input-field min-w-[180px]"
            >
              <option value="">Válassz játékost...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.jersey_number ? `#${player.jersey_number} - ` : ''}
                  {player.name}
                </option>
              ))}
            </select>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="input-field min-w-[180px]"
            >
              <option value="">Válassz gyakorlatot...</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name} ({exercise.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Jobb oldal: PDF Export + TeamSelector */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {selectedPlayer && selectedExercise && chartData.length > 0 && (
              <button
                onClick={exportToPDF}
                className="flex items-center space-x-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
                title="PDF Exportálás"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">PDF Exportálás</span>
              </button>
            )}
            <TeamSelector />
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">

      {/* Dátum Szűrők */}
      {(selectedPlayer && selectedExercise) && (
        <div className="card mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold text-white">Dátum Szűrés</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Dátum-tól</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Dátum-ig</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
          {(dateFrom || dateTo) && (
            <div className="mt-4 flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <p className="text-sm text-slate-300">
                {dateFrom && dateTo
                  ? `Szűrés: ${new Date(dateFrom).toLocaleDateString('hu-HU')} - ${new Date(dateTo).toLocaleDateString('hu-HU')}`
                  : dateFrom
                  ? `Szűrés: ${new Date(dateFrom).toLocaleDateString('hu-HU')} -tól`
                  : `Szűrés: ${new Date(dateTo).toLocaleDateString('hu-HU')} -ig`}
              </p>
              <button
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
                className="text-sm text-primary-400 hover:text-primary-300 font-medium"
              >
                Szűrő törlése
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Betöltés...</p>
        </div>
      ) : !selectedPlayer || !selectedExercise ? (
        <div className="card text-center py-12">
          <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Válassz játékost és gyakorlatot
          </h3>
          <p className="text-slate-400">
            A diagram megjelenítéséhez válassz ki egy játékost és egy gyakorlatot
          </p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nincs mérési adat</h3>
          <p className="text-slate-400">
            {getSelectedPlayer()?.name} játékosnak még nincs mérése a(z){' '}
            {getSelectedExercise()?.name} gyakorlatban
          </p>
        </div>
      ) : (
        <>
          {/* Chart Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {getSelectedPlayer()?.name} - {getSelectedExercise()?.name}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {chartData.length} mérés • {chartData[0].fullDate} -{' '}
                  {chartData[chartData.length - 1].fullDate}
                </p>
              </div>
              <button
                onClick={exportToPDF}
                className="btn-primary flex items-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>PDF Exportálás</span>
              </button>
            </div>

            <div ref={chartRef} className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                      value: getSelectedExercise()?.unit || '',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: '#94a3b8' },
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  
                  {/* PHV Marker for Height measurements */}
                  {getSelectedExercise()?.name === 'Testmagasság' &&
                    (() => {
                      const phvStatuses = calculatePHVStatus(chartData)
                      const phvIndex = phvStatuses.findIndex(s => s && s.status === 'phv')
                      if (phvIndex !== -1) {
                        const phvPoint = chartData[phvIndex]
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
                      if (getSelectedExercise()?.name === 'Testmagasság') {
                        const phvStatuses = calculatePHVStatus(chartData)
                        const index = chartData.findIndex(p => p.date === props.payload.date)
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
                    name={`Érték (${getSelectedExercise()?.unit})`}
                  />
                  {chartData.some((d) => d.oneRM) && (
                    <Line
                      type="monotone"
                      dataKey="oneRM"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: '#10b981', r: 4 }}
                      name={`1RM (${getSelectedExercise()?.unit})`}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* PHV Legend for Height */}
            {getSelectedExercise()?.name === 'Testmagasság' && chartData.length > 1 && (
              <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
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
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-sm text-slate-400 mb-1">Első mérés</p>
              <p className="text-2xl font-bold text-white">
                {chartData[0].value} {getSelectedExercise()?.unit}
              </p>
              <p className="text-xs text-slate-500 mt-1">{chartData[0].fullDate}</p>
            </div>

            <div className="card">
              <p className="text-sm text-slate-400 mb-1">Legutóbbi mérés</p>
              <p className="text-2xl font-bold text-white">
                {chartData[chartData.length - 1].value} {getSelectedExercise()?.unit}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {chartData[chartData.length - 1].fullDate}
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-slate-400 mb-1">Fejlődés</p>
              <p
                className={`text-2xl font-bold ${
                  chartData[chartData.length - 1].value - chartData[0].value >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {chartData[chartData.length - 1].value - chartData[0].value > 0
                  ? '+'
                  : ''}
                {(chartData[chartData.length - 1].value - chartData[0].value).toFixed(
                  1
                )}{' '}
                {getSelectedExercise()?.unit}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {(
                  ((chartData[chartData.length - 1].value - chartData[0].value) /
                    chartData[0].value) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-slate-400 mb-1">Legjobb eredmény</p>
              <p className="text-2xl font-bold text-primary-400">
                {Math.max(...chartData.map((d) => d.value))}{' '}
                {getSelectedExercise()?.unit}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {
                  chartData.find(
                    (d) => d.value === Math.max(...chartData.map((d) => d.value))
                  )?.fullDate
                }
              </p>
            </div>
          </div>

          {/* Measurements Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">
              Mérések Részletesen ({measurements.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                      Dátum
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
                  {measurements.map((measurement) => (
                    <tr
                      key={measurement.id}
                      className="hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-300">
                        {new Date(measurement.measured_at).toLocaleDateString('hu-HU')}
                      </td>
                      <td className="px-4 py-3 text-center text-white font-semibold">
                        {measurement.value} {measurement.exercise?.unit}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">
                        {measurement.reps || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-green-400 font-semibold">
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
          </div>
        </>
      )}

      </div>
    </div>
  )
}
