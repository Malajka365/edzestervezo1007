import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { buildCommands, filterCommands } from '../../lib/commands'
import Modal from '../ui/Modal'
import { useNavGroups } from './useNavGroups'

// Ctrl+K parancspaletta: oldalak és gyors műveletek ékezetfüggetlen kereséssel.
export default function CommandPalette({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keresés, parancsok" size="md">
      <PaletteBody onClose={onClose} />
    </Modal>
  )
}

// Csak nyitott állapotban csatolódik, így a keresés és a kijelölés minden megnyitáskor tiszta.
function PaletteBody({ onClose }) {
  const navigate = useNavigate()
  const groups = useNavGroups()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const results = filterCommands(buildCommands(groups), query)
  // Csoportonként rendezve; az index a lapos találati listában a kijelölés helye.
  const sections = []
  results.forEach((command, index) => {
    let section = sections.find((s) => s.group === command.group)
    if (!section) sections.push((section = { group: command.group, entries: [] }))
    section.entries.push({ command, index })
  })
  const activeId = results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' })
  }, [activeId])

  const run = (command) => {
    onClose()
    navigate(command.path)
  }

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (results.length) setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (results.length) setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[activeIndex]) run(results[activeIndex])
    }
  }

  return (
    <div className="-m-4">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Search className="h-4 w-4 flex-shrink-0 text-muted" aria-hidden="true" />
        <input
          data-autofocus
          type="text"
          role="combobox"
          aria-label="Keresés"
          aria-expanded={results.length > 0}
          aria-controls={results.length > 0 ? listId : undefined}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Oldal vagy művelet keresése…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-subtle focus:outline-none"
        />
      </div>

      {results.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">Nincs találat.</p>
      ) : (
        <div id={listId} role="listbox" aria-label="Találatok" className="max-h-[50vh] overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section.group} role="group" aria-labelledby={`${listId}-g-${section.group}`}>
              <div
                id={`${listId}-g-${section.group}`}
                className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-subtle"
              >
                {section.group}
              </div>
              {section.entries.map(({ command, index }) => {
                const Icon = command.icon
                const selected = index === activeIndex
                return (
                  <div
                    key={command.id}
                    id={`${listId}-${command.id}`}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => run(command)}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-sm ${
                      selected ? 'bg-surface-3 text-fg' : 'text-muted'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${selected ? 'text-accent' : ''}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{command.label}</span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
