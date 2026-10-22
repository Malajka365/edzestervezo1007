import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import { usePlayers } from '../hooks/usePlayers'
import { useExercises } from '../hooks/useExercises'
import {
  TrendingUp,
  Calendar,
  BarChart3,
  Download,
} from 'lucide-react'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Field, Input, Select } from '../components/ui/Field'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import { useThemeColors } from '../hooks/useThemeColors'
import LoadingSpinner from '../components/LoadingSpinner'
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
import { exportTablePdf } from '../lib/pdfExport'

export default function PlayerProgress() {
  const { selectedTeam } = useTeams()
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
  // Players come from the shared, cached usePlayers query (was a local fetch).
  const { data: players = [] } = usePlayers(selectedTeam?.id)
  // Exercises come from the shared, cached useExercises query (was a local fetch).
  const { data: exercises = [] } = useExercises()
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedExercise, setSelectedExercise] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [measurements, setMeasurements] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(false)
  const chartRef = useRef(null)

  useEffect(() => {
    if (selectedPlayer && selectedExercise) {
      fetchMeasurements()
    }
  }, [selectedPlayer, selectedExercise, dateFrom, dateTo])

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

  const exportToPDF = async () => {
    const player = getSelectedPlayer()
    const exercise = getSelectedExercise()

    if (!player || !exercise) return

    const dateRange = dateFrom && dateTo
      ? `${new Date(dateFrom).toLocaleDateString('hu-HU')} - ${new Date(dateTo).toLocaleDateString('hu-HU')}`
      : dateFrom
      ? `${new Date(dateFrom).toLocaleDateString('hu-HU')} -tól`
      : dateTo
      ? `${new Date(dateTo).toLocaleDateString('hu-HU')} -ig`
      : `${chartData[0]?.fullDate} - ${chartData[chartData.length - 1]?.fullDate}`

    const headers = ['Dátum', 'Érték', 'Ismétlések', '1RM', 'Jegyzetek']
    const rows = measurements.map((m) => [
      new Date(m.measured_at).toLocaleDateString('hu-HU'),
      `${m.value} ${exercise.unit}`,
      m.reps || '-',
      m.one_rm && exercise.unit !== 'cm' ? `${m.one_rm} ${exercise.unit}` : '-',
      m.notes || '-',
    ])

    await exportTablePdf({
      title: `${player.name} - ${exercise.name} - Progresszió`,
      subtitles: [
        `Időszak: ${dateRange}`,
        `Generálva: ${new Date().toLocaleDateString('hu-HU')}`,
      ],
      columns: headers,
      rows,
      startY: 25,
      checkEmpty: false,
      headStyles: { fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] },
        4: { cellWidth: 65 },
      },
      filename: `${player.name.replace(/\s+/g, '_')}_${exercise.name.replace(/\s+/g, '_')}_Progresszio_${new Date().toISOString().split('T')[0]}.pdf`,
      // Chart image + stats on page 1, then a fresh page for the table.
      beforeTable: async (doc) => {
        // Capture chart as image
        if (chartRef.current) {
          const { captureForPdf } = await import('../lib/pdfCapture')
          const canvas = await captureForPdf(chartRef.current, { scale: 2 })
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

        // Measurements table header on a fresh page
        doc.addPage()
        doc.setFontSize(14)
        doc.setFont(undefined, 'bold')
        doc.text('Mérések Részletesen', 14, 15)
      },
    })
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const phvStatuses = calculatePHVStatus(chartData)
      const currentIndex = chartData.findIndex(p => p.fullDate === data.fullDate)
      const phvStatus = phvStatuses[currentIndex]

      return (
        <div className="bg-surface border border-line rounded-lg p-3 shadow-lg">
          <p className="text-fg font-semibold mb-2">{data.fullDate}</p>
          <p className="text-accent text-sm">
            Érték: {data.value} {getSelectedExercise()?.unit}
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
              1RM: {data.oneRM} {getSelectedExercise()?.unit}
            </p>
          )}
          {data.notes && (
            <p className="text-muted text-xs mt-1">{data.notes}</p>
          )}
        </div>
      )
    }
    return null
  }

  if (!selectedTeam) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="Progresszió" description="Játékosok fejlődése" />
        <EmptyState
          icon={TrendingUp}
          title="Válassz csapatot"
          description="Válassz egy csapatot a progresszió megtekintéséhez."
        />
      </div>
    )
  }

  const selectedExerciseInfo = getSelectedExercise()
  const isHeight = selectedExerciseInfo?.name === 'Testmagasság'
  const unit = selectedExerciseInfo?.unit

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Progresszió"
        description={`${selectedTeam.name} · Kövesd nyomon a játékosok fejlődését gyakorlatonként`}
        actions={
          <>
            <Select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              aria-label="Játékos"
              className="min-w-[180px]"
            >
              <option value="">Válassz játékost...</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.jersey_number ? `#${player.jersey_number} - ` : ''}
                  {player.name}
                </option>
              ))}
            </Select>
            <Select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              aria-label="Gyakorlat"
              className="min-w-[180px]"
            >
              <option value="">Válassz gyakorlatot...</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name} ({exercise.unit})
                </option>
              ))}
            </Select>
            {selectedPlayer && selectedExercise && chartData.length > 0 && (
              <Button variant="primary" icon={Download} onClick={exportToPDF}>
                PDF exportálás
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-6">
        {/* Dátum szűrők */}
        {selectedPlayer && selectedExercise && (
          <Panel title="Dátum szűrés" icon={Calendar}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {(dateFrom || dateTo) && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[9px] bg-surface-2 p-3">
                <p className="text-sm text-fg">
                  {dateFrom && dateTo
                    ? `Szűrés: ${new Date(dateFrom).toLocaleDateString('hu-HU')} - ${new Date(dateTo).toLocaleDateString('hu-HU')}`
                    : dateFrom
                    ? `Szűrés: ${new Date(dateFrom).toLocaleDateString('hu-HU')} -tól`
                    : `Szűrés: ${new Date(dateTo).toLocaleDateString('hu-HU')} -ig`}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom('')
                    setDateTo('')
                  }}
                >
                  Szűrő törlése
                </Button>
              </div>
            )}
          </Panel>
        )}

        {/* Chart */}
        {loading ? (
          <Panel>
            <LoadingSpinner size="inline" />
          </Panel>
        ) : !selectedPlayer || !selectedExercise ? (
          <EmptyState
            icon={BarChart3}
            title="Válassz játékost és gyakorlatot"
            description="A diagram megjelenítéséhez válassz ki egy játékost és egy gyakorlatot"
          />
        ) : chartData.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Nincs mérési adat"
            description={`${getSelectedPlayer()?.name} játékosnak még nincs mérése a(z) ${selectedExerciseInfo?.name} gyakorlatban`}
          />
        ) : (
          <>
            {/* Chart Card */}
            <Panel>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-fg">
                  {getSelectedPlayer()?.name} - {selectedExerciseInfo?.name}
                </h3>
                <p className="text-sm text-muted mt-1">
                  {chartData.length} mérés • {chartData[0].fullDate} -{' '}
                  {chartData[chartData.length - 1].fullDate}
                </p>
              </div>

              <div ref={chartRef} className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
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
                    {isHeight &&
                      (() => {
                        const phvStatuses = calculatePHVStatus(chartData)
                        const phvIndex = phvStatuses.findIndex((s) => s && s.status === 'phv')
                        if (phvIndex !== -1) {
                          const phvPoint = chartData[phvIndex]
                          return (
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
                          )
                        }
                        return null
                      })()}

                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chart.accent}
                      strokeWidth={3}
                      dot={(props) => {
                        if (isHeight) {
                          const phvStatuses = calculatePHVStatus(chartData)
                          const index = chartData.findIndex((p) => p.date === props.payload.date)
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
                    {chartData.some((d) => d.oneRM) && (
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
              {isHeight && chartData.length > 1 && (
                <div className="mt-4 rounded-[9px] bg-surface-2 p-3">
                  <p className="text-xs font-semibold text-fg mb-2">PHV státusz:</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-warn"></div>
                      <span className="text-fg">PHV előtt (gyorsuló növekedés)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-bad"></div>
                      <span className="text-fg">PHV (csúcs növekedés ≥7 cm/év)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-ok"></div>
                      <span className="text-fg">PHV után (lassuló növekedés)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent"></div>
                      <span className="text-fg">Stabil (&lt;3 cm/év)</span>
                    </div>
                  </div>
                </div>
              )}
            </Panel>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Panel>
                <p className="text-sm text-muted mb-1">Első mérés</p>
                <p className="font-mono text-2xl font-semibold text-fg">
                  {chartData[0].value} {unit}
                </p>
                <p className="text-xs text-muted mt-1">{chartData[0].fullDate}</p>
              </Panel>

              <Panel>
                <p className="text-sm text-muted mb-1">Legutóbbi mérés</p>
                <p className="font-mono text-2xl font-semibold text-fg">
                  {chartData[chartData.length - 1].value} {unit}
                </p>
                <p className="text-xs text-muted mt-1">
                  {chartData[chartData.length - 1].fullDate}
                </p>
              </Panel>

              <Panel>
                <p className="text-sm text-muted mb-1">Fejlődés</p>
                <p
                  className={`font-mono text-2xl font-semibold ${
                    chartData[chartData.length - 1].value - chartData[0].value >= 0
                      ? 'text-ok'
                      : 'text-bad'
                  }`}
                >
                  {chartData[chartData.length - 1].value - chartData[0].value > 0 ? '+' : ''}
                  {(chartData[chartData.length - 1].value - chartData[0].value).toFixed(1)} {unit}
                </p>
                <p className="text-xs text-muted mt-1">
                  {(
                    ((chartData[chartData.length - 1].value - chartData[0].value) /
                      chartData[0].value) *
                    100
                  ).toFixed(1)}
                  %
                </p>
              </Panel>

              <Panel>
                <p className="text-sm text-muted mb-1">Legjobb eredmény</p>
                <p className="font-mono text-2xl font-semibold text-accent">
                  {Math.max(...chartData.map((d) => d.value))} {unit}
                </p>
                <p className="text-xs text-muted mt-1">
                  {
                    chartData.find((d) => d.value === Math.max(...chartData.map((d) => d.value)))
                      ?.fullDate
                  }
                </p>
              </Panel>
            </div>

            {/* Measurements Table */}
            <Panel title={`Mérések részletesen (${measurements.length})`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">
                        Dátum
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted uppercase">
                        Érték
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted uppercase">
                        Ismétlések
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-muted uppercase">
                        1RM
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase">
                        Jegyzetek
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {measurements.map((measurement) => (
                      <tr
                        key={measurement.id}
                        className="hover:bg-surface-2/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-fg">
                          {new Date(measurement.measured_at).toLocaleDateString('hu-HU')}
                        </td>
                        <td className="px-4 py-3 text-center text-fg font-semibold">
                          {measurement.value} {measurement.exercise?.unit}
                        </td>
                        <td className="px-4 py-3 text-center text-fg">
                          {measurement.reps || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-ok font-semibold">
                          {measurement.one_rm && measurement.exercise?.unit !== 'cm'
                            ? `${measurement.one_rm} ${measurement.exercise?.unit}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-muted text-sm">
                          {measurement.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}
