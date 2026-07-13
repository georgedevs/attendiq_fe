'use client'

import { useEffect, useState } from 'react'
import { MapPin, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PermState = 'checking' | 'prompt' | 'denied' | 'granted' | 'unsupported'

// Set after a successful position fix on browsers without the Permissions
// API (older iOS Safari) so we don't nag users who already granted access.
const GEO_GRANTED_FLAG = 'attendiq_geo_granted'

/**
 * Proactively gets the geolocation permission sorted BEFORE it's needed:
 *
 *  - 'prompt'  → shows an "Enable location" button that fires the browser's
 *                real permission dialog right from the dashboard.
 *  - 'denied'  → the browser refuses to re-prompt, so show the unblock steps.
 *  - 'granted' → renders nothing; no nagging.
 *
 * Live-updates via PermissionStatus.onchange, so flipping the setting in the
 * browser UI makes the banner disappear without a refresh.
 */
export function LocationPermissionBanner() {
  const [state, setState] = useState<PermState>('checking')
  const [requesting, setRequesting] = useState(false)
  const [justGranted, setJustGranted] = useState(false)

  useEffect(() => {
    let perm: PermissionStatus | null = null
    let cancelled = false

    async function check() {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        setState('unsupported')
        return
      }
      if (navigator.permissions?.query) {
        try {
          perm = await navigator.permissions.query({ name: 'geolocation' })
          if (cancelled) return
          setState(perm.state as PermState)
          perm.onchange = () => {
            if (!cancelled && perm) setState(perm.state as PermState)
          }
          return
        } catch {
          // fall through to the flag-based fallback
        }
      }
      // No Permissions API (older iOS): only show the ask once ever granted.
      setState(localStorage.getItem(GEO_GRANTED_FLAG) ? 'granted' : 'prompt')
    }

    void check()
    return () => {
      cancelled = true
      if (perm) perm.onchange = null
    }
  }, [])

  const requestPermission = () => {
    setRequesting(true)
    navigator.geolocation.getCurrentPosition(
      () => {
        localStorage.setItem(GEO_GRANTED_FLAG, '1')
        setRequesting(false)
        setState('granted')
        setJustGranted(true)
        setTimeout(() => setJustGranted(false), 4000)
      },
      (err) => {
        setRequesting(false)
        if (err.code === err.PERMISSION_DENIED) setState('denied')
      },
      { timeout: 15000 },
    )
  }

  // Brief confirmation after the user grants from this banner.
  if (justGranted) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-4 py-3">
        <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
        <p className="text-sm text-green-800 dark:text-green-300">
          Location enabled. You&apos;re all set for attendance.
        </p>
      </div>
    )
  }

  if (state === 'checking' || state === 'granted' || state === 'unsupported') return null

  if (state === 'denied') {
    return (
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Location is blocked
          </p>
        </div>
        <p className="text-xs leading-relaxed text-amber-800/90 dark:text-amber-300/90">
          Attendance can&apos;t be verified without it. Your browser is blocking the
          request, so it must be unblocked in settings:{' '}
          <span className="font-medium">Android:</span> tap the lock icon in the address
          bar → Permissions → Location → Allow.{' '}
          <span className="font-medium">iPhone:</span> Settings → Safari (or Chrome) →
          Location → Allow.
        </p>
      </div>
    )
  }

  // state === 'prompt': the browser will show its real dialog when asked.
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium">Enable location for attendance</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            AttendIQ verifies you&apos;re in the classroom. Turning it on now saves
            time when the QR code goes up.
          </p>
        </div>
      </div>
      <Button size="sm" onClick={requestPermission} disabled={requesting} className="shrink-0">
        {requesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enable location'}
      </Button>
    </div>
  )
}
