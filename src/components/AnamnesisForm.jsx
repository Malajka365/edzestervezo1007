import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { X, Save, AlertCircle } from 'lucide-react'
import BodyDiagram from './BodyDiagram'
import toast from 'react-hot-toast'

export default function AnamnesisForm({ player, teamId, existingAnamnesis, onClose, onSaved, embedded = false }) {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(existingAnamnesis || {
    // Alapadatok
    name: player.name || '',
    birth_date: player.birth_date || '',
    admission_date: new Date().toISOString().split('T')[0],
    phone: '',
    occupation: '',
    hobby_sport: '',
    problem_description: '',
    
    // Pain locations (test pontok)
    pain_locations: [],
    
    // 24 órás lefolyás
    sleep_disorder: false,
    sleep_position: 'has',
    wake_pain: false,
    get_up_pain: false,
    daytime_pain: 'fokozódik',
    evening_pain: 'fokozódik',
    aggravating_factors: '',
    relieving_factors: '',
    
    
    // Previous Hx
    previous_episodes: '0',
    first_episode_year: null,
    first_episode_cause: '',
    episode_frequency: '',
    episode_duration: '',
    previous_treatments: '',
    
    // Present Hx
    current_status: 'javul',
    current_cause: '',
    current_treatments: '',
    pain_pattern: 'discus',
    
    // Kontraindikáció
    dizziness: false,
    cauda_equina: false,
    spinal_cord: false,
    
    // Speciális kérdések (csak bekarikázottak)
    medication: 'nincs',
    surgery: false,
    imaging: 'nincs',
  })

  const steps = [
    { id: 0, name: 'Fájdalom lokalizáció', icon: '📍' },
    { id: 1, name: 'Alapadatok', icon: '👤' },
    { id: 2, name: '24 órás lefolyás', icon: '🕐' },
    { id: 3, name: 'Kórtörténet', icon: '📋' },
    { id: 4, name: 'Speciális kérdések', icon: '⚕️' },
  ]

  const handleKeyDown = (e) => {
    // Prevent form submission on Enter key in input fields
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault()
    }
  }

  // Közös handler függvény - megakadályozza a focus elvesztését
  // useCallback biztosítja hogy NEM jön létre új függvény minden render-nél
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    const fieldValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: fieldValue }))
  }, [])
  
  // Speciális handler a BodyDiagram és más nem-standard inputokhoz
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])
  
  // Speciális handler number input-hoz (first_episode_year)
  const handleNumberChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || null }))
  }, [])
  
  // Wrapper a pain_locations kezeléséhez - memoizált
  const handlePainLocationsChange = useCallback((points) => {
    setFormData(prev => ({ ...prev, pain_locations: points }))
  }, [])

  const handleSaveAnamnesis = async () => {
    setLoading(true)

    try {
      const anamnesisData = {
        ...formData,
        player_id: player.id,
        team_id: teamId,
        updated_at: new Date().toISOString(),
      }

      if (existingAnamnesis?.id) {
        // Update
        const { error } = await supabase
          .from('player_anamnesis')
          .update(anamnesisData)
          .eq('id', existingAnamnesis.id)

        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('player_anamnesis')
          .insert(anamnesisData)

        if (error) throw error
      }

      toast.success('Anamnézis sikeresen mentve!')
      onSaved?.()
      
      // Embedded módban új üres form betöltése
      if (embedded) {
        // Form reset
        setFormData({
          name: player.name || '',
          birth_date: player.birth_date || '',
          admission_date: new Date().toISOString().split('T')[0],
          phone: '',
          occupation: '',
          hobby_sport: '',
          problem_description: '',
          pain_locations: [],
          sleep_disorder: false,
          sleep_position: 'has',
          wake_pain: false,
          get_up_pain: false,
          daytime_pain: 'fokozódik',
          evening_pain: 'fokozódik',
          aggravating_factors: '',
          relieving_factors: '',
          previous_episodes: '0',
          first_episode_year: null,
          episode_duration: '',
          current_status: 'javul',
          pain_pattern: 'discus',
          medication: 'nincs',
          imaging: 'nincs',
          surgery: false,
          contraindications: [],
        })
        setCurrentStep(0) // Visszaugrás első lépésre
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Error saving anamnesis:', error)
      toast.error('Hiba történt a mentés során!')
    } finally {
      setLoading(false)
    }
  }

  // Wrapper JSX választó
  const wrapperContent = (content) => {
    if (embedded) {
      return (
        <div className="bg-slate-800 rounded-xl w-full h-full flex flex-col shadow-lg">
          {content}
        </div>
      )
    }
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl max-w-5xl w-full max-h-[95vh] flex flex-col">
          {content}
        </div>
      </div>
    )
  }

  return wrapperContent(
    <>
        {/* Kompakt Header + Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700">
          {/* Bal: Cím */}
          <h2 className="text-lg font-bold text-white">
            {existingAnamnesis ? 'Anamnézis szerkesztése' : 'Új anamnézis'}
          </h2>
          
          {/* Közép: Tab Navigation */}
          <div className="flex items-center gap-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(index)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-lg ${
                  currentStep === index
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="text-base">{step.icon}</span>
                <span className="hidden lg:inline">{step.name}</span>
              </button>
            ))}
          </div>

          {/* Jobb: Bezár gomb */}
          {!embedded && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Form */}
        <div onKeyDown={handleKeyDown} className="p-4 space-y-3 overflow-y-auto flex-1">
          
          {/* Step 0: Fájdalom lokalizáció */}
          {currentStep === 0 && (
            <div className="space-y-2">
              <BodyDiagram
                painPoints={formData.pain_locations}
                onPainPointsChange={handlePainLocationsChange}
              />
            </div>
          )}

          {/* Step 1: Alapadatok */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white border-b border-slate-700 pb-1.5">
                Alapadatok
              </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white mb-1">Név</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Születési dátum</label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Felvétel dátuma</label>
                <input
                  type="date"
                  name="admission_date"
                  value={formData.admission_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Telefon</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Foglalkozás</label>
                <input
                  type="text"
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Hobbi/Sport</label>
                <input
                  type="text"
                  name="hobby_sport"
                  value={formData.hobby_sport}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Probléma leírása</label>
              <textarea
                name="problem_description"
                value={formData.problem_description}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                rows="2"
              />
            </div>
          </div>
          )}

          {/* Step 2: 24 órás lefolyás */}
          {currentStep === 2 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white border-b border-slate-700 pb-1.5">
              24 órás lefolyás
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sleep_disorder"
                  name="sleep_disorder"
                  checked={formData.sleep_disorder}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="sleep_disorder" className="text-xs text-white">Alvászavar</label>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Alvási pozíció</label>
                <select
                  name="sleep_position"
                  value={formData.sleep_position}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="has">Has</option>
                  <option value="hát">Hát</option>
                  <option value="oldalt BJ">Oldalt BJ</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="wake_pain"
                  name="wake_pain"
                  checked={formData.wake_pain}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="wake_pain" className="text-xs text-white">Ébredés fájdalom</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="get_up_pain"
                  name="get_up_pain"
                  checked={formData.get_up_pain}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="get_up_pain" className="text-xs text-white">Felkelés fájdalom</label>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Napközben fájdalom</label>
                <select
                  name="daytime_pain"
                  value={formData.daytime_pain}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="fokozódik">Fokozódik</option>
                  <option value="csökken">Csökken</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Este fájdalom</label>
                <select
                  name="evening_pain"
                  value={formData.evening_pain}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="fokozódik">Fokozódik</option>
                  <option value="csökken">Csökken</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Kialakítja / fokozza</label>
              <textarea
                name="aggravating_factors"
                value={formData.aggravating_factors}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                rows="2"
                placeholder="Mi fokozza a fájdalmat?"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Elmúlásztja / enyhíti</label>
              <textarea
                name="relieving_factors"
                value={formData.relieving_factors}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                rows="2"
                placeholder="Mi enyhíti a fájdalmat?"
              />
            </div>
          </div>
          )}

          {/* Step 3: Kórtörténet */}
          {currentStep === 3 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white border-b border-slate-700 pb-1.5">
              Previous Hx
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white mb-1">Ezt megelőző epizódok</label>
                <select
                  name="previous_episodes"
                  value={formData.previous_episodes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="0">0</option>
                  <option value="1-5">1-5</option>
                  <option value="6-10">6-10</option>
                  <option value="11+">11+</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Első epizód éve</label>
                <input
                  type="number"
                  name="first_episode_year"
                  value={formData.first_episode_year || ''}
                  onChange={handleNumberChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  placeholder="pl. 2020"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Első epizód oka</label>
              <textarea
                name="first_episode_cause"
                value={formData.first_episode_cause}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                rows="2"
                placeholder="Mi okozta az első epizódot?"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Gyakorisága</label>
              <input
                type="text"
                name="episode_frequency"
                value={formData.episode_frequency}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                placeholder="pl. havonta egyszer, évente 2-3 alkalommal"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Egyes epizódok tartama</label>
              <input
                type="text"
                name="episode_duration"
                value={formData.episode_duration}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                placeholder="pl. 2-3 nap, 1-2 hét"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Eddigi kezelések és hatása</label>
              <textarea
                name="previous_treatments"
                value={formData.previous_treatments}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                rows="3"
                placeholder="Milyen kezeléseket kapott, milyen hatással?"
              />
            </div>

            {/* Present Hx */}
            <h4 className="text-sm font-semibold text-white border-b border-slate-700 pb-1 mt-3">
              Present Hx
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white mb-1">Kezdete</label>
                <select
                  name="current_status"
                  value={formData.current_status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="javul">Javul</option>
                  <option value="változatlan">Változatlan</option>
                  <option value="romlik">Romlik</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Felismerhető-e valamilyen minta</label>
                <select
                  name="pain_pattern"
                  value={formData.pain_pattern}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="discus">Discus</option>
                  <option value="arthrosis">Arthrosis</option>
                  <option value="gyulladás">Gyulladás</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Oka</label>
              <textarea
                name="current_cause"
                value={formData.current_cause}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                rows="2"
                placeholder="Mi okozta a jelenlegi problémát?"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-white mb-1">Eddigi kezelések / hatása</label>
              <textarea
                name="current_treatments"
                value={formData.current_treatments}
                onChange={handleInputChange}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                rows="3"
                placeholder="Milyen kezeléseket kapott eddig, milyen hatással?"
              />
            </div>
          </div>
          )}

          {/* Step 4: Speciális kérdések */}
          {currentStep === 4 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white border-b border-slate-700 pb-1.5">
              Speciális kérdések
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white mb-1">Gyógyszer</label>
                <select
                  name="medication"
                  value={formData.medication}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="nincs">Nincs</option>
                  <option value="NSAID">NSAID</option>
                  <option value="fájdalomcsillapító">Fájdalomcsillapító</option>
                  <option value="steroid">Steroid</option>
                  <option value="anticoagulans">Anticoagulans</option>
                  <option value="más">Más</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white mb-1">Képalkotó</label>
                <select
                  name="imaging"
                  value={formData.imaging}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="nincs">Nincs</option>
                  <option value="RTG">RTG</option>
                  <option value="MR">MR</option>
                  <option value="CT">CT</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="surgery"
                  name="surgery"
                  checked={formData.surgery}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="surgery" className="text-sm text-white">Műtét volt</label>
              </div>
            </div>
          </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-3 border-t border-slate-700 bg-slate-800">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveAnamnesis}
                disabled={loading}
                className="px-6 py-2 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Mentés...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Mentés
                  </>
                )}
              </button>
              
              {!embedded && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Mégse
                </button>
              )}
            </div>
          </div>
        </div>
    </>
  )
}
