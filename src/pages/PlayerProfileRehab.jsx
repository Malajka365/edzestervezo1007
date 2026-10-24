import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import { canEditModule } from '../lib/permissions'
import { useAvailability } from '../hooks/useAvailability'
import { availabilityOf } from '../lib/availability'
import AvailabilityPill from '../components/availability/AvailabilityPill'
import AvailabilityEditor from '../components/availability/AvailabilityEditor'
import AvailabilityHistory from '../components/availability/AvailabilityHistory'
import AnamnesisForm from '../components/AnamnesisForm'
import DocumentUpload from '../components/DocumentUpload'
import AttendanceCalendar from '../components/AttendanceCalendar'
import BodyDiagram from '../components/BodyDiagram'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Panel from '../components/ui/Panel'
import StatusPill from '../components/ui/StatusPill'
import EmptyState from '../components/ui/EmptyState'
import toast from 'react-hot-toast'
import {
  FileText,
  Pencil,
  Eye,
  Trash2,
  Image as ImageIcon,
  Pill,
  Camera,
  Scissors,
} from 'lucide-react'

export default function PlayerProfileRehab({ player, activeTab, setActiveTab }) {
  const { selectedTeam, currentUserPermissions } = useTeams()
  const canEdit = canEditModule(currentUserPermissions, 'rehab')
  const { byPlayer } = useAvailability(selectedTeam?.id)
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false)
  const [anamnesisData, setAnamnesisData] = useState([])
  const [documents, setDocuments] = useState([])
  const [editingAnamnesis, setEditingAnamnesis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedAnamnesisIds, setSelectedAnamnesisIds] = useState([])
  const [confirmState, setConfirmState] = useState(null)

  useEffect(() => {
    if (player && selectedTeam) {
      fetchAnamnesisData()
      fetchDocuments()
    }
  }, [player, selectedTeam])

  const fetchAnamnesisData = async () => {
    try {
      const { data, error } = await supabase
        .from('player_anamnesis')
        .select('*')
        .eq('player_id', player.id)
        .eq('team_id', selectedTeam.id)
        .order('admission_date', { ascending: false })

      if (error) throw error
      setAnamnesisData(data || [])
    } catch (error) {
      console.error('Error fetching anamnesis:', error)
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    }
  }

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('player_documents')
        .select('*')
        .eq('player_id', player.id)
        .eq('team_id', selectedTeam.id)
        .order('document_date', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const getSignedUrl = async (filePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('player-documents')
        .createSignedUrl(filePath, 3600) // 1 óráig érvényes URL

      if (error) throw error
      return data.signedUrl
    } catch (error) {
      console.error('Error creating signed URL:', error)
      return null
    }
  }

  const openDocument = async (filePath) => {
    const signedUrl = await getSignedUrl(filePath)
    if (signedUrl) {
      window.open(signedUrl, '_blank')
    } else {
      toast.error('Hiba történt a fájl megnyitásakor!')
    }
  }

  const deleteAnamnesis = (anamnesisId) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt az anamnézist?',
      action: async () => {
        try {
          const { error } = await supabase
            .from('player_anamnesis')
            .delete()
            .eq('id', anamnesisId)

          if (error) throw error

          toast.success('Anamnézis törölve!')
          fetchAnamnesisData()
        } catch (error) {
          console.error('Error deleting anamnesis:', error)
          toast.error('Hiba történt a törlés során!')
        }
      },
    })
  }

  const deleteDocument = (docId, filePath) => {
    setConfirmState({
      message: 'Biztosan törölni szeretnéd ezt a dokumentumot?',
      action: async () => {
        try {
          // Törlés az adatbázisból
          const { error: dbError } = await supabase
            .from('player_documents')
            .delete()
            .eq('id', docId)

          if (dbError) throw dbError

          // Törlés a storage-ból
          await supabase.storage
            .from('player-documents')
            .remove([filePath])

          toast.success('Dokumentum törölve!')
          fetchDocuments()
        } catch (error) {
          console.error('Error deleting document:', error)
          toast.error('Hiba történt a törlés során!')
        }
      },
    })
  }

  // Anamnézis kiválasztás kezelése
  const toggleAnamnesisSelection = (anamnesisId) => {
    setSelectedAnamnesisIds(prev => {
      if (prev.includes(anamnesisId)) {
        return prev.filter(id => id !== anamnesisId)
      } else {
        return [...prev, anamnesisId]
      }
    })
  }

  // Kiválasztott anamnézisek pain_locations összevonása
  const getMergedPainPoints = () => {
    const selectedAnamneses = anamnesisData.filter(a => selectedAnamnesisIds.includes(a.id))
    const allPoints = []
    
    selectedAnamneses.forEach(anamnesis => {
      if (anamnesis.pain_locations && Array.isArray(anamnesis.pain_locations)) {
        anamnesis.pain_locations.forEach((point, index) => {
          allPoints.push({
            ...point,
            // Egyedi ID generálása az anamnézis ID és pont index kombinációjából
            id: `${anamnesis.id}-${point.id || index}`,
            // Hozzáadjuk az anamnézis dátumát azonosításhoz
            anamnesisDate: anamnesis.admission_date
          })
        })
      }
    })
    
    return allPoints
  }

  return (
    <div>
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <AvailabilityHistory
            playerId={player.id}
            player={player}
            teamId={selectedTeam.id}
            canEdit={canEdit}
            actions={
              <>
                <AvailabilityPill status={availabilityOf(byPlayer, player.id).status} />
                {canEdit && (
                  <Button size="sm" variant="secondary" onClick={() => setShowAvailabilityEditor(true)}>
                    Státusz módosítása
                  </Button>
                )}
              </>
            }
          />
          <AvailabilityEditor
            open={showAvailabilityEditor}
            onClose={() => setShowAvailabilityEditor(false)}
            player={player}
            teamId={selectedTeam.id}
          />
          {/* Player Info Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Panel>
              <h3 className="mb-2 text-sm text-muted">Születési dátum</h3>
              <p className="text-xl font-bold text-fg">
                {player.birth_date ? new Date(player.birth_date).toLocaleDateString('hu-HU') : 'N/A'}
              </p>
            </Panel>
            <Panel>
              <h3 className="mb-2 text-sm text-muted">Anamnézis felvételek</h3>
              <p className="text-xl font-bold text-fg">{anamnesisData.length}</p>
            </Panel>
            <Panel>
              <h3 className="mb-2 text-sm text-muted">Dokumentumok</h3>
              <p className="text-xl font-bold text-fg">{documents.length}</p>
            </Panel>
          </div>

          {/* Recent Documents */}
          {documents.length > 0 && (
            <Panel title="Legutóbbi dokumentumok">
              <div className="space-y-2">
                {documents.slice(0, 5).map((doc) => (
                  <button
                    type="button"
                    key={doc.id}
                    className="flex w-full items-center gap-3 rounded-[10px] bg-surface-2 p-3 text-left transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    onClick={() => openDocument(doc.file_url)}
                  >
                    {doc.file_type === 'PDF' ? (
                      <FileText className="h-8 w-8 flex-shrink-0 text-bad" aria-hidden="true" />
                    ) : (
                      <ImageIcon className="h-8 w-8 flex-shrink-0 text-accent" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-fg">{doc.title}</p>
                      <p className="text-sm text-muted">
                        {new Date(doc.document_date).toLocaleDateString('hu-HU')}
                      </p>
                    </div>
                    <Eye className="h-5 w-5 flex-shrink-0 text-muted" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </Panel>
          )}

          {/* Korábbi Anamnézisek és Body Diagram */}
          {anamnesisData.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Korábbi Anamnézisek Lista */}
              <Panel
                title={
                  selectedAnamnesisIds.length > 0
                    ? `Korábbi anamnézisek (${selectedAnamnesisIds.length} kiválasztva)`
                    : 'Korábbi anamnézisek'
                }
              >
                <div className="space-y-3">
                  {anamnesisData.map((anamnesis) => (
                    <div
                      key={anamnesis.id}
                      className="rounded-[10px] bg-surface-2 p-4 transition-colors hover:bg-surface-3"
                    >
                      <div className="mb-3 flex items-start gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          aria-label={`Anamnézis kiválasztása: ${new Date(anamnesis.admission_date).toLocaleDateString('hu-HU')}`}
                          checked={selectedAnamnesisIds.includes(anamnesis.id)}
                          onChange={() => toggleAnamnesisSelection(anamnesis.id)}
                          className="mt-1 h-5 w-5 rounded accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        />
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-fg">
                            {new Date(anamnesis.admission_date).toLocaleDateString('hu-HU')}
                          </h4>
                          <p className="text-sm capitalize text-muted">{anamnesis.current_status}</p>
                        </div>
                        {canEdit && (
                          <div className="flex gap-1">
                            <IconButton
                              icon={Pencil}
                              label="Szerkesztés"
                              size="sm"
                              onClick={() => {
                                setEditingAnamnesis(anamnesis)
                                setActiveTab('anamnesis')
                              }}
                            />
                            <IconButton
                              icon={Trash2}
                              label="Törlés"
                              size="sm"
                              className="!text-bad"
                              onClick={() => deleteAnamnesis(anamnesis.id)}
                            />
                          </div>
                        )}
                      </div>
                      {anamnesis.problem_description && (
                        <p className="mb-3 text-sm text-fg">{anamnesis.problem_description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {anamnesis.medication !== 'nincs' && (
                          <StatusPill status="neutral">
                            <Pill className="h-3 w-3" aria-hidden="true" />
                            {anamnesis.medication}
                          </StatusPill>
                        )}
                        {anamnesis.imaging !== 'nincs' && (
                          <StatusPill status="neutral">
                            <Camera className="h-3 w-3" aria-hidden="true" />
                            {anamnesis.imaging}
                          </StatusPill>
                        )}
                        {anamnesis.surgery && (
                          <StatusPill status="bad">
                            <Scissors className="h-3 w-3" aria-hidden="true" />
                            Műtét
                          </StatusPill>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Body Diagram - jobb oldal */}
              <Panel title="Fájdalom lokalizáció">
                {selectedAnamnesisIds.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-muted">Jelölj be legalább egy anamnézist a megjelenítéshez</p>
                  </div>
                ) : (
                  <div className="relative">
                    <BodyDiagram
                      painPoints={getMergedPainPoints()}
                      onPainPointsChange={() => {}}
                      readOnly={true}
                    />
                    <div className="mt-4 rounded-[10px] bg-surface-2 p-3">
                      <p className="text-center text-xs text-muted">
                        A kiválasztott {selectedAnamnesisIds.length} anamnézis összes fájdalompontja látható
                      </p>
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </div>
      )}

      {activeTab === 'anamnesis' && (
        <AnamnesisForm
          player={player}
          teamId={selectedTeam.id}
          existingAnamnesis={editingAnamnesis}
          onClose={() => {
            setEditingAnamnesis(null)
            fetchAnamnesisData()
          }}
          onSaved={() => {
            setEditingAnamnesis(null)
            fetchAnamnesisData()
          }}
          embedded={true}
          canEdit={canEdit}
        />
      )}

      {activeTab === 'documents' && (
        <div className="space-y-6">
          <DocumentUpload
            player={player}
            teamId={selectedTeam.id}
            onUploaded={fetchDocuments}
            canEdit={canEdit}
          />

          {documents.length === 0 ? (
            <EmptyState icon={FileText} title="Még nincs feltöltött dokumentum" />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {documents.map((doc) => (
                <Panel key={doc.id}>
                  <div className="flex items-start gap-3">
                    {doc.file_type === 'PDF' ? (
                      <FileText className="h-12 w-12 flex-shrink-0 text-bad" aria-hidden="true" />
                    ) : (
                      <ImageIcon className="h-12 w-12 flex-shrink-0 text-accent" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="mb-1 truncate font-semibold text-fg">{doc.title}</h4>
                      <p className="mb-2 text-sm text-muted">
                        {new Date(doc.document_date).toLocaleDateString('hu-HU')}
                      </p>
                      {doc.description && (
                        <p className="mb-2 line-clamp-2 text-sm text-fg">{doc.description}</p>
                      )}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1">
                          {doc.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="rounded bg-surface-2 px-2 py-0.5 text-xs text-fg"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          icon={Eye}
                          className="flex-1"
                          onClick={() => openDocument(doc.file_url)}
                        >
                          Megnyitás
                        </Button>
                        {canEdit && (
                          <Button
                            variant="danger"
                            icon={Trash2}
                            aria-label="Dokumentum törlése"
                            title="Dokumentum törlése"
                            onClick={() => deleteDocument(doc.id, doc.file_url)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <AttendanceCalendar player={player} teamId={selectedTeam.id} canEdit={canEdit} />
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
