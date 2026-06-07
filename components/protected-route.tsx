'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getRefreshToken, tryRefreshToken, getStoredRole } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

/**
 * Handles auth gating without ever showing a spinner.
 *
 * States:
 *   'ok'      → user has a valid access token — render immediately
 *   'refresh' → no access token but has refresh token — try silently;
 *                children render NOW and show their own skeleton states
 *                while the token exchange runs in the background
 *   'denied'  → no tokens at all — redirect to /login instantly, render nothing
 *
 * The page's own skeleton states (TanStack Query isLoading) are the loading UI.
 * This component is intentionally invisible — it only handles redirects.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter()
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    // Case 1: already authenticated — nothing to do
    if (isAuthenticated()) {
      if (requiredRole) {
        const role = getStoredRole()
        if (role && role !== requiredRole) {
          router.replace(role === 'lecturer' ? '/dashboard/lecturer' : '/dashboard/student')
        }
      }
      return
    }

    // Case 2: no access token — check for refresh token
    if (!getRefreshToken()) {
      // No tokens at all — redirect immediately
      setDenied(true)
      router.replace('/login')
      return
    }

    // Case 3: has refresh token — try silently while children show their skeletons
    tryRefreshToken().then((ok) => {
      if (!ok) {
        setDenied(true)
        router.replace('/login')
      }
      // If ok, the new access token is in localStorage — axios interceptor
      // will retry any failed queries automatically
    })
  }, [router, requiredRole])

  // Only suppress render when we know it's denied (redirect in flight)
  if (denied) return null

  // All other states: render children. They show their own skeleton states.
  return <>{children}</>
}
