// Widget: "Jegyzet" — saját jegyzet a kezdőlapon. A szöveg a widget
// beállításaiban (settings.text) tárolódik, gépelés után késleltetve mentve;
// a még ki nem írt szöveget az oldal elhagyásakor azonnal elmenti.
import { useEffect, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import WidgetCard from '../WidgetCard'

const SAVE_DELAY_MS = 700

export default function NoteWidget({ settings = {}, onSettingsChange }) {
  const [text, setText] = useState(settings.text ?? '')
  const timer = useRef(null)
  const pending = useRef(null)
  const onChangeRef = useRef(onSettingsChange)
  onChangeRef.current = onSettingsChange

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current === null) return
    const value = pending.current
    pending.current = null
    onChangeRef.current?.({ text: value })
  }

  useEffect(() => flush, [])

  const handleChange = (e) => {
    const value = e.target.value
    setText(value)
    pending.current = value
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  return (
    <WidgetCard icon={StickyNote} title="Jegyzet">
      <textarea
        aria-label="Jegyzet"
        value={text}
        onChange={handleChange}
        placeholder="Írj ide bármit, csak te látod."
        className="h-full min-h-[70px] w-full resize-none bg-transparent text-sm text-fg placeholder:text-subtle focus:outline-none"
      />
    </WidgetCard>
  )
}
