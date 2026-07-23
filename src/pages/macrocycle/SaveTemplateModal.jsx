export default function SaveTemplateModal({ templateName, setTemplateName, onSubmit, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-4">Sablon Mentése</h2>
        <p className="text-slate-300 mb-4">
          Mentsd el a jelenlegi tervezést sablonként, hogy később más szezonokra is alkalmazhasd.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Sablon Neve
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="input-field w-full"
            placeholder="pl. Őszi Felkészülés Sablon"
            autoFocus
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Mégse
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Mentés...' : 'Mentés'}
          </button>
        </div>
      </div>
    </div>
  )
}
