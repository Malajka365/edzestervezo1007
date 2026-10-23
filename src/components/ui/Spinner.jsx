import { Loader2 } from 'lucide-react'

const SIZES = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }

// Alapértelmezetten akcentszínű; a Button üres className-nel hívja, hogy a gomb
// szövegszínét (currentColor) örökölje.
export default function Spinner({ size = 'md', className = 'text-accent' }) {
  return (
    <span role="status" aria-label="Betöltés" className={`inline-flex ${className}`}>
      <Loader2 className={`${SIZES[size] ?? SIZES.md} animate-spin`} aria-hidden="true" />
    </span>
  )
}
