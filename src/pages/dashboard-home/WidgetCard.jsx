// src/pages/dashboard-home/WidgetCard.jsx
//
// Shared frame for every dashboard-home widget: `.card` styling with a header
// (icon + title) and a children body. Follow-up agents fill each widget's body;
// this frame stays constant so widgets look uniform.
//
//   <WidgetCard icon={CalendarDays} title="Következő 7 nap">
//     ...body...
//   </WidgetCard>

export default function WidgetCard({ icon: Icon, title, children }) {
  return (
    <div className="card flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        {Icon && (
          <div className="w-9 h-9 bg-slate-700/60 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary-400" />
          </div>
        )}
        <h3 className="text-base font-bold text-white truncate">{title}</h3>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}
