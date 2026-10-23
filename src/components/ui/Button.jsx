import { forwardRef } from 'react'
import Spinner from './Spinner'

const VARIANTS = {
  primary: 'bg-accent border-accent text-accent-fg hover:bg-accent-hover hover:border-accent-hover',
  secondary: 'bg-surface border-line text-fg hover:bg-surface-2',
  ghost: 'bg-transparent border-transparent text-fg hover:bg-surface-2',
  danger: 'bg-bad border-bad text-on-status hover:brightness-110',
}

const SIZES = {
  md: 'px-3.5 py-2 text-sm min-h-[36px]',
  sm: 'px-2.5 py-1 text-xs min-h-[28px]',
}

const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    loading = false,
    type = 'button',
    disabled,
    className = '',
    children,
    ...props
  },
  ref
) {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-[9px] border font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed ${
        VARIANTS[variant] ?? VARIANTS.secondary
      } ${SIZES[size] ?? SIZES.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" className="" />
      ) : (
        Icon && <Icon className={iconSize} aria-hidden="true" />
      )}
      {children}
    </button>
  )
})

export default Button
