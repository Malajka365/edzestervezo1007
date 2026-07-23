import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTeams } from '../context/TeamContext'
import AnamnesisForm from '../components/AnamnesisForm'
import DocumentUpload from '../components/DocumentUpload'
import AttendanceCalendar from '../components/AttendanceCalendar'
import BodyDiagram from '../components/BodyDiagram'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import toast from 'react-hot-toast'
import {
  FileText,
  Calendar as CalendarIcon,
  ClipboardList,
  Plus,
  Edit,
  Eye,
  Trash2,
  Download,
  Image as ImageIcon,
} from 'lucide-react'

export default function PlayerProfileRehab({ player, activeTab, setActiveTab }) {
  const { selectedTeam } = useTeams()
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
    <div className="flex-1 overflow-y-auto">
      {activeTab === 'overview' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Player Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="text-sm text-slate-400 mb-2">Születési dátum</h3>
              <p className="text-xl font-bold text-white">
                {player.birth_date ? new Date(player.birth_date).toLocaleDateString('hu-HU') : 'N/A'}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm text-slate-400 mb-2">Anamnézis felvételek</h3>
              <p className="text-xl font-bold text-white">{anamnesisData.length}</p>
            </div>
            <div className="card">
              <h3 className="text-sm text-slate-400 mb-2">Dokumentumok</h3>
              <p className="text-xl font-bold text-white">{documents.length}</p>
            </div>
          </div>

          {/* Recent Documents */}
          {documents.length > 0 && (
            <div className="card">
              <h3 className="text-xl font-bold text-white mb-4">Legutóbbi dokumentumok</h3>
              <div className="space-y-3">
                {documents.slice(0, 5).map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                    onClick={() => openDocument(doc.file_url)}
                  >
                    {doc.file_type === 'PDF' ? (
                      <FileText className="w-8 h-8 text-red-400" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-blue-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{doc.title}</p>
                      <p className="text-sm text-slate-400">
                        {new Date(doc.document_date).toLocaleDateString('hu-HU')}
                      </p>
                    </div>
                    <Eye className="w-5 h-5 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Korábbi Anamnézisek és Body Diagram */}
          {anamnesisData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Korábbi Anamnézisek Lista */}
              <div className="card">
                <h3 className="text-xl font-bold text-white mb-4">
                  Korábbi anamnézisek
                  {selectedAnamnesisIds.length > 0 && (
                    <span className="ml-2 text-sm text-slate-400">
                      ({selectedAnamnesisIds.length} kiválasztva)
                    </span>
                  )}
                </h3>
                <div className="space-y-3">
                  {anamnesisData.map((anamnesis) => (
                    <div key={anamnesis.id} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700/70 transition-colors">
                      <div className="flex items-start gap-3 mb-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedAnamnesisIds.includes(anamnesis.id)}
                          onChange={() => toggleAnamnesisSelection(anamnesis.id)}
                          className="mt-1 w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-white">
                            {new Date(anamnesis.admission_date).toLocaleDateString('hu-HU')}
                          </h4>
                          <p className="text-sm text-slate-400 capitalize">{anamnesis.current_status}</p>
                        </div>
                        <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingAnamnesis(anamnesis)
                            setActiveTab('anamnesis')
                          }}
                          className="p-2 hover:bg-slate-600 rounded transition-colors"
                          title="Szerkesztés"
                        >
                          <Edit className="w-4 h-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => deleteAnamnesis(anamnesis.id)}
                          className="p-2 hover:bg-red-700 rounded transition-colors"
                          title="Törlés"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                    {anamnesis.problem_description && (
                      <p className="text-sm text-slate-300 mb-3">{anamnesis.problem_description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {anamnesis.medication !== 'nincs' && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                          💊 {anamnesis.medication}
                        </span>
                      )}
                      {anamnesis.imaging !== 'nincs' && (
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                          📷 {anamnesis.imaging}
                        </span>
                      )}
                      {anamnesis.surgery && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded">
                          ⚕️ Műtét
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Body Diagram - jobb oldal */}
            <div className="card">
              <h3 className="text-xl font-bold text-white mb-4">Fájdalom lokalizáció</h3>
              {selectedAnamnesisIds.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Jelölj be legalább egy anamnézist a megjelenítéshez</p>
                </div>
              ) : (
                <div className="relative">
                  <BodyDiagram
                    painPoints={getMergedPainPoints()}
                    onPainPointsChange={() => {}}
                    readOnly={true}
                  />
                  <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-xs text-slate-400 text-center">
                      A kiválasztott {selectedAnamnesisIds.length} anamnézis összes fájdalompontja látható
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {activeTab === 'anamnesis' && (
        <div className="flex-1 flex p-6">
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
          />
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <DocumentUpload
            player={player}
            teamId={selectedTeam.id}
            onUploaded={fetchDocuments}
          />

          {documents.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Még nincs feltöltött dokumentum</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="card">
                  <div className="flex items-start gap-3">
                    {doc.file_type === 'PDF' ? (
                      <FileText className="w-12 h-12 text-red-400 flex-shrink-0" />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-blue-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white mb-1 truncate">{doc.title}</h4>
                      <p className="text-sm text-slate-400 mb-2">
                        {new Date(doc.document_date).toLocaleDateString('hu-HU')}
                      </p>
                      {doc.description && (
                        <p className="text-sm text-slate-300 mb-2 line-clamp-2">{doc.description}</p>
                      )}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {doc.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-700 text-xs text-slate-300 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openDocument(doc.file_url)}
                          className="flex-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Megnyitás
                        </button>
                        <button
                          onClick={() => deleteDocument(doc.id, doc.file_url)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="flex-1 overflow-hidden p-6 flex flex-col">
          <AttendanceCalendar player={player} teamId={selectedTeam.id} />
        </div>
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
