import { X } from 'lucide-react'
import { useState } from 'react'
import bodyDiagram from '../assets/body-diagram.png'

export default function BodyDiagram({ painPoints, onPainPointsChange, readOnly = false }) {
  const [selectedColor, setSelectedColor] = useState('#ef4444') // red-500
  const [selectedLabel, setSelectedLabel] = useState('1')
  const [labelType, setLabelType] = useState('number') // 'number' vagy 'letter'

  const colors = [
    { name: 'Piros', value: '#ef4444' },
    { name: 'Kék', value: '#3b82f6' },
    { name: 'Zöld', value: '#10b981' },
    { name: 'Sárga', value: '#eab308' },
    { name: 'Lila', value: '#a855f7' },
    { name: 'Narancs', value: '#f97316' },
  ]

  const handleClick = (e, view) => {
    if (readOnly) return // Read-only módban nem lehet új pontot hozzáadni
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const newPoint = {
      id: Date.now(),
      x: x.toFixed(2),
      y: y.toFixed(2),
      view: view,
      color: selectedColor,
      label: selectedLabel,
    }

    onPainPointsChange([...painPoints, newPoint])
    
    // Auto-increment label
    if (labelType === 'number') {
      const num = parseInt(selectedLabel)
      if (!isNaN(num)) {
        setSelectedLabel((num + 1).toString())
      }
    } else {
      // Auto-increment letter
      const nextChar = String.fromCharCode(selectedLabel.charCodeAt(0) + 1)
      if (nextChar <= 'Z') {
        setSelectedLabel(nextChar)
      }
    }
  }

  const removePoint = (id) => {
    if (readOnly) return // Read-only módban nem lehet törölni
    onPainPointsChange(painPoints.filter(p => p.id !== id))
  }

  const frontViewPoints = painPoints.filter(p => p.view === 'front')
  const backViewPoints = painPoints.filter(p => p.view === 'back')

  return (
    <div className="space-y-3">
      {/* Main Layout: Body diagrams on left, controls on right */}
      <div className={`flex gap-4 ${readOnly ? 'justify-center' : ''}`}>
        {/* Body Diagrams */}
        <div className={`flex gap-2 ${readOnly ? 'w-full max-w-4xl' : 'flex-1'}`}>
          {/* Front View */}
          <div className="flex gap-1 items-center flex-1">
            <div className="w-8 flex items-center justify-center">
              <h4 className="text-sm font-medium text-white -rotate-90 whitespace-nowrap">Elölnézet</h4>
            </div>
            <div className="relative flex-1">
              <div
                className="relative bg-slate-700/30 rounded-lg p-3 cursor-crosshair"
                onClick={(e) => handleClick(e, 'front')}
                style={{ 
                  backgroundImage: `url(${bodyDiagram})`,
                  backgroundSize: '200% 100%',
                  backgroundPosition: '0% 0%',
                  backgroundRepeat: 'no-repeat',
                  aspectRatio: '1 / 2.5',
                  minHeight: '500px',
                  maxHeight: 'calc(100vh - 250px)',
                  height: '75vh'
                }}
              >
                {/* Pain Points */}
                {frontViewPoints.map((point) => (
                  <div
                    key={point.id}
                    className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white shadow-lg transition-all flex items-center justify-center font-bold text-white text-xs ${
                      readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                    }`}
                    style={{ 
                      left: `${point.x}%`, 
                      top: `${point.y}%`,
                      backgroundColor: point.color || '#ef4444'
                    }}
                    onClick={(e) => {
                      if (!readOnly) {
                        e.stopPropagation()
                        removePoint(point.id)
                      }
                    }}
                    title={readOnly && point.anamnesisDate 
                      ? `Felvétel dátuma: ${new Date(point.anamnesisDate).toLocaleDateString('hu-HU')}`
                      : readOnly 
                      ? 'Fájdalom pont' 
                      : 'Kattints a törléshez'
                    }
                  >
                    {point.label || '?'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Back View */}
          <div className="flex gap-1 items-center flex-1">
            <div className="w-8 flex items-center justify-center">
              <h4 className="text-sm font-medium text-white -rotate-90 whitespace-nowrap">Hátulnézet</h4>
            </div>
            <div className="relative flex-1">
              <div
                className="relative bg-slate-700/30 rounded-lg p-3 cursor-crosshair"
                onClick={(e) => handleClick(e, 'back')}
                style={{ 
                  backgroundImage: `url(${bodyDiagram})`,
                  backgroundSize: '200% 100%',
                  backgroundPosition: '100% 0%',
                  backgroundRepeat: 'no-repeat',
                  aspectRatio: '1 / 2.5',
                  minHeight: '500px',
                  maxHeight: 'calc(100vh - 250px)',
                  height: '75vh'
                }}
              >
                {/* Pain Points */}
                {backViewPoints.map((point) => (
                  <div
                    key={point.id}
                    className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full border-2 border-white shadow-lg transition-all flex items-center justify-center font-bold text-white text-xs ${
                      readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                    }`}
                    style={{ 
                      left: `${point.x}%`, 
                      top: `${point.y}%`,
                      backgroundColor: point.color || '#ef4444'
                    }}
                    onClick={(e) => {
                      if (!readOnly) {
                        e.stopPropagation()
                        removePoint(point.id)
                      }
                    }}
                    title={readOnly && point.anamnesisDate 
                      ? `Felvétel dátuma: ${new Date(point.anamnesisDate).toLocaleDateString('hu-HU')}`
                      : readOnly 
                      ? 'Fájdalom pont' 
                      : 'Kattints a törléshez'
                    }
                  >
                    {point.label || '?'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Controls - Right Side - csak edit módban */}
        {!readOnly && (
        <div className="w-64 space-y-4">
          {/* Színválasztó */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <label className="block text-xs font-medium text-white mb-2">Jelölő szín</label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color.value ? 'border-white scale-110' : 'border-slate-600'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Címke típus választó */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <label className="block text-xs font-medium text-white mb-2">Címke típus</label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setLabelType('number')
                  setSelectedLabel('1')
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  labelType === 'number'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                Szám (1,2,3...)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLabelType('letter')
                  setSelectedLabel('A')
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  labelType === 'letter'
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                Betű (A,B,C...)
              </button>
            </div>
          </div>

          {/* Aktuális címke */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <label className="block text-xs font-medium text-white mb-2">Következő címke</label>
            <input
              type="text"
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg text-center text-2xl font-bold"
              maxLength={3}
            />
          </div>
        </div>
        )}
      </div>

      {!readOnly && (
        <>
          <p className="text-center text-xs text-slate-400">
            Kattints a testre a pontok jelöléséhez • A pontokra kattintva törölheted őket
          </p>

          {/* Points Summary */}
          {painPoints.length > 0 && (
            <div className="bg-slate-700/30 rounded-lg p-3">
              <p className="text-xs text-slate-300 mb-2 font-medium">
                Jelölt pontok: {painPoints.length}
              </p>
              <div className="flex flex-wrap gap-2">
                {painPoints.map((point) => (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() => removePoint(point.id)}
                    className="px-2 py-1 rounded-lg text-xs border-2 border-white hover:scale-105 transition-all flex items-center gap-1.5 font-semibold"
                    style={{ backgroundColor: point.color || '#ef4444', color: 'white' }}
                  >
                    <span className="text-sm">{point.label || '?'}</span>
                    <span className="opacity-75">•</span>
                    <span>{point.view === 'front' ? 'Elöl' : 'Hátul'}</span>
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
