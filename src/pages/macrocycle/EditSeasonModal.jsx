export default function EditSeasonModal({ editSeason, setEditSeason, onSubmit, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-4">Szezon Szerkesztése</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Szezon Neve
            </label>
            <input
              type="text"
              value={editSeason.name}
              onChange={(e) => setEditSeason({ ...editSeason, name: e.target.value })}
              className="input-field w-full"
              placeholder="pl. 2024/2025 Őszi Szezon"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Kezdő Dátum
            </label>
            <input
              type="date"
              value={editSeason.start_date}
              onChange={(e) => setEditSeason({ ...editSeason, start_date: e.target.value })}
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Befejező Dátum
            </label>
            <input
              type="date"
              value={editSeason.end_date}
              onChange={(e) => setEditSeason({ ...editSeason, end_date: e.target.value })}
              className="input-field w-full"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Frissítés...' : 'Frissítés'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
