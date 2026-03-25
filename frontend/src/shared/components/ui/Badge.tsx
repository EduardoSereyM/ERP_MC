import clsx from 'clsx'

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-success-10 text-success-text',
  danger:  'bg-danger-10 text-danger-text',
  warning: 'bg-warning-10 text-warning-text',
  info:    'bg-info-10 text-info-text',
  neutral: 'bg-surface-subtle text-text-secondary',
}

export const Badge = ({ variant = 'neutral', children, className }: BadgeProps) => (
  <span
    className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      VARIANTS[variant],
      className
    )}
  >
    {children}
  </span>
)
