import { useState } from 'react'
import { ClipboardList, Target, Video, Swords, Shield, Hand } from 'lucide-react'
import { Input, Textarea } from './ui/Field'

export default function TacticTemplateEditor({ templateData, onChange }) {
  const [data, setData] = useState({
    tactical_goal: {
      focus: templateData?.tactical_goal?.focus || '',
      attack_details: templateData?.tactical_goal?.attack_details || '',
      defense_details: templateData?.tactical_goal?.defense_details || '',
    },
    technical_goal: {
      focus: templateData?.technical_goal?.focus || '',
      attack_details: templateData?.technical_goal?.attack_details || '',
      defense_details: templateData?.technical_goal?.defense_details || '',
    },
    video_url: templateData?.video_url || '',
    exercises: {
      attack: {
        common: templateData?.exercises?.attack?.common || '',
        wing: templateData?.exercises?.attack?.wing || '',
        pivot: templateData?.exercises?.attack?.pivot || '',
        backcourt: templateData?.exercises?.attack?.backcourt || '',
      },
      defense: {
        common: templateData?.exercises?.defense?.common || '',
        wing: templateData?.exercises?.defense?.wing || '',
        pivot: templateData?.exercises?.defense?.pivot || '',
        backcourt: templateData?.exercises?.defense?.backcourt || '',
      },
      goalkeeper: templateData?.exercises?.goalkeeper || '',
    },
  })

  const handleUpdate = (path, value) => {
    const updated = { ...data }
    const keys = path.split('.')
    let current = updated
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
    
    setData(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-6">
      {/* Tactical Goal */}
      <div className="bg-surface-2/50 rounded-lg p-4 border border-line">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-fg mb-4">
          <ClipboardList className="w-5 h-5 text-muted" aria-hidden="true" />
          Taktikai Cél
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              Fókusz
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={data.tactical_goal.focus === 'attack' || data.tactical_goal.focus === 'both'}
                  onChange={(e) => {
                    const current = data.tactical_goal.focus
                    let newFocus = ''
                    if (e.target.checked) {
                      newFocus = current === 'defense' ? 'both' : 'attack'
                    } else {
                      newFocus = current === 'both' ? 'defense' : ''
                    }
                    handleUpdate('tactical_goal.focus', newFocus)
                  }}
                  className="w-5 h-5 rounded border-line-strong"
                />
                <span className="text-fg">Támadás</span>
              </label>
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={data.tactical_goal.focus === 'defense' || data.tactical_goal.focus === 'both'}
                  onChange={(e) => {
                    const current = data.tactical_goal.focus
                    let newFocus = ''
                    if (e.target.checked) {
                      newFocus = current === 'attack' ? 'both' : 'defense'
                    } else {
                      newFocus = current === 'both' ? 'attack' : ''
                    }
                    handleUpdate('tactical_goal.focus', newFocus)
                  }}
                  className="w-5 h-5 rounded border-line-strong"
                />
                <span className="text-fg">Védekezés</span>
              </label>
            </div>
          </div>

          {(data.tactical_goal.focus === 'attack' || data.tactical_goal.focus === 'both') && (
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Támadás részletei
              </label>
              <Textarea
                value={data.tactical_goal.attack_details}
                onChange={(e) => handleUpdate('tactical_goal.attack_details', e.target.value)}
                rows="2"
                placeholder="pl. Gyors ellentámadás, Pozíciós játék, stb."
              />
            </div>
          )}

          {(data.tactical_goal.focus === 'defense' || data.tactical_goal.focus === 'both') && (
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Védekezés részletei
              </label>
              <Textarea
                value={data.tactical_goal.defense_details}
                onChange={(e) => handleUpdate('tactical_goal.defense_details', e.target.value)}
                rows="2"
                placeholder="pl. 6-0 védekezés, Pressz védekezés, stb."
              />
            </div>
          )}
        </div>
      </div>

      {/* Technical Goal */}
      <div className="bg-surface-2/50 rounded-lg p-4 border border-line">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-fg mb-4">
          <Target className="w-5 h-5 text-muted" aria-hidden="true" />
          Technikai Cél
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              Fókusz
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={data.technical_goal.focus === 'attack' || data.technical_goal.focus === 'both'}
                  onChange={(e) => {
                    const current = data.technical_goal.focus
                    let newFocus = ''
                    if (e.target.checked) {
                      newFocus = current === 'defense' ? 'both' : 'attack'
                    } else {
                      newFocus = current === 'both' ? 'defense' : ''
                    }
                    handleUpdate('technical_goal.focus', newFocus)
                  }}
                  className="w-5 h-5 rounded border-line-strong"
                />
                <span className="text-fg">Támadás</span>
              </label>
              <label className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={data.technical_goal.focus === 'defense' || data.technical_goal.focus === 'both'}
                  onChange={(e) => {
                    const current = data.technical_goal.focus
                    let newFocus = ''
                    if (e.target.checked) {
                      newFocus = current === 'attack' ? 'both' : 'defense'
                    } else {
                      newFocus = current === 'both' ? 'attack' : ''
                    }
                    handleUpdate('technical_goal.focus', newFocus)
                  }}
                  className="w-5 h-5 rounded border-line-strong"
                />
                <span className="text-fg">Védekezés</span>
              </label>
            </div>
          </div>

          {(data.technical_goal.focus === 'attack' || data.technical_goal.focus === 'both') && (
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Támadás részletei
              </label>
              <Textarea
                value={data.technical_goal.attack_details}
                onChange={(e) => handleUpdate('technical_goal.attack_details', e.target.value)}
                rows="2"
                placeholder="pl. Kapura lövés pontosság, Cselezés, stb."
              />
            </div>
          )}

          {(data.technical_goal.focus === 'defense' || data.technical_goal.focus === 'both') && (
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Védekezés részletei
              </label>
              <Textarea
                value={data.technical_goal.defense_details}
                onChange={(e) => handleUpdate('technical_goal.defense_details', e.target.value)}
                rows="2"
                placeholder="pl. Blokkolás technika, Helyezkedés, stb."
              />
            </div>
          )}
        </div>
      </div>

      {/* Video Analysis */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-fg mb-2">
          <Video className="w-4 h-4 text-muted" aria-hidden="true" />
          Videó elemzés URL
        </label>
        <Input
          type="url"
          value={data.video_url}
          onChange={(e) => handleUpdate('video_url', e.target.value)}
          placeholder="https://youtube.com/..."
        />
      </div>

      {/* Attack Drills */}
      <div className="bg-surface-2/50 rounded-lg p-4 border border-line">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-fg mb-4">
          <Swords className="w-5 h-5 text-muted" aria-hidden="true" />
          Támadás Gyakorlatok
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              Közös
            </label>
            <Textarea
              value={data.exercises.attack.common}
              onChange={(e) => handleUpdate('exercises.attack.common', e.target.value)}
              rows="2"
              placeholder="Összes játékosra vonatkozó gyakorlat..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Szélső
              </label>
              <Textarea
                value={data.exercises.attack.wing}
                onChange={(e) => handleUpdate('exercises.attack.wing', e.target.value)}
                rows="2"
                placeholder="Szélső specifikus..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Beálló
              </label>
              <Textarea
                value={data.exercises.attack.pivot}
                onChange={(e) => handleUpdate('exercises.attack.pivot', e.target.value)}
                rows="2"
                placeholder="Beálló specifikus..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Átlövő-Irányító
              </label>
              <Textarea
                value={data.exercises.attack.backcourt}
                onChange={(e) => handleUpdate('exercises.attack.backcourt', e.target.value)}
                rows="2"
                placeholder="Hátvéd specifikus..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Defense Drills */}
      <div className="bg-surface-2/50 rounded-lg p-4 border border-line">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-fg mb-4">
          <Shield className="w-5 h-5 text-muted" aria-hidden="true" />
          Védekezés Gyakorlatok
        </h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              Közös
            </label>
            <Textarea
              value={data.exercises.defense.common}
              onChange={(e) => handleUpdate('exercises.defense.common', e.target.value)}
              rows="2"
              placeholder="Összes játékosra vonatkozó gyakorlat..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Szélső védő
              </label>
              <Textarea
                value={data.exercises.defense.wing}
                onChange={(e) => handleUpdate('exercises.defense.wing', e.target.value)}
                rows="2"
                placeholder="Szélső védő feladatai..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Középső védő
              </label>
              <Textarea
                value={data.exercises.defense.pivot}
                onChange={(e) => handleUpdate('exercises.defense.pivot', e.target.value)}
                rows="2"
                placeholder="Középső védő feladatai..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-fg mb-2">
                Hátvédő
              </label>
              <Textarea
                value={data.exercises.defense.backcourt}
                onChange={(e) => handleUpdate('exercises.defense.backcourt', e.target.value)}
                rows="2"
                placeholder="Hátvédő feladatai..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Goalkeeper */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-fg mb-2">
          <Hand className="w-4 h-4 text-muted" aria-hidden="true" />
          Kapus edzés
        </label>
        <Textarea
          value={data.exercises.goalkeeper}
          onChange={(e) => handleUpdate('exercises.goalkeeper', e.target.value)}
          rows="3"
          placeholder="Kapus specifikus gyakorlatok..."
        />
      </div>
    </div>
  )
}
