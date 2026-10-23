import Spinner from './ui/Spinner'

// Unified loading indicator.
//
//   <LoadingSpinner />                 // full-screen (route/page loading)
//   <LoadingSpinner size="inline" />   // centered block, for card/section content areas
//   <LoadingSpinner size="xs" />       // small horizontal icon+text, for compact badges/one-liners
//
// `label` overrides the default "Betöltés..." text; pass label={null} to show
// the spinner only.
export default function LoadingSpinner({ size = 'full', label = 'Betöltés...' }) {
  if (size === 'xs') {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted">
        <Spinner size="sm" className="text-muted" />
        {label && <span>{label}</span>}
      </span>
    )
  }

  if (size === 'inline') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Spinner size="md" />
        {label && <p className="text-muted">{label}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
