import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  collapsed?: boolean
  className?: string
  height?: number
}

/**
 * Renders BOTH theme variants and lets CSS pick the visible one via the
 * `dark` class next-themes stamps on <html> before first paint. No mount
 * gate, no useTheme, no hydration mismatch — and crucially no blank flash
 * on page refresh (the old version rendered an empty div until React
 * mounted, which made the logo "disappear" for a moment on every reload).
 */
export function Logo({ collapsed = false, className, height = 32 }: LogoProps) {
  if (collapsed) return null

  return (
    <>
      {/* logo-dark.svg = dark text (light backgrounds) */}
      <Image
        src="/logo-dark.svg"
        alt="AttendIQ"
        width={140}
        height={height}
        className={cn('object-contain dark:hidden', className)}
        priority
      />
      {/* logo-light.svg = white text (dark backgrounds) */}
      <Image
        src="/logo-light.svg"
        alt="AttendIQ"
        width={140}
        height={height}
        className={cn('object-contain hidden dark:block', className)}
        priority
      />
    </>
  )
}
