import { Save, Users } from 'lucide-react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Field, Input, Select } from '../../components/ui/Field'

const TH = 'px-3 py-2 text-left text-xs font-semibold uppercase text-muted'

function PlayerCell({ player }) {
  return (
    <td className="whitespace-nowrap px-3 py-3">
      <div className="flex items-center gap-2">
        {player.jersey_number && (
          <span className="font-mono text-base font-semibold text-accent">
            #{player.jersey_number}
          </span>
        )}
        <span className="font-medium text-fg">{player.name}</span>
      </div>
    </td>
  )
}

export default function TeamMeasurementModal({
  players,
  exercises,
  selectedPlayers,
  teamMeasurementForm,
  setTeamMeasurementForm,
  setShowTeamMeasurementModal,
  handleCreateTeamMeasurement,
  updatePlayerData,
  calculate1RM,
}) {
  const close = () => setShowTeamMeasurementModal(false)
  const selectedExercise = teamMeasurementForm.exercise_id
    ? exercises.find((e) => e.id === teamMeasurementForm.exercise_id)
    : undefined
  const rows = players.filter((p) => selectedPlayers.includes(p.id))

  const notesCell = (player, playerData) => (
    <td className="px-3 py-3">
      <Input
        type="text"
        value={playerData.notes || ''}
        onChange={(e) => updatePlayerData(player.id, 'notes', e.target.value)}
        placeholder="Opcionális"
        aria-label={`Jegyzet: ${player.name}`}
      />
    </td>
  )

  let table
  if (selectedExercise?.unit === 'reps') {
    // Simplified table for "ismétlés" exercises
    table = (
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            <th className={TH}>Játékos</th>
            <th className={TH}>Ismétlések</th>
            <th className={TH}>Jegyzetek</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((player) => {
            const playerData = teamMeasurementForm.playerData[player.id] || {}
            return (
              <tr key={player.id} className="transition-colors hover:bg-surface-2/50">
                <PlayerCell player={player} />
                <td className="px-3 py-3">
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      value={playerData.value || ''}
                      onChange={(e) => updatePlayerData(player.id, 'value', e.target.value)}
                      placeholder="pl. 15"
                      aria-label={`Ismétlések: ${player.name}`}
                    />
                  </div>
                </td>
                {notesCell(player, playerData)}
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  } else if (selectedExercise && (selectedExercise.unit === 'cm' || selectedExercise.category === 'player_params')) {
    // Simplified table for "cm" exercises and player parameters (e.g., height, weight)
    table = (
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            <th className={TH}>Játékos</th>
            <th className={TH}>
              {selectedExercise.name} ({selectedExercise.unit})
            </th>
            <th className={TH}>Jegyzetek</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((player) => {
            const playerData = teamMeasurementForm.playerData[player.id] || {}
            return (
              <tr key={player.id} className="transition-colors hover:bg-surface-2/50">
                <PlayerCell player={player} />
                <td className="px-3 py-3">
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={playerData.value || ''}
                      onChange={(e) => updatePlayerData(player.id, 'value', e.target.value)}
                      placeholder={
                        selectedExercise.unit === 'kg'
                          ? 'pl. 75'
                          : selectedExercise.unit === 'cm'
                            ? 'pl. 180'
                            : 'pl. 15'
                      }
                      aria-label={`${selectedExercise.name}: ${player.name}`}
                    />
                  </div>
                </td>
                {notesCell(player, playerData)}
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  } else {
    // Full table for other exercises
    table = (
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            <th className={TH}>Játékos</th>
            <th className={TH}>Súly/Érték</th>
            <th className={TH}>Ismétlések</th>
            <th className={TH}>1RM</th>
            <th className={TH}>Jegyzetek</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((player) => {
            const playerData = teamMeasurementForm.playerData[player.id] || {}
            const calculated1RM =
              playerData.value && playerData.reps
                ? calculate1RM(parseFloat(playerData.value), parseInt(playerData.reps || 1))
                : null

            return (
              <tr key={player.id} className="transition-colors hover:bg-surface-2/50">
                <PlayerCell player={player} />
                <td className="px-3 py-3">
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.1"
                      value={playerData.value || ''}
                      onChange={(e) => updatePlayerData(player.id, 'value', e.target.value)}
                      placeholder="100"
                      aria-label={`Súly/érték: ${player.name}`}
                    />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="w-20">
                    <Input
                      type="number"
                      min="1"
                      value={playerData.reps || '1'}
                      onChange={(e) => updatePlayerData(player.id, 'reps', e.target.value)}
                      aria-label={`Ismétlések: ${player.name}`}
                    />
                  </div>
                </td>
                <td className="px-3 py-3">
                  {calculated1RM && selectedExercise?.unit !== 'reps' && selectedExercise?.unit !== 'cm' ? (
                    <span className="font-mono text-sm font-semibold text-accent">
                      {calculated1RM} {selectedExercise?.unit}
                    </span>
                  ) : (
                    <span className="text-sm text-muted">-</span>
                  )}
                </td>
                {notesCell(player, playerData)}
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  return (
    <Modal
      open
      onClose={close}
      title="Csapat felmérés"
      size="xl"
      footer={
        <>
          <Button onClick={close}>Mégse</Button>
          <Button type="submit" form="team-measurement-form" variant="primary" icon={Save}>
            Összes mérés rögzítése
          </Button>
        </>
      }
    >
      <form id="team-measurement-form" onSubmit={handleCreateTeamMeasurement}>
        <p className="mb-4 text-sm text-muted">Rögzítsd az egész csapat mérését egyszerre</p>

        {/* Common Fields */}
        <div className="grid grid-cols-1 gap-4 border-b border-line pb-4 md:grid-cols-2">
          <Field label="Gyakorlat *" htmlFor="team-measurement-exercise">
            <Select
              id="team-measurement-exercise"
              value={teamMeasurementForm.exercise_id}
              onChange={(e) =>
                setTeamMeasurementForm({ ...teamMeasurementForm, exercise_id: e.target.value })
              }
              required
            >
              <option value="">Válassz gyakorlatot</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name} ({exercise.unit})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dátum *" htmlFor="team-measurement-date">
            <Input
              id="team-measurement-date"
              type="date"
              value={teamMeasurementForm.measured_at}
              onChange={(e) =>
                setTeamMeasurementForm({ ...teamMeasurementForm, measured_at: e.target.value })
              }
              required
            />
          </Field>
        </div>

        {/* Players Table */}
        <h4 className="flex items-center gap-2 py-4 text-base font-semibold text-fg">
          <Users className="h-5 w-5 text-accent" aria-hidden="true" />
          Játékosok ({selectedPlayers.length})
        </h4>
        <div className="overflow-x-auto">{table}</div>
      </form>
    </Modal>
  )
}
