import { Loader2 } from 'lucide-react'

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
    </div>
  )
}
