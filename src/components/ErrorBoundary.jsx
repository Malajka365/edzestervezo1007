import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

// Elkapja a gyerek-komponensek renderelése közben dobott hibákat, hogy egyetlen
// modul hibája ne vigye le az egész alkalmazást fehér képernyőre. React-ben a
// hiba-elkapás CSAK class komponenssel lehetséges (nincs hook-megfelelője), ezért
// class alapú. A `resetKeys` (pl. az aktuális útvonal) megváltozásakor a fallback
// automatikusan visszaáll, így egy hibás modulból ki lehet navigálni újratöltés nélkül.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Fejlesztői naplózás — élesben ide jöhetne egy hibafigyelő szolgáltatás.
    console.error('ErrorBoundary elkapott egy hibát:', error, info)
  }

  componentDidUpdate(prevProps) {
    // Ha az útvonal (vagy más resetKey) változik, felejtsük el a korábbi hibát.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="card max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Hoppá, valami hiba történt</h1>
            <p className="text-slate-400 mb-6">
              A modul betöltése közben váratlan hiba lépett fel. Próbáld meg újratölteni az oldalt.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Oldal újratöltése
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
