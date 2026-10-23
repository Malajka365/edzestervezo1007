import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import { usePlayers } from '../hooks/usePlayers'
import { useExercises } from '../hooks/useExercises'
import {
  Trophy,
  Medal,
  TrendingUp,
  Award,
  Download,
} from 'lucide-react'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { Select } from '../components/ui/Field'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import LoadingSpinner from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import { exportTablePdf } from '../lib/pdfExport'

export default function Leaderboard() {
  const { selectedTeam } = useTeams()
  // Players come from the shared, cached usePlayers query (was fetched inline
  // inside fetchLeaderboard). The leaderboard is recomputed once they load.
  const { data: players = [] } = usePlayers(selectedTeam?.id)
  // Exercises come from the shared, cached useExercises query. The leaderboard
  // only ranks weight-based lifts, so filter to `unit === 'kg'` (excluding the
  // player_params catalog) client-side — the same subset the old inline fetch
  // returned, preserving the name ordering the hook already applies.
  const { data: allExercises = [] } = useExercises()
  const exercises = useMemo(
    () => allExercises.filter((e) => e.unit === 'kg' && e.category !== 'player_params'),
    [allExercises]
  )
  const [selectedExercise, setSelectedExercise] = useState('')
  const [leaderboardData, setLeaderboardData] = useState([])
  const [loading, setLoading] = useState(false)

  // Auto-select the first exercise once the catalog loads (was done inside the
  // old fetchExercises). Only sets a default when nothing is selected yet.
  useEffect(() => {
    if (exercises.length > 0 && !selectedExercise) {
      setSelectedExercise(exercises[0].id)
    }
  }, [exercises, selectedExercise])

  useEffect(() => {
    if (selectedExercise && selectedTeam && players.length > 0) {
      fetchLeaderboard()
    }
  }, [selectedExercise, selectedTeam, players])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      // Players come from the shared usePlayers hook (see component top).

      // Get latest body weight for each player
      const { data: bodyWeights, error: weightError } = await supabase
        .from('measurements')
        .select('player_id, value, measured_at')
        .eq('team_id', selectedTeam.id)
        .eq('exercise_id', (await supabase.from('exercises').select('id').eq('name', 'Testsúly').single()).data?.id)
        .order('measured_at', { ascending: false })

      if (weightError) throw weightError

      // Get latest 1RM for selected exercise for each player
      const { data: measurements, error: measurementsError } = await supabase
        .from('measurements')
        .select('player_id, one_rm, measured_at')
        .eq('team_id', selectedTeam.id)
        .eq('exercise_id', selectedExercise)
        .not('one_rm', 'is', null)
        .order('measured_at', { ascending: false })

      if (measurementsError) throw measurementsError

      // Process data
      const leaderboard = []

      for (const player of players) {
        // Get latest body weight
        const latestWeight = bodyWeights
          ?.filter(w => w.player_id === player.id)
          .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))[0]

        // Get latest 1RM
        const latest1RM = measurements
          ?.filter(m => m.player_id === player.id)
          .sort((a, b) => new Date(b.measured_at) - new Date(a.measured_at))[0]

        if (latestWeight && latest1RM) {
          const bodyWeight = parseFloat(latestWeight.value)
          const oneRM = parseFloat(latest1RM.one_rm)
          const relativeStrength = (oneRM / bodyWeight).toFixed(2)

          leaderboard.push({
            player,
            bodyWeight: bodyWeight.toFixed(1),
            oneRM: oneRM.toFixed(1),
            relativeStrength: parseFloat(relativeStrength),
            measuredAt: latest1RM.measured_at,
          })
        }
      }

      // Sort by relative strength (descending)
      leaderboard.sort((a, b) => b.relativeStrength - a.relativeStrength)

      setLeaderboardData(leaderboard)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    } finally {
      setLoading(false)
    }
  }

  const getMedalIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-warn" aria-hidden="true" />
    if (rank === 2) return <Medal className="w-6 h-6 text-muted" />
    if (rank === 3) return <Medal className="w-6 h-6 text-warn" />
    return <span className="text-muted font-bold">#{rank}</span>
  }

  const getMedalColor = (rank) => {
    if (rank === 1) return 'bg-warn-soft border-warn'
    if (rank === 2) return 'bg-surface-2 border-line-strong'
    if (rank === 3) return 'bg-surface-2 border-warn'
    return 'bg-surface border-line'
  }

  const exportToPDF = async () => {
    const exercise = exercises.find((e) => e.id === selectedExercise)

    if (!exercise) {
      console.error('Exercise not found')
      return
    }

    // Table headers
    const headers = [
      'Helyezés',
      'Játékos',
      '1RM (kg)',
      'Testsúly (kg)',
      'Mérés dátuma',
      'Relatív\nErő',
    ]

    // Table data
    const rows = leaderboardData.map((entry, index) => [
      index + 1,
      entry.player.name,
      entry.oneRM,
      entry.bodyWeight,
      new Date(entry.measuredAt).toLocaleDateString('hu-HU'),
      entry.relativeStrength,
    ])

    await exportTablePdf({
      title: `${selectedTeam.name} - ${exercise.name} - Ranglista`,
      subtitles: [
        `Testsúly arányos erő (Relatív erő = 1RM / Testsúly)`,
        `Generálva: ${new Date().toLocaleDateString('hu-HU')}`,
      ],
      columns: headers,
      rows,
      startY: 35,
      headStyles: { fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' }, // Helyezés
        1: { cellWidth: 50 }, // Játékos
        2: { cellWidth: 24, halign: 'center' }, // 1RM
        3: { cellWidth: 28, halign: 'center' }, // Testsúly
        4: { cellWidth: 30, halign: 'center' }, // Dátum
        5: { cellWidth: 26, halign: 'center', fontStyle: 'bold', fillColor: [219, 234, 254] }, // Relatív Erő
      },
      didParseCell: function(data) {
        // Highlight top 3
        if (data.section === 'body' && data.column.index === 0) {
          const rank = data.cell.raw
          if (rank === 1) {
            data.cell.styles.fillColor = [255, 215, 0, 0.3] // Gold
            data.cell.styles.fontStyle = 'bold'
          } else if (rank === 2) {
            data.cell.styles.fillColor = [192, 192, 192, 0.3] // Silver
            data.cell.styles.fontStyle = 'bold'
          } else if (rank === 3) {
            data.cell.styles.fillColor = [205, 127, 50, 0.3] // Bronze
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
      filename: `${selectedTeam.name}_${exercise.name.replace(/\s+/g, '_')}_Ranglista_${new Date().toISOString().split('T')[0]}.pdf`,
    })
  }

  if (!selectedTeam) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="Ranglista" description="Relatív megerősödés alapján - 1RM / Testsúly" />
        <EmptyState
          icon={Trophy}
          title="Nincs kiválasztott csapat"
          description="Válassz ki egy csapatot a folytatáshoz."
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Ranglista"
        description={`${selectedTeam.name} · Relatív megerősödés alapján - 1RM / Testsúly`}
        actions={
          <>
            {exercises.length > 0 && (
              <Select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                aria-label="Gyakorlat"
                className="min-w-[200px]"
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </Select>
            )}
            {selectedExercise && leaderboardData.length > 0 && (
              <Button variant="primary" icon={Download} onClick={exportToPDF}>
                PDF exportálás
              </Button>
            )}
          </>
        }
      />

      {/* Leaderboard */}
      {loading ? (
        <Panel>
          <LoadingSpinner size="inline" />
        </Panel>
      ) : leaderboardData.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Nincs adat"
          description="Ehhez a gyakorlathoz még nincs mérési adat vagy testsúly adat rögzítve"
        />
      ) : (
        <Panel
          title={`${exercises.find((e) => e.id === selectedExercise)?.name} - Ranglista`}
          icon={TrendingUp}
          actions={<span className="text-sm font-normal text-muted">{leaderboardData.length} játékos</span>}
        >
          <div className="space-y-3">
            {leaderboardData.map((entry, index) => {
              const rank = index + 1
              return (
                <div
                  key={entry.player.id}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-3 p-4 rounded-[9px] border transition-colors ${getMedalColor(rank)}`}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12">
                    {getMedalIcon(rank)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-[140px]">
                    <div className="flex items-center gap-2">
                      {entry.player.jersey_number && (
                        <span className="font-mono text-lg font-semibold text-accent">
                          #{entry.player.jersey_number}
                        </span>
                      )}
                      <span className="text-fg font-semibold text-lg">
                        {entry.player.name}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <div className="text-center">
                      <div className="text-muted text-xs mb-1">1RM</div>
                      <div className="text-fg font-semibold">{entry.oneRM} kg</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted text-xs mb-1">Testsúly</div>
                      <div className="text-fg font-semibold">{entry.bodyWeight} kg</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted text-xs mb-1">Mérés dátuma</div>
                      <div className="text-fg font-medium">
                        {new Date(entry.measuredAt).toLocaleDateString('hu-HU')}
                      </div>
                    </div>
                    <div className="text-center bg-accent-soft px-4 py-2 rounded-[9px]">
                      <div className="text-accent text-xs mb-1">Relatív erő</div>
                      <div className="font-mono text-accent font-semibold text-xl">
                        {entry.relativeStrength}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Info Box */}
          <div className="mt-6 rounded-[9px] bg-surface-2 p-4">
            <p className="text-sm text-fg">
              <strong>Relatív erő:</strong> Az 1RM és a testsúly aránya. Minél magasabb az érték,
              annál erősebb a játékos a saját testsúlyához képest. Ez objektívebb összehasonlítást
              tesz lehetővé különböző testsúlyú játékosok között.
            </p>
          </div>
        </Panel>
      )}
    </div>
  )
}
