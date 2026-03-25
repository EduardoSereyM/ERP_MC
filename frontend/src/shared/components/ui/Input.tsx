import clsx from 'clsx'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  success?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, success, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
            {label}
            {props.required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'rounded-lg border px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0',
            error
              ? 'border-danger bg-danger-10 focus:ring-danger'
              : success
                ? 'border-emerald-500 bg-emerald-50/30 focus:ring-emerald-500'
                : 'border-surface-border bg-surface hover:border-text-disabled',
            props.disabled && 'bg-surface-subtle text-text-disabled cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger-text">{error}</p>}
        {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
