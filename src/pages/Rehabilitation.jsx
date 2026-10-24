import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import { usePlayers } from '../hooks/usePlayers'
import { canEditModule } from '../lib/permissions'
import PlayerProfileRehab from './PlayerProfileRehab'
import TeamAttendanceCalendar from '../components/TeamAttendanceCalendar'
import AvailabilityPill from '../components/availability/AvailabilityPill'
import AvailabilityEditor from '../components/availability/AvailabilityEditor'
import { useAvailability } from '../hooks/useAvailability'
import { availabilityOf } from '../lib/availability'
import {
  Users,
  Search,
  FileText,
  Calendar as CalendarIcon,
  Plus,
  ClipboardList,
  LayoutGrid,
  ArrowLeft,
  User,
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import Panel from '../components/ui/Panel'
import Tabs from '../components/ui/Tabs'
import { Input } from '../components/ui/Field'

export default function Rehabilitation() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'rehab')
  // Players come from the shared, cached usePlayers query (was a local fetch).
  const { data: players = [], isLoading: loading } = usePlayers(selectedTeam?.id)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [statusPlayer, setStatusPlayer] = useState(null)
  const { byPlayer } = useAvailability(selectedTeam?.id)
  const [activeTab, setActiveTab] = useState('overview')
  const [playerActiveTab, setPlayerActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalPlayers: 0,
    withAnamnesis: 0,
    recentDocuments: 0,
  })

  useEffect(() => {
    if (selectedTeam) {
      fetchStats()
    }
  }, [selectedTeam])

  useEffect(() => {
    if (players.length > 0) {
      fetchStats()
    }
  }, [players])

  const fetchStats = async () => {
    if (!selectedTeam) return

    try {
      // Összesített statisztikák lekérése
      const { data: anamnesisData } = await supabase
        .from('player_anamnesis')
        .select('player_id')
        .eq('team_id', selectedTeam.id)

      const { data: documentsData } = await supabase
        .from('player_documents')
        .select('id')
        .eq('team_id', selectedTeam.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Utolsó 30 nap

      setStats({
        totalPlayers: players.length,
        withAnamnesis: new Set(anamnesisData?.map(a => a.player_id)).size || 0,
        recentDocuments: documentsData?.length || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleBackToOverview = () => {
    setSelectedPlayer(null)
    setPlayerActiveTab('overview')
  }

  const mainTabs = [
    { id: 'overview', label: 'Áttekintés', icon: LayoutGrid },
    { id: 'attendance', label: 'Csapat jelenlét', icon: CalendarIcon },
  ]

  const playerTabs = [
    { id: 'overview', label: 'Áttekintés', icon: User },
    { id: 'anamnesis', label: 'Anamnézis', icon: ClipboardList },
    { id: 'documents', label: 'Dokumentumok', icon: FileText },
    { id: 'attendance', label: 'Jelenlét', icon: CalendarIcon },
  ]

  const statCards = [
    { label: 'Összes játékos', value: stats.totalPlayers, icon: Users, tile: 'bg-accent-soft text-accent' },
    { label: 'Anamnézissel', value: stats.withAnamnesis, icon: ClipboardList, tile: 'bg-ok-soft text-ok' },
    { label: 'Új dokumentumok (30 nap)', value: stats.recentDocuments, icon: FileText, tile: 'bg-surface-2 text-muted' },
  ]

  const playerDescription = selectedPlayer
    ? [
        selectedPlayer.position,
        selectedPlayer.jersey_number && `#${selectedPlayer.jersey_number}`,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Sérülések, anamnézis és jelenlét'

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        eyebrow={selectedPlayer ? 'Egészség' : undefined}
        title={selectedPlayer ? selectedPlayer.name : 'Egészség'}
        description={playerDescription}
        actions={
          selectedPlayer && (
            <Button icon={ArrowLeft} onClick={handleBackToOverview}>
              Vissza a játékosokhoz
            </Button>
          )
        }
        tabs={
          selectedPlayer ? (
            <Tabs items={playerTabs} value={playerActiveTab} onChange={setPlayerActiveTab} />
          ) : (
            <Tabs items={mainTabs} value={activeTab} onChange={setActiveTab} />
          )
        }
      />

      {selectedPlayer ? (
        <PlayerProfileRehab
          player={selectedPlayer}
          activeTab={playerActiveTab}
          setActiveTab={setPlayerActiveTab}
        />
      ) : activeTab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {statCards.map(({ label, value, icon: Icon, tile }) => (
              <Panel key={label}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-sm text-muted">{label}</p>
                    <p className="text-3xl font-bold text-fg">{value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[10px] ${tile}`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          <Panel
            title="Játékosok"
            actions={
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  aria-label="Keresés név alapján"
                  placeholder="Keresés név alapján..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            }
          >
            {loading ? (
              <LoadingSpinner size="inline" />
            ) : filteredPlayers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={searchQuery ? 'Nincs találat' : 'Még nincs játékos'}
                description={
                  searchQuery
                    ? 'Próbálj meg más keresési kifejezést.'
                    : 'A csapatodhoz még nem tartozik játékos, akihez rehabilitációs adatot rögzíthetnél.'
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="rounded-[12px] border border-line bg-surface-2 p-4 transition-colors hover:border-accent"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPlayer(player)}
                      className="flex w-full items-center gap-4 rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-xl font-bold text-accent">
                        {player.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 truncate font-semibold text-fg">{player.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted">
                          {player.jersey_number && <span>#{player.jersey_number}</span>}
                          {player.position && <span>{player.position}</span>}
                        </div>
                      </div>
                    </button>
                    <div className="mt-3 flex items-center gap-2">
                      <AvailabilityPill status={availabilityOf(byPlayer, player.id).status} />
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto"
                          aria-label={`${player.name} státusza`}
                          onClick={() => setStatusPlayer(player)}
                        >
                          Státusz
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : activeTab === 'attendance' ? (
        <TeamAttendanceCalendar teamId={selectedTeam.id} canEdit={canEdit} />
      ) : null}

      <AvailabilityEditor
        open={!!statusPlayer}
        onClose={() => setStatusPlayer(null)}
        player={statusPlayer}
        teamId={selectedTeam?.id}
      />
    </div>
  )
}
