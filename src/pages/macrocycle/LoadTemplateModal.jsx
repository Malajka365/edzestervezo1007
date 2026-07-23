import { Trash2 } from 'lucide-react'

export default function LoadTemplateModal({ templates, onLoad, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Sablon Betöltése</h2>
        <p className="text-slate-300 mb-4">
          Válassz egy sablont a jelenlegi szezonra való alkalmazáshoz.
        </p>

        {templates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">Még nincs mentett sablon.</p>
            <p className="text-slate-500 text-sm mt-2">Hozz létre egy tervezést és mentsd el sablonként!</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-slate-600 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="text-white font-medium">{template.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {template.week_count} hét • {new Date(template.created_at).toLocaleDateString('hu-HU')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onLoad(template)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    Betöltés
                  </button>
                  <button
                    onClick={() => onDelete(template.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    title="Sablon törlése"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  )
}
