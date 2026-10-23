import { Children, cloneElement, forwardRef, isValidElement } from 'react'

const CONTROL =
  'w-full rounded-[9px] border border-line-strong bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-subtle transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-bad'

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`${CONTROL} ${className}`} {...props} />
})

export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <select ref={ref} className={`${CONTROL} ${className}`} {...props}>
      {children}
    </select>
  )
})

export const Textarea = forwardRef(function Textarea({ className = '', ...props }, ref) {
  return <textarea ref={ref} className={`${CONTROL} ${className}`} {...props} />
})

// Címke + súgó + hibaüzenet a mező köré. Az egyetlen gyermek vezérlőre
// automatikusan ráteszi az aria-describedby / aria-invalid attribútumokat.
export function Field({ label, hint, error, htmlFor, children }) {
  const hintId = hint && !error && htmlFor ? `${htmlFor}-hint` : undefined
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined
  const describedBy = errorId ?? hintId

  const control =
    isValidElement(children) && Children.count(children) === 1
      ? cloneElement(children, {
          'aria-describedby': children.props['aria-describedby'] ?? describedBy,
          'aria-invalid': children.props['aria-invalid'] ?? (error ? true : undefined),
        })
      : children

  return (
    <div className="grid gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-semibold text-muted">
          {label}
        </label>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-bad">
          {error}
        </p>
      )}
    </div>
  )
}

export default Field
