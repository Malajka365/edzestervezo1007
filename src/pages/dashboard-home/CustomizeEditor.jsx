import { useState } from 'react'
import { ArrowUp, ArrowDown, RotateCcw, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDefaultWidgets, WIDGETS_BY_KEY } from '../../lib/dashboardWidgets'

// A mentett/default sorrendet (baseList) egészíti ki azokkal az engedélyezett
// widgetekkel, amelyek még nincsenek benne (visible:false-ként, a registry
// sorrendjében a végén) — így a szerkesztő mindig MINDEN engedélyezett
// widgetet listáz, még akkor is, ha az még sosem szerepelt a felhasználó
// mentett beállításaiban.
function mergeWithAllowed(baseList, allowedWidgets) {
  const allowedKeySet = new Set(allowedWidgets.map((w) => w.key))
  const kept = baseList
    .filter((item) => allowedKeySet.has(item.key))
    .map((item) => ({ key: item.key, visible: !!item.visible }))
  const keptKeys = new Set(kept.map((item) => item.key))
  const appended = allowedWidgets
    .filter((w) => !keptKeys.has(w.key))
    .map((w) => ({ key: w.key, visible: false }))
  return [...kept, ...appended]
}

/**
 * A "Testreszabás" szerkesztő modal. Csak megnyitáskor mountolódik
 * (DashboardHome feltételesen renderli), így a helyi `items` state minden
 * megnyitáskor a friss mentett sorrendből épül fel újra — a szerkesztés
 * Mégse / bezárás esetén nem szivárog vissza a mentett prefs-be.
 *
 * @param {{key:string, visible:boolean}[]} sourceList - mentett prefs vagy szerepkör-default.
 * @param {{key:string, name:string, icon, module_key}[]} allowedWidgets - filterAllowedWidgets(permissions) eredménye.
 * @param {string|null|undefined} role - a felhasználó csapat-szerepköre (Alaphelyzethez).
 * @param {Record<string,string>} permissions - module_key -> access_level (Alaphelyzethez).
 * @param {(widgets:Array)=>Promise} savePrefs - useDashboardPrefs().savePrefs.
 * @param {()=>void} onClose - bezárja a szerkesztőt (mentés nélkül is).
 */
export default function CustomizeEditor({
  sourceList,
  allowedWidgets,
  role,
  permissions,
  savePrefs,
  onClose,
}) {
  const [items, setItems] = useState(() => mergeWithAllowed(sourceList, allowedWidgets))
  const [saving, setSaving] = useState(false)

  const moveUp = (index) => {
    if (index === 0) return
    setItems((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const moveDown = (index) => {
    setItems((prev) => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
      return next
    })
  }

  const toggleVisible = (index) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, visible: !item.visible } : item))
    )
  }

  const handleReset = () => {
    setItems(mergeWithAllowed(getDefaultWidgets(role, permissions), allowedWidgets))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePrefs(items)
      toast.success('Kezdőlap elmentve!')
      onClose()
    } catch (error) {
      toast.error('Hiba történt a mentés során.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Kezdőlap testreszabása</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            aria-label="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Nincs testreszabható elem.</p>
        ) : (
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {items.map((item, index) => {
              const widget = WIDGETS_BY_KEY[item.key]
              if (!widget) return null
              const Icon = widget.icon
              return (
                <li
                  key={item.key}
                  className="flex items-center gap-3 px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg"
                >
                  <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.visible}
                      onChange={() => toggleVisible(index)}
                      className="w-4 h-4 rounded border-slate-600 text-primary-600 focus:ring-primary-500"
                    />
                    <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-white truncate">{widget.name}</span>
                  </label>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      aria-label="Feljebb"
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                      disabled={index === items.length - 1}
                      aria-label="Lejjebb"
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Alaphelyzet
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Mégse
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Mentés...' : 'Mentés'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
