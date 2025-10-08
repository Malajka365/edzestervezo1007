import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import {
  Calculator,
  Download,
  Filter,
  TrendingUp,
  User,
  Dumbbell,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function TrainingLoad() {
  const { selectedTeam } = useTeams()
  const [loading, setLoading] = useState(false)
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [players, setPlayers] = useState([])
  const [calculations, setCalculations] = useState([])

  // Percentage columns to display (descending order, excluding 100% as it equals 1RM)
  const percentages = [97.5, 95, 92.5, 90, 87.5, 85, 82.5, 80, 75, 70, 65, 60, 55, 50]

  useEffect(() => {
    if (selectedTeam) {
      fetchExercises()
      fetchPlayers()
    }
  }, [selectedTeam])

  useEffect(() => {
    if (selectedExercise && players.length > 0) {
      fetchLatest1RM()
    }
  }, [selectedExercise, players])

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('unit', 'kg')
        .order('name')

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error('Error fetching exercises:', error)
    }
  }

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('jersey_number')

      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error('Error fetching players:', error)
    }
  }

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

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('landscape')
      const exercise = exercises.find((e) => e.id === selectedExercise)

      if (!exercise) {
        console.error('Exercise not found')
        return
      }

      // Title
      doc.setFontSize(18)
      doc.text(`${selectedTeam.name} - ${exercise.name} - 1RM Százalék Kalkulátor`, 14, 15)

      // Date
      doc.setFontSize(10)
      doc.text(`Generálva: ${new Date().toLocaleDateString('hu-HU')}`, 14, 22)

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

      if (rows.length === 0) {
        console.error('No data to export')
        alert('Nincs exportálható adat!')
        return
      }

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          fontSize: 8,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 35 }, // Name
          1: { cellWidth: 22 }, // Date
          2: { cellWidth: 20, fontStyle: 'bold', fillColor: [219, 234, 254] }, // 1RM highlighted
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      })

      // Save PDF
      const fileName = `${selectedTeam.name}_${exercise.name.replace(/\s+/g, '_')}_1RM_${new Date().toISOString().split('T')[0]}.pdf`
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
        <Calculator className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Válassz csapatot</h3>
        <p className="text-slate-400">Válassz egy csapatot a fejlécben az 1RM kalkulátor használatához</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Calculator className="w-8 h-8 text-primary-400" />
            <span>1RM Százalék Kalkulátor</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Tervezd meg az edzés terhelést a játékosok legutóbbi 1RM értékei alapján
          </p>
        </div>
      </div>

      {/* Filter Bar */}
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
              <option value="">Válassz gyakorlatot...</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </div>
          {selectedExercise && calculations.length > 0 && (
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

      {/* Results Table */}
      {loading ? (
        <div className="card text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-400">Betöltés...</p>
        </div>
      ) : selectedExercise && calculations.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-white">
                {exercises.find((e) => e.id === selectedExercise)?.name} - Terhelés Százalékok
              </h3>
            </div>
            <div className="text-sm text-slate-400">
              {calculations.filter((c) => c.oneRM).length} / {calculations.length} játékos
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase sticky left-0 bg-slate-800 z-10">
                    Játékos
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-400 uppercase">
                    Mérés dátuma
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-400 uppercase bg-primary-900/30">
                    1RM (100%)
                  </th>
                  {percentages.map((pct) => (
                    <th
                      key={pct}
                      className="px-3 py-3 text-center text-xs font-semibold text-slate-400 uppercase"
                    >
                      {pct}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {calculations.map((calc) => (
                  <tr
                    key={calc.player.id}
                    className={`hover:bg-slate-700/50 transition-colors ${
                      !calc.oneRM ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="px-3 py-3 whitespace-nowrap sticky left-0 bg-slate-800 z-10">
                      <div className="flex items-center space-x-2">
                        {calc.player.jersey_number && (
                          <span className="text-sm font-bold text-primary-400">
                            #{calc.player.jersey_number}
                          </span>
                        )}
                        <span className="text-white font-medium">{calc.player.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {calc.lastMeasured ? (
                        <span className="text-slate-300 text-sm">
                          {new Date(calc.lastMeasured).toLocaleDateString('hu-HU')}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center bg-primary-900/20">
                      {calc.oneRM ? (
                        <span className="text-lg font-bold text-primary-400">{calc.oneRM}</span>
                      ) : (
                        <span className="text-slate-500 text-sm">Nincs adat</span>
                      )}
                    </td>
                    {percentages.map((pct) => (
                      <td key={pct} className="px-3 py-3 text-center">
                        {calc.oneRM ? (
                          <span className="text-white font-mono text-sm">
                            {calc.percentages[pct]}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-300">
              <strong>Használat:</strong> Az értékek az egyes játékosok legutóbbi 1RM mérésén alapulnak.
              Használd ezeket az értékeket az edzéstervek elkészítéséhez és a terhelés optimalizálásához.
            </p>
          </div>
        </div>
      ) : selectedExercise ? (
        <div className="card text-center py-12">
          <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Nincs adat</h3>
          <p className="text-slate-400">
            Ehhez a gyakorlathoz még nincs mérési adat rögzítve
          </p>
        </div>
      ) : (
        <div className="card text-center py-12">
          <Filter className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Válassz gyakorlatot</h3>
          <p className="text-slate-400">Válassz egy gyakorlatot a kalkulátor használatához</p>
        </div>
      )}
    </div>
  )
}
