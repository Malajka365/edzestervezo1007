import { useState } from 'react'
import { ArrowUp, ArrowDown, RotateCcw, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDefaultWidgets, WIDGETS_BY_KEY } from '../../lib/dashboardWidgets'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import IconButton from '../../components/ui/IconButton'

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
    <Modal
      open
      onClose={onClose}
      title="Kezdőlap testreszabása"
      footer={
        <>
          <Button variant="ghost" icon={RotateCcw} onClick={handleReset} className="mr-auto">
            Alaphelyzet
          </Button>
          <Button onClick={onClose}>Mégse</Button>
          <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>
            {saving ? 'Mentés...' : 'Mentés'}
          </Button>
        </>
      }
    >
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nincs testreszabható elem.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const widget = WIDGETS_BY_KEY[item.key]
            if (!widget) return null
            const Icon = widget.icon
            return (
              <li
                key={item.key}
                className="flex items-center gap-3 rounded-[9px] border border-line bg-surface-2 px-3 py-2"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.visible}
                    onChange={() => toggleVisible(index)}
                    className="h-4 w-4 flex-shrink-0 rounded accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  />
                  <Icon className="h-4 w-4 flex-shrink-0 text-muted" aria-hidden="true" />
                  <span className="truncate text-sm text-fg">{widget.name}</span>
                </label>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <IconButton
                    icon={ArrowUp}
                    label="Feljebb"
                    size="sm"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  />
                  <IconButton
                    icon={ArrowDown}
                    label="Lejjebb"
                    size="sm"
                    onClick={() => moveDown(index)}
                    disabled={index === items.length - 1}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
