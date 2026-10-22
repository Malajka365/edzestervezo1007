// src/pages/dashboard-home/WidgetCard.jsx
//
// Shared frame for every dashboard-home widget: a Panel with a header
// (icon + title) and a children body. Widgets look uniform because only the
// body differs.
//
//   <WidgetCard icon={CalendarDays} title="Következő 7 nap">
//     ...body...
//   </WidgetCard>
import Panel from '../../components/ui/Panel'

export default function WidgetCard({ icon, title, children }) {
  return (
    <Panel icon={icon} title={title} className="flex h-full flex-col">
      <div className="min-h-0 flex-1">{children}</div>
    </Panel>
  )
}
