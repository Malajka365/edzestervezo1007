import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'
import { toMatchRow } from '../lib/matches'
import {
  Plus,
  Calendar,
  MapPin,
  Trophy,
  Home as HomeIcon,
  Plane,
  Edit,
  Trash2,
  Clock,
} from 'lucide-react'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import StatusPill from '../components/ui/StatusPill'
import Tabs from '../components/ui/Tabs'
import EmptyState from '../components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'

export default function Matches() {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'matches')
  const [matches, setMatches] = useState([])
  const [filteredMatches, setFilteredMatches] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('all') // all, upcoming, past
  const [showModal, setShowModal] = useState(false)
  const [editingMatch, setEditingMatch] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmState, setConfirmState] = useState(null)

  useEffect(() => {
    if (selectedTeam) {
      fetchMatches()
    }
  }, [selectedTeam])

  useEffect(() => {
    filterMatches()
  }, [matches, selectedFilter])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('team_id', selectedTeam.id)
        .order('date', { ascending: true })

      if (error) throw error
      setMatches(data || [])
    } catch (error) {
      console.error('Error fetching matches:', error)
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    } finally {
      setLoading(false)
    }
  }

  const filterMatches = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let filtered = matches

    if (selectedFilter === 'upcoming') {
      filtered = filtered.filter(m => new Date(m.date) >= today)
    } else if (selectedFilter === 'past') {
      filtered = filtered.filter(m => new Date(m.date) < today)
    }

    setFilteredMatches(filtered)
  }

  const deleteMatch = (id, match) => {
    let confirmMessage = 'Biztosan törölni szeretnéd ezt a mérkőzést?'

    if (match?.created_from_macrocycle) {
      confirmMessage += '\n\nFigyelem: Ez a mérkőzés a makrociklusból lett létrehozva.\nA törlés NEM érinti a makrociklust, csak ezt a mérkőzés rekordot törli.'
    }

    setConfirmState({
      message: confirmMessage,
      action: async () => {
        try {
          const { error } = await supabase
            .from('matches')
            .delete()
            .eq('id', id)

          if (error) throw error
          fetchMatches()
        } catch (error) {
          console.error('Error deleting match:', error)
          toast.error('Hiba történt a törlés során!')
        }
      },
    })
  }

  const getMatchTypeLabel = (type) => {
    const labels = {
      friendly: 'Felkészülési',
      league: 'Bajnoki',
      cup: 'Kupa',
      tournament: 'Torna',
    }
    return labels[type] || type
  }

  const FILTER_TABS = [
    { id: 'all', label: 'Összes', icon: Trophy },
    { id: 'upcoming', label: 'Közelgő', icon: Calendar },
    { id: 'past', label: 'Lejátszott', icon: Clock },
  ]

  const openNewMatch = () => {
    setEditingMatch(null)
    setShowModal(true)
  }

  if (!selectedTeam) {
    return (
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <PageHeader title="Mérkőzések" description="Mérkőzések, elemzések és eredmények" />
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
        title="Mérkőzések"
        description={`${selectedTeam.name} · Mérkőzések, elemzések és eredmények`}
        actions={
          canEdit && (
            <Button variant="primary" icon={Plus} onClick={openNewMatch}>
              Új mérkőzés
            </Button>
          )
        }
        tabs={<Tabs items={FILTER_TABS} value={selectedFilter} onChange={setSelectedFilter} />}
      />

      <div className="space-y-6">

      {/* Matches List */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nincs még mérkőzés"
          description="Add hozzá az első mérkőzést a naptárhoz!"
          actionLabel={canEdit ? 'Első mérkőzés hozzáadása' : undefined}
          onAction={canEdit ? openNewMatch : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const isPast = new Date(match.date) < new Date()
            const hasResult = match.our_score !== null && match.opponent_score !== null

            return (
              <div
                key={match.id}
                className="rounded-[14px] border border-line bg-surface p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Date and Time */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2 text-muted">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(match.date).toLocaleDateString('hu-HU', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'long'
                          })}
                        </span>
                      </div>
                      {match.time && (
                        <>
                          <span className="text-subtle">•</span>
                          <div className="flex items-center gap-2 text-muted">
                            <Clock className="w-4 h-4" />
                            <span>{match.time}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Teams */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        {match.home_away === 'home' ? (
                          <HomeIcon className="w-5 h-5 text-ok" />
                        ) : (
                          <Plane className="w-5 h-5 text-accent" />
                        )}
                        <span className="text-lg font-semibold text-fg">
                          {selectedTeam.name}
                        </span>
                      </div>

                      <span className="text-2xl font-bold text-muted">vs</span>

                      <span className="text-lg font-semibold text-fg">
                        {match.opponent || '(Ellenfél nincs megadva)'}
                      </span>
                    </div>

                    {/* Result */}
                    {hasResult && (
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-sm text-muted">Eredmény:</span>
                        <div className="flex items-center gap-2 text-2xl font-bold">
                          <span className={match.our_score > match.opponent_score ? 'text-ok' : match.our_score < match.opponent_score ? 'text-bad' : 'text-warn'}>
                            {match.our_score}
                          </span>
                          <span className="text-subtle">:</span>
                          <span className={match.opponent_score > match.our_score ? 'text-ok' : match.opponent_score < match.our_score ? 'text-bad' : 'text-warn'}>
                            {match.opponent_score}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Location and Type */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {match.location && (
                        <div className="flex items-center gap-2 text-sm text-muted">
                          <MapPin className="w-4 h-4" />
                          <span>{match.location}</span>
                        </div>
                      )}
                      {match.type && (
                        <StatusPill status="neutral">{getMatchTypeLabel(match.type)}</StatusPill>
                      )}
                      {/* Macrocycle indicator */}
                      {match.created_from_macrocycle && (
                        <div className="flex items-center gap-1 text-xs text-accent bg-accent-soft px-2 py-1 rounded-full">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Makrociklus: Hét {(match.macrocycle_week_index || 0) + 1}, 
                            {' '}
                            {['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'][match.macrocycle_day_index || 0]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <IconButton
                        icon={Edit}
                        label="Szerkesztés"
                        onClick={() => {
                          setEditingMatch(match)
                          setShowModal(true)
                        }}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Törlés"
                        onClick={() => deleteMatch(match.id, match)}
                      />
                    </div>
                  )}
                </div>

                {/* Notes */}
                {match.notes && (
                  <div className="mt-3 rounded-[9px] bg-surface-2 p-3">
                    <p className="text-sm text-fg">{match.notes}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <MatchModal
          match={editingMatch}
          selectedTeam={selectedTeam}
          onClose={() => {
            setShowModal(false)
            setEditingMatch(null)
          }}
          onSave={() => {
            setShowModal(false)
            setEditingMatch(null)
            fetchMatches()
          }}
        />
      )}

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

// Match Modal Component
function MatchModal({ match, selectedTeam, onClose, onSave }) {
  const [formData, setFormData] = useState({
    date: match?.date || new Date().toISOString().split('T')[0],
    time: match?.time || '',
    location: match?.location || '',
    opponent: match?.opponent || '',
    type: match?.type || 'league',
    home_away: match?.home_away || 'home',
    our_score: match?.our_score ?? '',
    opponent_score: match?.opponent_score ?? '',
    notes: match?.notes || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSave = toMatchRow(formData)

      if (match) {
        // Update
        const { error } = await supabase
          .from('matches')
          .update(dataToSave)
          .eq('id', match.id)

        if (error) throw error
      } else {
        // Create
        const { error } = await supabase
          .from('matches')
          .insert([{
            ...dataToSave,
            team_id: selectedTeam.id,
          }])

        if (error) throw error
      }

      onSave()
    } catch (error) {
      console.error('Error saving match:', error)
      toast.error('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={match ? 'Mérkőzés szerkesztése' : 'Új mérkőzés'}
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Mégse</Button>
          <Button type="submit" form="match-form" variant="primary" disabled={loading}>
            {loading ? 'Mentés...' : 'Mentés'}
          </Button>
        </>
      }
    >
      <form id="match-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Dátum *" htmlFor="match-date">
            <Input
              id="match-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </Field>

          <Field label="Időpont" htmlFor="match-time">
            <Input
              id="match-time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Ellenfél *" htmlFor="match-opponent">
          <Input
            id="match-opponent"
            type="text"
            value={formData.opponent}
            onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
            placeholder="pl. Veszprém KC"
            required
          />
        </Field>

        <Field label="Helyszín" htmlFor="match-location">
          <Input
            id="match-location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="pl. Városi Sportcsarnok"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Típus" htmlFor="match-type">
            <Select
              id="match-type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="league">Bajnoki</option>
              <option value="cup">Kupa</option>
              <option value="friendly">Felkészülési</option>
              <option value="tournament">Torna</option>
            </Select>
          </Field>

          <Field label="Hazai/Idegen" htmlFor="match-home-away">
            <Select
              id="match-home-away"
              value={formData.home_away}
              onChange={(e) => setFormData({ ...formData, home_away: e.target.value })}
            >
              <option value="home">Hazai</option>
              <option value="away">Idegen</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-1.5">
          <span className="text-xs font-semibold text-muted">Eredmény (opcionális)</span>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              aria-label="Saját gólok"
              value={formData.our_score}
              onChange={(e) => setFormData({ ...formData, our_score: e.target.value })}
              placeholder="Saját gólok"
              min="0"
            />
            <Input
              type="number"
              aria-label="Ellenfél gólok"
              value={formData.opponent_score}
              onChange={(e) => setFormData({ ...formData, opponent_score: e.target.value })}
              placeholder="Ellenfél gólok"
              min="0"
            />
          </div>
        </div>

        <Field label="Megjegyzések" htmlFor="match-notes">
          <Textarea
            id="match-notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows="3"
            placeholder="Megjegyzések a mérkőzésről..."
          />
        </Field>
      </form>
    </Modal>
  )
}
