import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import PlayerProfileRehab from './PlayerProfileRehab'
import TeamAttendanceCalendar from '../components/TeamAttendanceCalendar'
import {
  Users,
  Search,
  Heart,
  FileText,
  Calendar as CalendarIcon,
  Plus,
  ClipboardList,
  LayoutGrid,
  ArrowLeft,
  User,
} from 'lucide-react'
import TeamSelector from '../components/TeamSelector'

export default function Rehabilitation() {
  const { selectedTeam } = useTeams()
  const [players, setPlayers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [playerActiveTab, setPlayerActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalPlayers: 0,
    withAnamnesis: 0,
    recentDocuments: 0,
  })

  useEffect(() => {
    if (selectedTeam) {
      fetchPlayers()
      fetchStats()
    }
  }, [selectedTeam])

  useEffect(() => {
    if (players.length > 0) {
      fetchStats()
    }
  }, [players])

  const fetchPlayers = async () => {
    if (!selectedTeam) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('name', { ascending: true })

      if (error) throw error
      setPlayers(data || [])
    } catch (error) {
      console.error('Error fetching players:', error)
    } finally {
      setLoading(false)
    }
  }

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

  if (!selectedTeam) {
    return (
      <div className="card text-center py-12">
        <Heart className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Válassz csapatot</h2>
        <p className="text-slate-400">
          A rehabilitációs modul használatához először válassz egy csapatot.
        </p>
      </div>
    )
  }

  const mainTabs = [
    { id: 'overview', name: 'Áttekintés', icon: LayoutGrid },
    { id: 'attendance', name: 'Csapat Jelenlét', icon: CalendarIcon },
  ]

  const playerTabs = [
    { id: 'overview', name: 'Áttekintés', icon: User },
    { id: 'anamnesis', name: 'Amnézis', icon: ClipboardList },
    { id: 'documents', name: 'Dokumentumok', icon: FileText },
    { id: 'attendance', name: 'Jelenlét', icon: CalendarIcon },
  ]

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header - Dashboard stílusban */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-4 gap-4 flex-wrap lg:flex-nowrap">
          {/* Bal oldal */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {selectedPlayer ? (
              <>
                <button
                  onClick={handleBackToOverview}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-6 h-6 text-white" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-white">{selectedPlayer.name}</h1>
                  <p className="text-sm text-slate-400">
                    {selectedPlayer.position && `${selectedPlayer.position} • `}
                    {selectedPlayer.jersey_number && `#${selectedPlayer.jersey_number}`}
                  </p>
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white">Rehabilitáció</h1>
                <p className="text-sm text-slate-400 hidden sm:block">Sérülések és gyógyulás</p>
              </div>
            )}
          </div>

          {/* Közép: Tab menü */}
          <div className="flex gap-2">
            {selectedPlayer ? (
              playerTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setPlayerActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                      playerActiveTab === tab.id
                        ? 'text-primary-400 border-primary-400'
                        : 'text-slate-400 border-transparent hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                )
              })
            ) : (
              mainTabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'text-primary-400 border-primary-400'
                        : 'text-slate-400 border-transparent hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                )
              })
            )}
          </div>

          {/* Jobb oldal: Team Selector */}
          <div className="flex-shrink-0 w-full sm:w-auto order-3 lg:order-none">
            <TeamSelector />
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedPlayer ? (
          <PlayerProfileRehab
            player={selectedPlayer}
            activeTab={playerActiveTab}
            setActiveTab={setPlayerActiveTab}
          />
        ) : activeTab === 'overview' ? (
          <div className="p-6 space-y-6">
          {/* Header with Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Összes játékos</p>
              <p className="text-3xl font-bold text-white">{stats.totalPlayers}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Amnézissal</p>
              <p className="text-3xl font-bold text-white">{stats.withAnamnesis}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Új dokumentumok (30 nap)</p>
              <p className="text-3xl font-bold text-white">{stats.recentDocuments}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Players List */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Játékosok</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Keresés név alapján..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-slate-400 mt-4">Betöltés...</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nincs találat</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className="card hover:border-primary-500 transition-all duration-200 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {player.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white mb-1 truncate">{player.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      {player.jersey_number && (
                        <span>#{player.jersey_number}</span>
                      )}
                      {player.position && (
                        <span>{player.position}</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
          </div>
        ) : activeTab === 'attendance' ? (
          <div className="p-6">
            <TeamAttendanceCalendar teamId={selectedTeam.id} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
