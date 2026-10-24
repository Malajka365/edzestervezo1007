// src/pages/dashboard-home/WidgetCard.jsx
//
// Shared frame for every dashboard-home widget: a Panel with a header
// (icon + title) and a children body. Inside the home grid the WidgetFrame
// already draws the header, so the card renders only its body there.
//
//   <WidgetCard icon={CalendarDays} title="Következő 7 nap">
//     ...body...
//   </WidgetCard>
import { useContext } from 'react'
import Panel from '../../components/ui/Panel'
import { WidgetFrameContext } from './widgetFrameContext'

export default function WidgetCard({ icon, title, children }) {
  const inFrame = useContext(WidgetFrameContext)
  if (inFrame) return <div className="h-full min-h-0">{children}</div>
  return (
    <Panel icon={icon} title={title} className="flex h-full flex-col">
      <div className="min-h-0 flex-1">{children}</div>
    </Panel>
  )
}
