import { Users } from 'lucide-react'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

const CHECKBOX =
  'h-5 w-5 rounded border-line-strong bg-surface-2 text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0'

export default function PlayerSelectionModal({
  players,
  selectedPlayers,
  toggleAllPlayers,
  togglePlayerSelection,
  proceedToTeamMeasurement,
  setShowPlayerSelectionModal,
}) {
  const close = () => setShowPlayerSelectionModal(false)

  return (
    <Modal
      open
      onClose={close}
      title="Játékosok kiválasztása"
      size="lg"
      footer={
        <>
          <Button onClick={close}>Mégse</Button>
          <Button
            variant="primary"
            icon={Users}
            onClick={proceedToTeamMeasurement}
            disabled={selectedPlayers.length === 0}
          >
            Tovább a felméréshez ({selectedPlayers.length})
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">
        Válaszd ki, mely játékosok felmérését szeretnéd rögzíteni
      </p>

      <div className="space-y-4">
        {/* Select All */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={selectedPlayers.length === players.length}
              onChange={toggleAllPlayers}
              className={CHECKBOX}
            />
            <span className="font-semibold text-fg">Összes kiválasztása ({players.length})</span>
          </label>
          <span className="text-sm text-muted">{selectedPlayers.length} kiválasztva</span>
        </div>

        {/* Players List */}
        <div className="max-h-96 space-y-2 overflow-y-auto pr-2">
          {players.map((player) => (
            <label
              key={player.id}
              className={`flex cursor-pointer items-center gap-3 rounded-[9px] border p-3 transition-colors ${
                selectedPlayers.includes(player.id)
                  ? 'border-accent bg-accent-soft'
                  : 'border-transparent bg-surface-2 hover:bg-surface-3'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPlayers.includes(player.id)}
                onChange={() => togglePlayerSelection(player.id)}
                className={CHECKBOX}
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3">
                {player.jersey_number && (
                  <span className="font-mono text-lg font-semibold text-accent">
                    #{player.jersey_number}
                  </span>
                )}
                <span className="font-medium text-fg">{player.name}</span>
                {player.position && <span className="text-sm text-muted">• {player.position}</span>}
              </div>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}
