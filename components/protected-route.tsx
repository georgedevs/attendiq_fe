'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getRefreshToken, tryRefreshToken, getStoredRole } from '@/lib/auth'
import { useMe } from '@/hooks/use-me'
import type { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

/**
 * Handles auth gating without ever showing a spinner.
 *
 * States:
 *   'ok'      → user has a valid access token and the role matches, render immediately
 *   'refresh' → no access token but has refresh token, try silently;
 *                children render NOW and show their own skeleton states
 *                while the token exchange runs in the background
 *   'denied'  → no tokens at all, or the stored role doesn't match this
 *                route's requiredRole, redirect instantly, render nothing
 *
 * Role gating is two layers:
 *   1. Instant, from the JWT payload (decoded client-side, unverified) so a
 *      student hitting a lecturer-only route is redirected before the wrong
 *      dashboard ever renders.
 *   2. Authoritative, from the server's /users/me response, so even a
 *      hand-edited localStorage token/role gets bounced the moment the
 *      signed server answer arrives. The backend's route guards (403s)
 *      remain the real security boundary; this layer just makes the FE
 *      behave correctly instead of half-rendering a forbidden area.
 *
 * The page's own skeleton states (TanStack Query isLoading) are the loading UI.
 * This component is intentionally invisible. It only handles redirects.
 */
export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter()
  const [denied, setDenied] = useState(false)

  // Layer 2: server-verified role. useMe is cached (staleTime 5 min) and
  // shared with the dashboards, so this adds no extra request. Derived during
  // render (not state) so it can't be clobbered by the layer-1 effect below.
  const { data: meData } = useMe()
  const serverRole = meData?.data?.role
  const serverMismatch = !!(requiredRole && serverRole && serverRole !== requiredRole)

  useEffect(() => {
    if (serverMismatch) {
      router.replace(serverRole === 'lecturer' ? '/dashboard/lecturer' : '/dashboard/student')
    }
  }, [serverMismatch, serverRole, router])

  useEffect(() => {
    // Layer 1: role gate from the JWT payload, synchronously, so a role
    // mismatch never renders the wrong dashboard even for a single frame.
    const role = getStoredRole()
    if (requiredRole && role && role !== requiredRole) {
      setDenied(true)
      router.replace(role === 'lecturer' ? '/dashboard/lecturer' : '/dashboard/student')
      return
    }

    // The dashboard layout (and therefore this component) stays mounted when
    // redirecting between /dashboard/lecturer/* and /dashboard/student/*, so
    // an earlier denial must be cleared once the new route's gate passes,
    // otherwise the allowed destination renders blank.
    setDenied(false)

    // Case 1: already authenticated, nothing else to do
    if (isAuthenticated()) return

    // Case 2: no access token, check for refresh token
    if (!getRefreshToken()) {
      // No tokens at all, redirect immediately
      setDenied(true)
      router.replace('/login')
      return
    }

    // Case 3: has refresh token, try silently while children show their skeletons
    tryRefreshToken().then((ok) => {
      if (!ok) {
        setDenied(true)
        router.replace('/login')
      }
      // If ok, the new access token is in localStorage, axios interceptor
      // will retry any failed queries automatically
    })
  }, [router, requiredRole])

  // Only suppress render when we know it's denied (redirect in flight)
  if (denied || serverMismatch) return null

  // All other states: render children. They show their own skeleton states.
  return <>{children}</>
}
