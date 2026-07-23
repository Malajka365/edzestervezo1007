import { X } from 'lucide-react'

export default function CreateSeasonModal({ newSeason, setNewSeason, onSubmit, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Új Szezon Létrehozása</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Szezon Neve
            </label>
            <input
              type="text"
              value={newSeason.name}
              onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
              className="input-field"
              placeholder="pl. 2024/2025 Szezon"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Kezdő Dátum
            </label>
            <input
              type="date"
              value={newSeason.start_date}
              onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Befejező Dátum
            </label>
            <input
              type="date"
              value={newSeason.end_date}
              onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
              className="input-field"
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
              className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Létrehozás...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
