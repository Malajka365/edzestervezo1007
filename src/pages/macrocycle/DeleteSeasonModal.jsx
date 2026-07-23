export default function DeleteSeasonModal({ seasonToDelete, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-4">Szezon Törlése</h2>
        <p className="text-slate-300 mb-6">
          Biztosan törölni szeretnéd a <strong className="text-white">{seasonToDelete.name}</strong> szezont?
          <br /><br />
          <span className="text-red-400">Ez a művelet nem visszavonható, és az összes kapcsolódó tervezési adat is törlődni fog!</span>
        </p>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Mégse
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Törlés...' : 'Törlés'}
          </button>
        </div>
      </div>
    </div>
  )
}
