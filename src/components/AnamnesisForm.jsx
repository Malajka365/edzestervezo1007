import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Save, AlertCircle, MapPin, User, Clock, ClipboardList, Stethoscope } from 'lucide-react'
import BodyDiagram from './BodyDiagram'
import Button from './ui/Button'
import Modal from './ui/Modal'
import Tabs from './ui/Tabs'
import { Field, Input, Select, Textarea } from './ui/Field'
import toast from 'react-hot-toast'

const SECTION_HEADING = 'border-b border-line pb-1.5 text-base font-semibold text-fg'

// Modul szinten definiálva, hogy gépelés közben ne mount-olódjon újra (fókuszvesztés).
function FormField({ as: Control = Input, label, name, children, ...props }) {
  const id = `anamnesis-${name}`
  return (
    <Field label={label} htmlFor={id}>
      <Control id={id} name={name} {...props}>
        {children}
      </Control>
    </Field>
  )
}

function CheckboxField({ label, name, checked, onChange }) {
  const id = `anamnesis-${name}`
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
      <label htmlFor={id} className="text-sm text-fg">
        {label}
      </label>
    </div>
  )
}

export default function AnamnesisForm({ player, teamId, existingAnamnesis, onClose, onSaved, embedded = false, canEdit = true }) {
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
    { id: 0, name: 'Fájdalom lokalizáció', shortName: 'Lokalizáció', icon: MapPin },
    { id: 1, name: 'Alapadatok', shortName: 'Alapadatok', icon: User },
    { id: 2, name: '24 órás lefolyás', shortName: '24 óra', icon: Clock },
    { id: 3, name: 'Kórtörténet', shortName: 'Kórtörténet', icon: ClipboardList },
    { id: 4, name: 'Speciális kérdések', shortName: 'Speciális', icon: Stethoscope },
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

  const stepTabs = steps.map(({ id, name, shortName, icon }) => ({
    id,
    icon,
    label: (
      <>
        <span className="lg:hidden">{shortName}</span>
        <span className="hidden lg:inline">{name}</span>
      </>
    ),
  }))

  const title = existingAnamnesis ? 'Anamnézis szerkesztése' : 'Új anamnézis'

  const stepNavigation = (
    <Tabs items={stepTabs} value={currentStep} onChange={setCurrentStep} />
  )

  const formBody = (
    <div onKeyDown={handleKeyDown} className="space-y-3">
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
          <h3 className={SECTION_HEADING}>Alapadatok</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Név" name="name" value={formData.name} onChange={handleInputChange} required />
            <FormField label="Születési dátum" name="birth_date" type="date" value={formData.birth_date} onChange={handleInputChange} />
            <FormField label="Felvétel dátuma" name="admission_date" type="date" value={formData.admission_date} onChange={handleInputChange} />
            <FormField label="Telefon" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
            <FormField label="Foglalkozás" name="occupation" value={formData.occupation} onChange={handleInputChange} />
            <FormField label="Hobbi/Sport" name="hobby_sport" value={formData.hobby_sport} onChange={handleInputChange} />
          </div>

          <FormField
            as={Textarea}
            label="Probléma leírása"
            name="problem_description"
            value={formData.problem_description}
            onChange={handleInputChange}
            rows="2"
          />
        </div>
      )}

      {/* Step 2: 24 órás lefolyás */}
      {currentStep === 2 && (
        <div className="space-y-3">
          <h3 className={SECTION_HEADING}>24 órás lefolyás</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CheckboxField label="Alvászavar" name="sleep_disorder" checked={formData.sleep_disorder} onChange={handleInputChange} />

            <FormField as={Select} label="Alvási pozíció" name="sleep_position" value={formData.sleep_position} onChange={handleInputChange}>
              <option value="has">Has</option>
              <option value="hát">Hát</option>
              <option value="oldalt BJ">Oldalt BJ</option>
            </FormField>

            <CheckboxField label="Ébredés fájdalom" name="wake_pain" checked={formData.wake_pain} onChange={handleInputChange} />
            <CheckboxField label="Felkelés fájdalom" name="get_up_pain" checked={formData.get_up_pain} onChange={handleInputChange} />

            <FormField as={Select} label="Napközben fájdalom" name="daytime_pain" value={formData.daytime_pain} onChange={handleInputChange}>
              <option value="fokozódik">Fokozódik</option>
              <option value="csökken">Csökken</option>
            </FormField>

            <FormField as={Select} label="Este fájdalom" name="evening_pain" value={formData.evening_pain} onChange={handleInputChange}>
              <option value="fokozódik">Fokozódik</option>
              <option value="csökken">Csökken</option>
            </FormField>
          </div>

          <FormField
            as={Textarea}
            label="Kialakítja / fokozza"
            name="aggravating_factors"
            value={formData.aggravating_factors}
            onChange={handleInputChange}
            rows="2"
            placeholder="Mi fokozza a fájdalmat?"
          />

          <FormField
            as={Textarea}
            label="Elmúlásztja / enyhíti"
            name="relieving_factors"
            value={formData.relieving_factors}
            onChange={handleInputChange}
            rows="2"
            placeholder="Mi enyhíti a fájdalmat?"
          />
        </div>
      )}

      {/* Step 3: Kórtörténet */}
      {currentStep === 3 && (
        <div className="space-y-3">
          <h3 className={SECTION_HEADING}>Previous Hx</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField as={Select} label="Ezt megelőző epizódok" name="previous_episodes" value={formData.previous_episodes} onChange={handleInputChange}>
              <option value="0">0</option>
              <option value="1-5">1-5</option>
              <option value="6-10">6-10</option>
              <option value="11+">11+</option>
            </FormField>

            <FormField
              label="Első epizód éve"
              name="first_episode_year"
              type="number"
              value={formData.first_episode_year || ''}
              onChange={handleNumberChange}
              placeholder="pl. 2020"
            />
          </div>

          <FormField
            as={Textarea}
            label="Első epizód oka"
            name="first_episode_cause"
            value={formData.first_episode_cause}
            onChange={handleInputChange}
            rows="2"
            placeholder="Mi okozta az első epizódot?"
          />

          <FormField
            label="Gyakorisága"
            name="episode_frequency"
            value={formData.episode_frequency}
            onChange={handleInputChange}
            placeholder="pl. havonta egyszer, évente 2-3 alkalommal"
          />

          <FormField
            label="Egyes epizódok tartama"
            name="episode_duration"
            value={formData.episode_duration}
            onChange={handleInputChange}
            placeholder="pl. 2-3 nap, 1-2 hét"
          />

          <FormField
            as={Textarea}
            label="Eddigi kezelések és hatása"
            name="previous_treatments"
            value={formData.previous_treatments}
            onChange={handleInputChange}
            rows="3"
            placeholder="Milyen kezeléseket kapott, milyen hatással?"
          />

          {/* Present Hx */}
          <h4 className="mt-3 border-b border-line pb-1 text-sm font-semibold text-fg">
            Present Hx
          </h4>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField as={Select} label="Kezdete" name="current_status" value={formData.current_status} onChange={handleInputChange}>
              <option value="javul">Javul</option>
              <option value="változatlan">Változatlan</option>
              <option value="romlik">Romlik</option>
            </FormField>

            <FormField as={Select} label="Felismerhető-e valamilyen minta" name="pain_pattern" value={formData.pain_pattern} onChange={handleInputChange}>
              <option value="discus">Discus</option>
              <option value="arthrosis">Arthrosis</option>
              <option value="gyulladás">Gyulladás</option>
            </FormField>
          </div>

          <FormField
            as={Textarea}
            label="Oka"
            name="current_cause"
            value={formData.current_cause}
            onChange={handleInputChange}
            rows="2"
            placeholder="Mi okozta a jelenlegi problémát?"
          />

          <FormField
            as={Textarea}
            label="Eddigi kezelések / hatása"
            name="current_treatments"
            value={formData.current_treatments}
            onChange={handleInputChange}
            rows="3"
            placeholder="Milyen kezeléseket kapott eddig, milyen hatással?"
          />
        </div>
      )}

      {/* Step 4: Speciális kérdések */}
      {currentStep === 4 && (
        <div className="space-y-3">
          <h3 className={SECTION_HEADING}>Speciális kérdések</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField as={Select} label="Gyógyszer" name="medication" value={formData.medication} onChange={handleInputChange}>
              <option value="nincs">Nincs</option>
              <option value="NSAID">NSAID</option>
              <option value="fájdalomcsillapító">Fájdalomcsillapító</option>
              <option value="steroid">Steroid</option>
              <option value="anticoagulans">Anticoagulans</option>
              <option value="más">Más</option>
            </FormField>

            <FormField as={Select} label="Képalkotó" name="imaging" value={formData.imaging} onChange={handleInputChange}>
              <option value="nincs">Nincs</option>
              <option value="RTG">RTG</option>
              <option value="MR">MR</option>
              <option value="CT">CT</option>
            </FormField>

            <CheckboxField label="Műtét volt" name="surgery" checked={formData.surgery} onChange={handleInputChange} />
          </div>
        </div>
      )}
    </div>
  )

  const footerActions = (
    <>
      {!canEdit && (
        <span className="mr-2 flex items-center gap-2 text-sm text-muted">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          Csak megtekintési jogosultság
        </span>
      )}
      {canEdit && (
        <Button
          variant="primary"
          icon={Save}
          loading={loading}
          onClick={handleSaveAnamnesis}
        >
          {loading ? 'Mentés...' : 'Mentés'}
        </Button>
      )}
      {!embedded && <Button onClick={onClose}>Mégse</Button>}
    </>
  )

  // Beágyazott módban (játékos profil fül) Panel-szerű kártya, egyébként Modal.
  if (embedded) {
    return (
      <section className="min-w-0 rounded-[14px] border border-line bg-surface">
        <div className="px-4 pt-3">
          <h2 className="mb-2 text-lg font-bold text-fg">{title}</h2>
          {stepNavigation}
        </div>
        <div className="p-4">{formBody}</div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3">
          {footerActions}
        </div>
      </section>
    )
  }

  return (
    <Modal open onClose={onClose} title={title} size="xl" footer={footerActions}>
      <div className="space-y-4">
        {stepNavigation}
        {formBody}
      </div>
    </Modal>
  )
}
