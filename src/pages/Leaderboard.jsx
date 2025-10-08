import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import {
  Trophy,
  Medal,
  TrendingUp,
  Filter,
  Award,
  User,
  Download,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Leaderboard() {
  const { selectedTeam } = useTeams()
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [leaderboardData, setLeaderboardData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedTeam) {
      fetchExercises()
    }
  }, [selectedTeam])

  useEffect(() => {
    if (selectedExercise && selectedTeam) {
      fetchLeaderboard()
    }
  }, [selectedExercise, selectedTeam])

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('unit', 'kg')
        .neq('category', 'player_params')
        .order('name')

      if (error) throw error
      setExercises(data || [])
      if (data && data.length > 0) {
        setSelectedExercise(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      // Get all players from the team
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, jersey_number')
        .eq('team_id', selectedTeam.id)

      if (playersError) throw playersError

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
    } finally {
      setLoading(false)
    }
  }

  const getMedalIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-400" />
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />
    return <span className="text-slate-500 font-bold">#{rank}</span>
  }

  const getMedalColor = (rank) => {
    if (rank === 1) return 'bg-yellow-500/20 border-yellow-500'
    if (rank === 2) return 'bg-slate-500/20 border-slate-400'
    if (rank === 3) return 'bg-amber-600/20 border-amber-600'
    return 'bg-slate-800 border-slate-700'
  }

  const exportToPDF = () => {
    try {
      const doc = new jsPDF()
      const exercise = exercises.find((e) => e.id === selectedExercise)

      if (!exercise) {
        console.error('Exercise not found')
        return
      }

      // Title
      doc.setFontSize(18)
      doc.text(`${selectedTeam.name} - ${exercise.name} - Ranglista`, 14, 15)

      // Subtitle
      doc.setFontSize(10)
      doc.text(`Testsúly arányos erő (Relatív erő = 1RM / Testsúly)`, 14, 22)
      doc.text(`Generálva: ${new Date().toLocaleDateString('hu-HU')}`, 14, 28)

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

      if (rows.length === 0) {
        console.error('No data to export')
        alert('Nincs exportálható adat!')
        return
      }

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
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
          0: { cellWidth: 22, halign: 'center' }, // Helyezés
          1: { cellWidth: 50 }, // Játékos
          2: { cellWidth: 24, halign: 'center' }, // 1RM
          3: { cellWidth: 28, halign: 'center' }, // Testsúly
          4: { cellWidth: 30, halign: 'center' }, // Dátum
          5: { cellWidth: 26, halign: 'center', fontStyle: 'bold', fillColor: [219, 234, 254] }, // Relatív Erő
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
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
      })

      // Save PDF
      const fileName = `${selectedTeam.name}_${exercise.name.replace(/\s+/g, '_')}_Ranglista_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      console.log('PDF exported successfully:', fileName)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      alert('Hiba történt a PDF exportálás során!')
    }
  }

  if (!selectedTeam) {
    return (
      <div className="card text-center py-12">
        <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Válassz csapatot</h3>
        <p className="text-slate-400">Válassz egy csapatot a fejlécben a ranglista megtekintéséhez</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <span>Ranglista</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Testsúly arányos erő (Relatív erő = 1RM / Testsúly)
          </p>
        </div>
      </div>

      {/* Exercise Selection */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">Gyakorlat Kiválasztása</h3>
        </div>
        <div className="flex items-center space-x-4 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-slate-300 mb-2">Gyakorlat</label>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="input-field"
            >
              {exercises.length === 0 ? (
                <option value="">Nincs kg-os gyakorlat</option>
              ) : (
                exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))
              )}
            </select>
          </div>
          {selectedExercise && leaderboardData.length > 0 && (
            <div className="flex items-end">
              <button
                onClick={exportToPDF}
                className="btn-primary flex items-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>PDF Exportálás</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Betöltés...</p>
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="card text-center py-12">
          <Award className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nincs adat</h3>
          <p className="text-slate-400">
            Ehhez a gyakorlathoz még nincs mérési adat vagy testsúly adat rögzítve
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">
                {exercises.find((e) => e.id === selectedExercise)?.name} - Ranglista
              </h3>
            </div>
            <div className="text-sm text-slate-400">
              {leaderboardData.length} játékos
            </div>
          </div>

          <div className="space-y-3">
            {leaderboardData.map((entry, index) => {
              const rank = index + 1
              return (
                <div
                  key={entry.player.id}
                  className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all ${getMedalColor(rank)} ${
                    rank <= 3 ? 'shadow-lg' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12">
                    {getMedalIcon(rank)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {entry.player.jersey_number && (
                        <span className="text-lg font-bold text-primary-400">
                          #{entry.player.jersey_number}
                        </span>
                      )}
                      <span className="text-white font-semibold text-lg">
                        {entry.player.name}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <div className="text-slate-400 text-xs mb-1">1RM</div>
                      <div className="text-white font-bold">{entry.oneRM} kg</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400 text-xs mb-1">Testsúly</div>
                      <div className="text-white font-bold">{entry.bodyWeight} kg</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400 text-xs mb-1">Mérés dátuma</div>
                      <div className="text-slate-300 font-medium">
                        {new Date(entry.measuredAt).toLocaleDateString('hu-HU')}
                      </div>
                    </div>
                    <div className="text-center bg-primary-900/30 px-4 py-2 rounded-lg">
                      <div className="text-primary-300 text-xs mb-1">Relatív Erő</div>
                      <div className="text-primary-400 font-bold text-xl">
                        {entry.relativeStrength}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-300">
              <strong>Relatív Erő:</strong> Az 1RM és a testsúly aránya. Minél magasabb az érték, 
              annál erősebb a játékos a saját testsúlyához képest. Ez objektívebb összehasonlítást 
              tesz lehetővé különböző testsúlyú játékosok között.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
