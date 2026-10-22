import { forwardRef } from 'react'

const SIZES = { md: 'w-9 h-9', sm: 'w-7 h-7' }

const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, size = 'md', type = 'button', className = '', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-[9px] text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${
        SIZES[size] ?? SIZES.md
      } ${className}`}
      {...props}
    >
      <Icon className={size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'} aria-hidden="true" />
    </button>
  )
})

export default IconButton
