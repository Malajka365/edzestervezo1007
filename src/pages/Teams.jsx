import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTeams } from '../context/TeamContext'
import { supabase } from '../lib/supabase'
import { usePlayers } from '../hooks/usePlayers'
import { canEditModule } from '../lib/permissions'
import PlayerProfile from './PlayerProfile'
import TrainingLocations from '../components/TrainingLocations'
import TeamMembersPanel from '../components/TeamMembersPanel'
import {
  Users,
  Edit2,
  Trash2,
  UserPlus,
  X,
  Save,
  Calendar,
  Search,
  MapPin,
  MoreHorizontal,
} from 'lucide-react'
import { usePopover } from '../components/shell/usePopover'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import Skeleton from '../components/ui/Skeleton'
import { Field, Input, Textarea } from '../components/ui/Field'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import toast from 'react-hot-toast'

const EMPTY_PLAYER_FORM = {
  name: '',
  birth_date: '',
  position: '',
  jersey_number: '',
  notes: '',
}
const EMPTY_TEAM_FORM = { name: '', sport: '', description: '' }
const TEAM_FORM_ID = 'team-edit-form'
const PLAYER_FORM_ID = 'player-form'

const MENU_ITEM =
  'flex w-full items-center gap-2 rounded-[7px] px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

// "Csapat" túlcsordulás-menü: szerkesztés mindenkinek, törlés csak a tulajdonosnak.
function TeamMenu({ isOwner, onEdit, onDelete }) {
  const { open, close, toggle, ref } = usePopover()

  return (
    <div ref={ref} className="relative">
      <IconButton
        icon={MoreHorizontal}
        label="Csapat"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
      />
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-52 rounded-[10px] border border-line bg-surface p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close()
              onEdit()
            }}
            className={`${MENU_ITEM} text-fg`}
          >
            <Edit2 className="h-4 w-4 text-muted" aria-hidden="true" />
            Csapat szerkesztése
          </button>
          {isOwner && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                close()
                onDelete()
              }}
              className={`${MENU_ITEM} text-bad`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Csapat törlése
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Teams() {
  const { teams, selectedTeam, updateTeam, deleteTeam, isTeamOwner, currentUserPermissions } = useTeams()
  const canEditPlayers = canEditModule(currentUserPermissions, 'players')
  const queryClient = useQueryClient()
  // Players now come from the shared, cached usePlayers query. Mutations below
  // invalidate ['players', selectedTeam.id] so every screen refetches fresh.
  const { data: players = [], isLoading: loadingPlayers } = usePlayers(selectedTeam?.id)
  const [confirmState, setConfirmState] = useState(null)
  const [showTeamModal, setShowTeamModal] = useState(false)
    const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [showLocationsModal, setShowLocationsModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [editingPlayer, setEditingPlayer] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [teamForm, setTeamForm] = useState(EMPTY_TEAM_FORM)
  const [playerForm, setPlayerForm] = useState(EMPTY_PLAYER_FORM)

  // Invalidate the shared players cache so every screen (this one included)
  // refetches the up-to-date roster after a create/update/delete.
  const invalidatePlayers = () => {
    if (selectedTeam) {
      queryClient.invalidateQueries({ queryKey: ['players', selectedTeam.id] })
    }
  }

  const handleUpdateTeam = async (e) => {
    e.preventDefault()
    const result = await updateTeam(editingTeam.id, teamForm)
    if (result.success) {
      setShowTeamModal(false)
      setEditingTeam(null)
      setTeamForm(EMPTY_TEAM_FORM)
    }
  }

  const handleDeleteTeam = (teamId) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a csapatot? Minden játékos is törlődni fog!',
      action: async () => {
        await deleteTeam(teamId)
      },
    })
  }

  const openEditTeam = (team) => {
    setEditingTeam(team)
    setTeamForm({
      name: team.name,
      sport: team.sport || '',
      description: team.description || '',
    })
    setShowTeamModal(true)
  }

  // Üres szövegmezők NULL-ra alakítása a szám/dátum oszlopoknál — üres string
  // (pl. kitöltetlen születési dátum vagy mezszám) érvénytelen a date/integer
  // oszlopoknak és elhasalna a mentés.
  const sanitizePlayerForm = (form) => ({
    ...form,
    birth_date: form.birth_date || null,
    jersey_number: form.jersey_number === '' ? null : form.jersey_number,
  })

  const handleCreatePlayer = async (e) => {
    e.preventDefault()
    if (!selectedTeam) return

    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ ...sanitizePlayerForm(playerForm), team_id: selectedTeam.id }])
        .select()
        .single()

      if (error) throw error

      invalidatePlayers()
      setShowPlayerModal(false)
      setPlayerForm(EMPTY_PLAYER_FORM)
    } catch (error) {
      console.error('Error creating player:', error)
      toast.error('Hiba történt a játékos létrehozásakor')
    }
  }

  const handleUpdatePlayer = async (e) => {
    e.preventDefault()
    if (!editingPlayer) return

    try {
      const { data, error } = await supabase
        .from('players')
        .update({ ...sanitizePlayerForm(playerForm), updated_at: new Date().toISOString() })
        .eq('id', editingPlayer.id)
        .select()
        .single()

      if (error) throw error

      invalidatePlayers()
      setShowPlayerModal(false)
      setEditingPlayer(null)
      setPlayerForm(EMPTY_PLAYER_FORM)
    } catch (error) {
      console.error('Error updating player:', error)
      toast.error('Hiba történt a játékos frissítésekor')
    }
  }

  const handleDeletePlayer = (playerId) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a játékost?',
      action: async () => {
        try {
          const { error } = await supabase
            .from('players')
            .delete()
            .eq('id', playerId)

          if (error) throw error

          invalidatePlayers()
        } catch (error) {
          console.error('Error deleting player:', error)
          toast.error('Hiba történt a játékos törlésekor')
        }
      },
    })
  }

  const openEditPlayer = (player) => {
    setEditingPlayer(player)
    setPlayerForm({
      name: player.name,
      birth_date: player.birth_date || '',
      position: player.position || '',
      jersey_number: player.jersey_number || '',
      notes: player.notes || '',
    })
    setShowPlayerModal(true)
  }

  const closeModal = () => {
    setShowTeamModal(false)
    setShowPlayerModal(false)
    setEditingTeam(null)
    setEditingPlayer(null)
    setTeamForm(EMPTY_TEAM_FORM)
    setPlayerForm(EMPTY_PLAYER_FORM)
  }

  // The shared usePlayers query orders by name; this screen historically
  // displayed players by jersey number, so re-sort locally to preserve that.
  const filteredPlayers = players
    .filter((player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.jersey_number && player.jersey_number.toString().includes(searchQuery)) ||
      (player.position && player.position.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (a.jersey_number == null && b.jersey_number == null) return 0
      if (a.jersey_number == null) return 1
      if (b.jersey_number == null) return -1
      return Number(a.jersey_number) - Number(b.jersey_number)
    })

  // If a player is selected, show their profile
  if (selectedPlayer) {
    return (
      <PlayerProfile
        player={selectedPlayer}
        onBack={() => setSelectedPlayer(null)}
      />
    )
  }

  const description = selectedTeam
    ? `${selectedTeam.name} · ${players.length} játékos`
    : 'Játékosok kezelése'

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Játékosok"
        description={description}
        actions={
          selectedTeam && (
            <>
              {canEditPlayers && (
                <Button variant="primary" icon={UserPlus} onClick={() => setShowPlayerModal(true)}>
                  Új játékos
                </Button>
              )}
              <Button icon={MapPin} onClick={() => setShowLocationsModal(true)}>
                Helyszínek
              </Button>
              <TeamMenu
                isOwner={isTeamOwner}
                onEdit={() => openEditTeam(selectedTeam)}
                onDelete={() => handleDeleteTeam(selectedTeam.id)}
              />
            </>
          )
        }
      />

      <div className="space-y-6">
        {/* Játékosok */}
        {selectedTeam && (
          <Panel title="Játékosok" icon={Users}>
            {/* Keresés */}
            <div className="mb-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Keresés név, mezszám vagy poszt szerint..."
                  aria-label="Játékosok keresése"
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <IconButton
                    icon={X}
                    label="Keresés törlése"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  />
                )}
              </div>
              {searchQuery && (
                <p className="mt-2 text-sm text-muted">
                  {filteredPlayers.length} találat "{searchQuery}" keresésre
                </p>
              )}
            </div>

            {loadingPlayers ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            ) : players.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Még nincs játékos"
                description="Ebben a csapatban még nincs egyetlen játékos sem rögzítve."
                actionLabel={canEditPlayers ? 'Játékos hozzáadása' : undefined}
                onAction={canEditPlayers ? () => setShowPlayerModal(true) : undefined}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPlayer(player)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedPlayer(player)
                      }
                    }}
                    className="cursor-pointer rounded-[10px] border border-line bg-surface-2 p-4 transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-semibold text-fg">{player.name}</h4>
                        {player.position && (
                          <p className="truncate text-sm text-muted">{player.position}</p>
                        )}
                      </div>
                      {player.jersey_number && (
                        <span className="ml-2 font-mono text-2xl font-medium text-accent">
                          #{player.jersey_number}
                        </span>
                      )}
                    </div>

                    <div className="mb-3 space-y-1 text-xs text-muted">
                      {player.birth_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          <span>{new Date(player.birth_date).toLocaleDateString('hu-HU')}</span>
                        </div>
                      )}
                    </div>

                    {canEditPlayers && (
                      <div className="flex items-center gap-2 border-t border-line pt-3">
                        <Button
                          size="sm"
                          icon={Edit2}
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditPlayer(player)
                          }}
                        >
                          Szerkeszt
                        </Button>
                        <IconButton
                          icon={Trash2}
                          label="Játékos törlése"
                          className="text-bad hover:bg-bad-soft hover:text-bad"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePlayer(player.id)
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        )}

        {selectedTeam && <TeamMembersPanel team={selectedTeam} isOwner={isTeamOwner} />}

        {!selectedTeam && teams.length > 0 && (
          <EmptyState
            icon={Users}
            title="Válassz egy csapatot a felső menüből"
            description="A játékosok megjelenítéséhez először válassz ki egy csapatot"
          />
        )}
      </div>

      {/* Csapat szerkesztése */}
      <Modal
        open={showTeamModal}
        onClose={closeModal}
        title="Csapat szerkesztése"
        size="sm"
        footer={
          <>
            <Button onClick={closeModal}>Mégse</Button>
            <Button type="submit" form={TEAM_FORM_ID} variant="primary" icon={Save}>
              Mentés
            </Button>
          </>
        }
      >
        <form id={TEAM_FORM_ID} onSubmit={handleUpdateTeam} className="grid gap-4">
          <Field label="Csapat neve *" htmlFor="edit-team-name">
            <Input
              id="edit-team-name"
              type="text"
              value={teamForm.name}
              onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              required
              placeholder="pl. U19 Férfi"
            />
          </Field>
          <Field label="Sportág" htmlFor="edit-team-sport">
            <Input
              id="edit-team-sport"
              type="text"
              value={teamForm.sport}
              onChange={(e) => setTeamForm({ ...teamForm, sport: e.target.value })}
              placeholder="pl. Labdarúgás, Kézilabda"
            />
          </Field>
          <Field label="Leírás" htmlFor="edit-team-description">
            <Textarea
              id="edit-team-description"
              value={teamForm.description}
              onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
              className="resize-none"
              rows={3}
              placeholder="Rövid leírás a csapatról..."
            />
          </Field>
        </form>
      </Modal>

      {/* Játékos hozzáadása / szerkesztése */}
      <Modal
        open={showPlayerModal}
        onClose={closeModal}
        title={editingPlayer ? 'Játékos szerkesztése' : 'Új játékos'}
        size="lg"
        footer={
          <>
            <Button onClick={closeModal}>Mégse</Button>
            <Button type="submit" form={PLAYER_FORM_ID} variant="primary" icon={Save}>
              {editingPlayer ? 'Mentés' : 'Létrehozás'}
            </Button>
          </>
        }
      >
        <form
          id={PLAYER_FORM_ID}
          onSubmit={editingPlayer ? handleUpdatePlayer : handleCreatePlayer}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <Field label="Név *" htmlFor="player-name">
              <Input
                id="player-name"
                type="text"
                value={playerForm.name}
                onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                required
                placeholder="Játékos teljes neve"
              />
            </Field>
          </div>
          <Field label="Születési dátum" htmlFor="player-birth-date">
            <Input
              id="player-birth-date"
              type="date"
              value={playerForm.birth_date}
              onChange={(e) => setPlayerForm({ ...playerForm, birth_date: e.target.value })}
            />
          </Field>
          <Field label="Mezszám" htmlFor="player-jersey">
            <Input
              id="player-jersey"
              type="number"
              value={playerForm.jersey_number}
              onChange={(e) => setPlayerForm({ ...playerForm, jersey_number: e.target.value })}
              placeholder="pl. 10"
              min="0"
              max="99"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Poszt" htmlFor="player-position">
              <Input
                id="player-position"
                type="text"
                value={playerForm.position}
                onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                placeholder="pl. Középpályás, Csatár"
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Jegyzetek" htmlFor="player-notes">
              <Textarea
                id="player-notes"
                value={playerForm.notes}
                onChange={(e) => setPlayerForm({ ...playerForm, notes: e.target.value })}
                className="resize-none"
                rows={3}
                placeholder="További információk a játékosról..."
              />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Helyszínek */}
      <Modal
        open={showLocationsModal && !!selectedTeam}
        onClose={() => setShowLocationsModal(false)}
        title={`Helyszínek – ${selectedTeam?.name ?? ''}`}
        size="xl"
      >
        {selectedTeam && <TrainingLocations teamId={selectedTeam.id} />}
      </Modal>

      <ConfirmDialog
        open={!!confirmState}
        title="Törlés megerősítése"
        message={confirmState?.message}
        onConfirm={async () => {
          await confirmState.action()
          setConfirmState(null)
        }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}
