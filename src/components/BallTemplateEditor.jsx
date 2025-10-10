import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export default function BallTemplateEditor({ templateData, onChange }) {
  const [data, setData] = useState({
    circulatory_load: templateData?.circulatory_load || 'medium',
    energy_systems: templateData?.energy_systems || [],
    load_rest_ratio: templateData?.load_rest_ratio || { load: 1, rest: 2 },
    training_types: templateData?.training_types || [],
    drills: templateData?.drills || [],
  })

  const handleUpdate = (field, value) => {
    const updated = { ...data, [field]: value }
    setData(updated)
    onChange(updated)
  }

  const toggleEnergySystem = (system) => {
    const updated = data.energy_systems.includes(system)
      ? data.energy_systems.filter(s => s !== system)
      : [...data.energy_systems, system]
    handleUpdate('energy_systems', updated)
  }

  const toggleTrainingType = (type) => {
    const updated = data.training_types.includes(type)
      ? data.training_types.filter(t => t !== type)
      : [...data.training_types, type]
    handleUpdate('training_types', updated)
  }

  const handleAddDrill = () => {
    const newDrill = {
      id: Date.now().toString(),
      name: '',
      duration: 10,
      description: '',
      focus: '',
    }
    handleUpdate('drills', [...data.drills, newDrill])
  }

  const handleUpdateDrill = (id, field, value) => {
    const updated = data.drills.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    )
    handleUpdate('drills', updated)
  }

  const handleDeleteDrill = (id) => {
    handleUpdate('drills', data.drills.filter(d => d.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Circulatory-Mechanical Load */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Keringési-mechanikai terhelés
        </label>
        <div className="flex gap-3">
          {['low', 'medium', 'high'].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleUpdate('circulatory_load', level)}
              className={`flex-1 py-3 rounded-lg transition-colors ${
                data.circulatory_load === level
                  ? level === 'low' ? 'bg-green-600 text-white' :
                    level === 'medium' ? 'bg-yellow-600 text-white' :
                    'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {level === 'low' ? 'Alacsony' : level === 'medium' ? 'Közepes' : 'Magas'}
            </button>
          ))}
        </div>
      </div>

      {/* Energy Systems */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Energiarendszer
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'aerobic', label: 'Aerob' },
            { value: 'anaerobic_lactic', label: 'Anaerob laktát' },
            { value: 'anaerobic_alactic', label: 'Anaerob alaktát' },
            { value: 'mixed', label: 'Vegyes' },
          ].map((system) => (
            <label
              key={system.value}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                data.energy_systems.includes(system.value)
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <input
                type="checkbox"
                checked={data.energy_systems.includes(system.value)}
                onChange={() => toggleEnergySystem(system.value)}
                className="w-5 h-5 rounded border-slate-500"
              />
              <span>{system.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Load:Rest Ratio */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Terhelés : Pihenés arány
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={data.load_rest_ratio.load}
            onChange={(e) => handleUpdate('load_rest_ratio', {
              ...data.load_rest_ratio,
              load: parseInt(e.target.value) || 1
            })}
            className="input-field w-20 text-center"
            min="1"
          />
          <span className="text-2xl font-bold text-slate-400">:</span>
          <input
            type="number"
            value={data.load_rest_ratio.rest}
            onChange={(e) => handleUpdate('load_rest_ratio', {
              ...data.load_rest_ratio,
              rest: parseInt(e.target.value) || 1
            })}
            className="input-field w-20 text-center"
            min="1"
          />
          <span className="text-sm text-slate-400 ml-2">
            ({data.load_rest_ratio.load} perc terhelés, {data.load_rest_ratio.rest} perc pihenés)
          </span>
        </div>
      </div>

      {/* Training Types */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Típus
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'technical', label: 'Technikai' },
            { value: 'tactical', label: 'Taktikai' },
            { value: 'conditioning', label: 'Kondicionális' },
          ].map((type) => (
            <label
              key={type.value}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                data.training_types.includes(type.value)
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <input
                type="checkbox"
                checked={data.training_types.includes(type.value)}
                onChange={() => toggleTrainingType(type.value)}
                className="w-5 h-5 rounded border-slate-500"
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Drills */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-300">
            Gyakorlatok
          </label>
          <button
            type="button"
            onClick={handleAddDrill}
            className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Gyakorlat hozzáadása</span>
          </button>
        </div>

        {data.drills.length === 0 ? (
          <div className="text-center py-8 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
            <p className="text-slate-400">Még nincs gyakorlat hozzáadva</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.drills.map((drill, index) => (
              <div
                key={drill.id}
                className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-slate-400 font-semibold mt-2">{index + 1}.</span>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={drill.name}
                      onChange={(e) => handleUpdateDrill(drill.id, 'name', e.target.value)}
                      className="input-field"
                      placeholder="Gyakorlat neve"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={drill.duration}
                        onChange={(e) => handleUpdateDrill(drill.id, 'duration', parseInt(e.target.value) || 0)}
                        className="input-field w-20"
                        min="1"
                      />
                      <span className="text-slate-400 text-sm">perc</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDrill(drill.id)}
                    className="p-2 hover:bg-red-600 rounded-lg transition-colors"
                    title="Törlés"
                  >
                    <Trash2 className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                <div className="ml-8 space-y-2">
                  <input
                    type="text"
                    value={drill.focus}
                    onChange={(e) => handleUpdateDrill(drill.id, 'focus', e.target.value)}
                    className="input-field w-full"
                    placeholder="Fókusz (pl. Kapura lövés, Védekezés, stb.)"
                  />
                  <textarea
                    value={drill.description}
                    onChange={(e) => handleUpdateDrill(drill.id, 'description', e.target.value)}
                    className="input-field w-full"
                    rows="2"
                    placeholder="Részletek és végrehajtás..."
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {data.drills.length > 0 && (
        <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Gyakorlatok időtartama:</span>
            <span className="font-semibold text-primary-400">
              {data.drills.reduce((total, d) => total + (d.duration || 0), 0)} perc
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
