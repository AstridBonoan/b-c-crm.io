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
    'bg-brand-700 text-white hover:bg-brand-800 focus-visible:ring-brand-500 disabled:bg-brand-700/60',
  secondary:
    'border border-line bg-white text-ink hover:bg-brand-50 focus-visible:ring-brand-400',
  ghost: 'text-ink-muted hover:bg-black/5 hover:text-ink focus-visible:ring-brand-400',
  danger:
    'bg-danger text-white hover:bg-red-800 focus-visible:ring-red-400 disabled:bg-danger/60',
}

const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
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
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
