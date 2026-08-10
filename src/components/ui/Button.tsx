import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-btn-primary-bg text-btn-primary-fg hover:bg-btn-primary-hover focus-visible:ring-blue disabled:opacity-60',
  secondary:
    'border border-line bg-surface-elevated text-ink hover:bg-surface-muted focus-visible:ring-blue',
  ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-blue',
  danger:
    'bg-danger text-white hover:opacity-90 focus-visible:ring-red-400 disabled:opacity-60',
}

const sizes: Record<Size, string> = {
  sm: 'rounded-md px-2.5 py-1.5 text-xs',
  md: 'rounded-md px-3.5 py-2 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
