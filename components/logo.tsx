'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  collapsed?: boolean
  className?: string
  height?: number
}

export function Logo({ collapsed = false, className, height = 32 }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (collapsed) return null

  // Avoid hydration mismatch — render nothing until mounted
  if (!mounted) return <div style={{ height }} />

  // logo-dark.svg = dark text (use on light backgrounds)
  // logo-light.svg = white text (use on dark backgrounds)
  const src = resolvedTheme === 'dark' ? '/logo-light.svg' : '/logo-dark.svg'

  return (
    <Image
      src={src}
      alt="AttendIQ"
      width={140}
      height={height}
      className={cn('object-contain', className)}
      priority
    />
  )
}
