import { Loader2 } from 'lucide-react'

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
      <span className="inline-flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        {label && <span>{label}</span>}
      </span>
    )
  }

  if (size === 'inline') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        {label && <p className="text-slate-400">{label}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
    </div>
  )
}
