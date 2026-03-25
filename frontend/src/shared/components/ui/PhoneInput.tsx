import clsx from 'clsx'

interface PhoneInputProps {
  label?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  error?: string
  success?: boolean
  required?: boolean
}

const MAX_DIGITS = 9 // Chile: 9 XXXX XXXX (mobile) o 2 XXXX XXXX (fijo)

function formatLocal(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, MAX_DIGITS)
  if (!digits) return ''
  if (digits[0] === '9') {
    const rest = digits.slice(1)
    if (rest.length === 0) return '9'
    if (rest.length <= 4) return `9 ${rest}`
    return `9 ${rest.slice(0, 4)} ${rest.slice(4, 8)}`
  }
  // Fijo ej: 2 2345 6789
  if (digits.length <= 1) return digits
  const head = digits[0]
  const rest = digits.slice(1)
  if (rest.length <= 4) return `${head} ${rest}`
  return `${head} ${rest.slice(0, 4)} ${rest.slice(4, 8)}`
}

export const PhoneInput = ({ label, value, onChange, onBlur, error, success, required }: PhoneInputProps) => {
  const localPart = value.startsWith('+56 ') ? value.slice(4) : value.replace(/^\+56\s?/, '')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatLocal(e.target.value)
    onChange(formatted ? `+56 ${formatted}` : '')
  }

  const inputId = label?.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div
        className={clsx(
          'flex items-center rounded-lg border text-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-0',
          error
            ? 'border-danger bg-danger-10 focus-within:ring-danger'
            : success
              ? 'border-emerald-500 bg-emerald-50/30 focus-within:ring-emerald-500'
              : 'border-surface-border bg-surface hover:border-text-disabled'
        )}
      >
        <span className="select-none pl-3 pr-1 text-text-disabled">+56</span>
        <input
          id={inputId}
          type="tel"
          value={localPart}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder="9 1234 5678"
          className="flex-1 bg-transparent py-2 pr-3 text-text-primary placeholder:text-text-disabled focus:outline-none"
        />
      </div>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  )
}
