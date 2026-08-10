import logoLight from '@/assets/brand/logo-light.png'
import logoDark from '@/assets/brand/logo-dark.png'
import { useTheme } from '@/features/theme/useTheme'

type BrandLogoProps = {
  className?: string
  /** Force a specific logo variant (e.g. dark logo on a navy sidebar). */
  variant?: 'auto' | 'light' | 'dark'
}

export function BrandLogo({ className = 'h-9 w-auto object-contain', variant = 'auto' }: BrandLogoProps) {
  const { theme } = useTheme()
  const mode = variant === 'auto' ? theme : variant
  const src = mode === 'dark' ? logoDark : logoLight

  return <img src={src} alt="B&C Software & Web" className={className} />
}
