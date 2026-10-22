import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import { usePlayers } from '../hooks/usePlayers'
import { useExercises } from '../hooks/useExercises'
import {
  Calculator,
  Download,
  Filter,
  TrendingUp,
  Dumbbell,
} from 'lucide-react'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Select } from '../components/ui/Field'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import LoadingSpinner from '../components/LoadingSpinner'
import { exportTablePdf } from '../lib/pdfExport'

export default function TrainingLoad() {
  const { selectedTeam } = useTeams()
  const [loading, setLoading] = useState(false)
  // Exercises come from the shared, cached useExercises query. This screen only
  // works with weight-based lifts, so filter to `unit === 'kg'` client-side —
  // the same subset the old inline fetch returned (already ordered by name).
  const { data: allExercises = [] } = useExercises()
  const exercises = useMemo(
    () => allExercises.filter((e) => e.unit === 'kg'),
    [allExercises]
  )
  const [selectedExercise, setSelectedExercise] = useState('')
  // Players come from the shared, cached usePlayers query (was a local fetch).
  // That query orders by name; this screen displayed players by jersey number,
  // so re-sort locally to preserve the historical row order.
  const { data: playersRaw = [] } = usePlayers(selectedTeam?.id)
  // Memoized so the reference is stable across renders — the fetchLatest1RM
  // effect below depends on `players`, so a fresh array each render would loop.
  const players = useMemo(
    () =>
      [...playersRaw].sort((a, b) => {
        if (a.jersey_number == null && b.jersey_number == null) return 0
        if (a.jersey_number == null) return 1
        if (b.jersey_number == null) return -1
        return Number(a.jersey_number) - Number(b.jersey_number)
      }),
    [playersRaw]
  )
  const [calculations, setCalculations] = useState([])

  // Percentage columns to display (descending order, excluding 100% as it equals 1RM)
  const percentages = [97.5, 95, 92.5, 90, 87.5, 85, 82.5, 80, 75, 70, 65, 60, 55, 50]

  useEffect(() => {
    if (selectedExercise && players.length > 0) {
      fetchLatest1RM()
    }
  }, [selectedExercise, players])

  const fetchLatest1RM = async () => {
    setLoading(true)
    try {
      const results = []

      for (const player of players) {
        const { data, error } = await supabase
          .from('measurements')
          .select('one_rm, value, reps, measured_at')
          .eq('team_id', selectedTeam.id)
          .eq('player_id', player.id)
          .eq('exercise_id', selectedExercise)
          .not('one_rm', 'is', null)
          .order('measured_at', { ascending: false })
          .limit(1)

        if (error) throw error

        if (data && data.length > 0) {
          const latest = data[0]
          const oneRM = parseFloat(latest.one_rm)
          
          // Calculate percentages
          const percentageValues = {}
          percentages.forEach((pct) => {
            percentageValues[pct] = (oneRM * (pct / 100)).toFixed(1)
          })

          results.push({
            player,
            oneRM: oneRM.toFixed(1),
            lastMeasured: latest.measured_at,
            percentages: percentageValues,
          })
        } else {
          // No measurements for this player
          results.push({
            player,
            oneRM: null,
            lastMeasured: null,
            percentages: {},
          })
        }
      }

      setCalculations(results)
    } catch (error) {
      console.error('Error fetching 1RM data:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = async () => {
    const exercise = exercises.find((e) => e.id === selectedExercise)

    if (!exercise) {
      console.error('Exercise not found')
      return
    }

    // Table headers - 1RM is now 100%
    const headers = [
      'Játékos',
      'Mérés dátuma',
      '1RM (100%)',
      ...percentages.map((p) => `${p}%`),
    ]

    // Table data
    const rows = calculations
      .filter((calc) => calc.oneRM)
      .map((calc) => [
        calc.player.name,
        calc.lastMeasured ? new Date(calc.lastMeasured).toLocaleDateString('hu-HU') : '-',
        calc.oneRM,
        ...percentages.map((pct) => calc.percentages[pct] || '-'),
      ])

    await exportTablePdf({
      orientation: 'landscape',
      title: `${selectedTeam.name} - ${exercise.name} - 1RM Százalék Kalkulátor`,
      subtitles: [`Generálva: ${new Date().toLocaleDateString('hu-HU')}`],
      columns: headers,
      rows,
      startY: 28,
      headStyles: { fontSize: 8 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 35 }, // Name
        1: { cellWidth: 22 }, // Date
        2: { cellWidth: 20, fontStyle: 'bold', fillColor: [219, 234, 254] }, // 1RM highlighted
      },
      filename: `${selectedTeam.name}_${exercise.name.replace(/\s+/g, '_')}_1RM_${new Date().toISOString().split('T')[0]}.pdf`,
    })
  }

  if (!selectedTeam) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="1RM táblázat" description="Terhelés százalékok" />
        <EmptyState
          icon={Calculator}
          title="Válassz csapatot"
          description="Válassz egy csapatot az 1RM táblázat használatához."
        />
      </div>
    )
  }

  const selectedExerciseName = exercises.find((e) => e.id === selectedExercise)?.name

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="1RM táblázat"
        description={`${selectedTeam.name} · Tervezd meg az edzés terhelést a játékosok legutóbbi 1RM értékei alapján`}
        actions={
          <>
            <Select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              aria-label="Gyakorlat"
              className="min-w-[200px]"
            >
              <option value="">Válassz gyakorlatot...</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </Select>
            {selectedExercise && calculations.length > 0 && (
              <Button variant="primary" icon={Download} onClick={exportToPDF}>
                PDF exportálás
              </Button>
            )}
          </>
        }
      />

      {/* Results Table */}
      {loading ? (
        <Panel>
          <LoadingSpinner size="inline" />
        </Panel>
      ) : selectedExercise && calculations.length > 0 ? (
        <Panel
          title={`${selectedExerciseName} - Terhelés százalékok`}
          icon={TrendingUp}
          actions={
            <span className="text-sm font-normal text-muted">
              {calculations.filter((c) => c.oneRM).length} / {calculations.length} játékos
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted uppercase sticky left-0 bg-surface z-10">
                    Játékos
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted uppercase">
                    Mérés dátuma
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted uppercase bg-accent-soft">
                    1RM (100%)
                  </th>
                  {percentages.map((pct) => (
                    <th
                      key={pct}
                      className="px-3 py-3 text-center text-xs font-semibold text-muted uppercase"
                    >
                      {pct}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {calculations.map((calc) => (
                  <tr
                    key={calc.player.id}
                    className={`hover:bg-surface-2/50 transition-colors ${
                      !calc.oneRM ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-3 py-3 whitespace-nowrap sticky left-0 bg-surface z-10">
                      <div className="flex items-center gap-2">
                        {calc.player.jersey_number && (
                          <span className="font-mono text-sm font-semibold text-accent">
                            #{calc.player.jersey_number}
                          </span>
                        )}
                        <span className="text-fg font-medium">{calc.player.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {calc.lastMeasured ? (
                        <span className="text-fg text-sm">
                          {new Date(calc.lastMeasured).toLocaleDateString('hu-HU')}
                        </span>
                      ) : (
                        <span className="text-muted text-sm">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center bg-accent-soft">
                      {calc.oneRM ? (
                        <span className="font-mono text-lg font-semibold text-accent">{calc.oneRM}</span>
                      ) : (
                        <span className="text-muted text-sm">Nincs adat</span>
                      )}
                    </td>
                    {percentages.map((pct) => (
                      <td key={pct} className="px-3 py-3 text-center">
                        {calc.oneRM ? (
                          <span className="text-fg font-mono text-sm">
                            {calc.percentages[pct]}
                          </span>
                        ) : (
                          <span className="text-subtle">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info Box */}
          <div className="mt-4 rounded-[9px] bg-surface-2 p-4">
            <p className="text-sm text-fg">
              <strong>Használat:</strong> Az értékek az egyes játékosok legutóbbi 1RM mérésén alapulnak.
              Használd ezeket az értékeket az edzéstervek elkészítéséhez és a terhelés optimalizálásához.
            </p>
          </div>
        </Panel>
      ) : selectedExercise ? (
        <EmptyState
          icon={Dumbbell}
          title="Nincs adat"
          description="Ehhez a gyakorlathoz még nincs mérési adat rögzítve"
        />
      ) : (
        <EmptyState
          icon={Filter}
          title="Válassz gyakorlatot"
          description="Válassz egy gyakorlatot a táblázat használatához"
        />
      )}
    </div>
  )
}
