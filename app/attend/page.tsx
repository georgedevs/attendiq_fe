'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, MapPin, Fingerprint, AlertTriangle, Navigation } from 'lucide-react'
import { AttendPageSkeleton } from '@/components/skeletons'
import { api } from '@/lib/api-client'
import { isAuthenticated } from '@/lib/auth'
import { collectFingerprint } from '@/lib/fingerprint'
import { Button } from '@/components/ui/button'
import { AttendanceBadge, LocationBadge } from '@/components/attendance-badge'
import type { ApiSuccess, AttendanceRecord } from '@/lib/types'

const PENDING_TOKEN   = 'attendiq_pending_capture_token'
const PENDING_SESSION = 'attendiq_pending_session'

// Auto-submit once GPS accuracy is this good or better (metres)
const GPS_GOOD_ENOUGH = 50
// Show "take too long?" hint after this many seconds
const GPS_HINT_AFTER  = 10

type Step = 'capture' | 'login-prompt' | 'gps-waiting' | 'submitting' | 'done' | 'error'

interface GPSCoords { latitude: number; longitude: number; accuracy: number }

function AccuracyLabel({ accuracy }: { accuracy: number | null }) {
  if (accuracy === null) return <span className="italic text-muted-foreground">searching…</span>
  if (accuracy <= 20)   return <span className="text-green-600 dark:text-green-400 font-medium">{Math.round(accuracy)} m — excellent</span>
  if (accuracy <= 50)   return <span className="text-green-600 dark:text-green-400">{Math.round(accuracy)} m — good</span>
  if (accuracy <= 150)  return <span className="text-yellow-600 dark:text-yellow-400">{Math.round(accuracy)} m — fair</span>
  return <span className="text-muted-foreground">{Math.round(accuracy)} m — weak signal</span>
}

function AttendPage() {
  const params  = useSearchParams()
  const router  = useRouter()
  const t = params.get('t')
  const s = params.get('s')

  const [step, setStep]               = useState<Step>('capture')
  const [captureToken, setCaptureToken] = useState<string | null>(null)
  const [record, setRecord]           = useState<AttendanceRecord | null>(null)
  const [errorMsg, setErrorMsg]       = useState('')

  // GPS state — updated live as watchPosition fires
  const [gps, setGps]             = useState<GPSCoords | null>(null)
  const [gpsError, setGpsError]   = useState(false)
  const [gpsSeconds, setGpsSeconds] = useState(0)
  const watchIdRef                = useRef<number | null>(null)
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Step 1: validate QR / resume stored token ─────────────────────────── */
  useEffect(() => {
    if (!t || !s) { setStep('error'); setErrorMsg('Invalid QR code.'); return }

    const pending = typeof window !== 'undefined' ? sessionStorage.getItem(PENDING_TOKEN) : null
    const pSess   = typeof window !== 'undefined' ? sessionStorage.getItem(PENDING_SESSION) : null

    if (pending && pSess === s && isAuthenticated()) {
      sessionStorage.removeItem(PENDING_TOKEN)
      sessionStorage.removeItem(PENDING_SESSION)
      setCaptureToken(pending)
      setStep('gps-waiting')
      return
    }

    api.get<ApiSuccess<{ captureToken: string }>>(`/attend/capture?t=${encodeURIComponent(t)}&s=${encodeURIComponent(s)}`)
      .then((res) => {
        const token = (res as ApiSuccess<{ captureToken: string }>).data.captureToken
        setCaptureToken(token)
        setStep(isAuthenticated() ? 'gps-waiting' : 'login-prompt')
      })
      .catch((err) => {
        setStep('error')
        setErrorMsg(err?.message || 'QR code has expired. Ask your lecturer for the current code.')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Step 2: watch GPS — keeps updating until we submit or skip ─────────── */
  useEffect(() => {
    if (step !== 'gps-waiting') return

    // No geolocation support → skip straight to submit without GPS
    if (!navigator.geolocation) {
      setGpsError(true)
      return
    }

    // Live accuracy updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy:  pos.coords.accuracy,
        }
        setGps(coords)
        // Auto-submit once we have a good enough fix
        if (pos.coords.accuracy <= GPS_GOOD_ENOUGH) {
          stopWatch()
          submitAttendance(coords)
        }
      },
      () => setGpsError(true),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
    )

    // Elapsed time counter so we can show the hint
    timerRef.current = setInterval(() => setGpsSeconds((n) => n + 1), 1000)

    return () => stopWatch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function stopWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  /* ── Step 3: submit ─────────────────────────────────────────────────────── */
  async function submitAttendance(coords?: GPSCoords) {
    if (!captureToken) return
    stopWatch()
    setStep('submitting')

    let fingerprint
    try { fingerprint = await collectFingerprint() } catch { /* optional */ }

    try {
      const res = await api.post<ApiSuccess<AttendanceRecord>>('/attend/submit', {
        captureToken,
        ...(coords ? { gps: coords } : {}),
        ...(fingerprint ? { fingerprint } : {}),
      })
      setRecord((res as ApiSuccess<AttendanceRecord>).data)
      setStep('done')
    } catch (err: unknown) {
      setStep('error')
      setErrorMsg((err as { message?: string })?.message || 'Submission failed.')
    }
  }

  const handleLogin = () => {
    if (captureToken && s) {
      sessionStorage.setItem(PENDING_TOKEN, captureToken)
      sessionStorage.setItem(PENDING_SESSION, s)
    }
    router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">AttendIQ</p>
          <p className="text-sm text-muted-foreground">Caleb University</p>
        </div>

        {/* Validating QR */}
        {step === 'capture' && (
          <div className="text-center space-y-3">
            <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Validating QR code…</p>
          </div>
        )}

        {/* Login prompt */}
        {step === 'login-prompt' && (
          <div className="rounded-xl border border-border bg-card p-7 space-y-5 text-center">
            <div>
              <p className="font-semibold">Sign in to continue</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your scan has been recorded. Sign in to submit your attendance — you have 15 minutes.
              </p>
            </div>
            <Button className="w-full" onClick={handleLogin}>Sign in</Button>
          </div>
        )}

        {/* GPS waiting — live accuracy feed */}
        {step === 'gps-waiting' && (
          <div className="rounded-xl border border-border bg-card p-7 space-y-5">
            <div className="flex items-start gap-3">
              <Navigation className={`h-5 w-5 shrink-0 mt-0.5 ${gps && !gpsError ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-semibold">Getting your location</p>
                <p className="text-xs italic text-muted-foreground mt-0.5">
                  {gpsError
                    ? 'Location unavailable — you can still submit without it.'
                    : 'Hold still for a moment for the best accuracy.'}
                </p>
              </div>
            </div>

            {/* Live accuracy display */}
            {!gpsError && (
              <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">GPS accuracy</p>
                <p className="text-sm">
                  <AccuracyLabel accuracy={gps?.accuracy ?? null} />
                </p>
                {!gps && (
                  <div className="flex gap-1 pt-1">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full skeleton-shimmer" />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              {/* Submit with current GPS (enabled once we have any fix) */}
              {!gpsError && gps && (
                <Button
                  className="w-full"
                  onClick={() => { stopWatch(); submitAttendance(gps) }}
                >
                  <MapPin className="h-4 w-4 mr-1.5" />
                  Use this location ({Math.round(gps.accuracy)} m)
                </Button>
              )}

              {/* Skip / submit without GPS */}
              <Button
                variant={gpsError ? 'default' : 'outline'}
                className="w-full"
                onClick={() => { stopWatch(); submitAttendance() }}
              >
                {gpsError ? 'Submit without location' : 'Skip location'}
              </Button>
            </div>

            {/* Hint after a few seconds */}
            {gpsSeconds >= GPS_HINT_AFTER && !gpsError && !gps && (
              <p className="text-xs italic text-muted-foreground text-center">
                GPS is taking a while — try moving near a window or stepping outside briefly.
              </p>
            )}
          </div>
        )}

        {/* Submitting */}
        {step === 'submitting' && (
          <div className="rounded-xl border border-border bg-card p-7 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
              <p className="font-medium">Recording attendance</p>
            </div>
            <div className="space-y-2 ml-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Verifying location</div>
              <div className="flex items-center gap-2"><Fingerprint className="h-3.5 w-3.5" /> Collecting device fingerprint</div>
            </div>
          </div>
        )}

        {/* Done */}
        {step === 'done' && record && (
          <div className="rounded-xl border border-border bg-card p-7 space-y-5">
            <div className="flex items-start gap-4">
              {record.status === 'present' ? (
                <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500 shrink-0" />
              )}
              <div>
                <p className="font-semibold">
                  {record.status === 'present' ? 'Attendance recorded' : 'Marked — under review'}
                </p>
                {record.flagReason && (
                  <p className="text-xs text-muted-foreground mt-1">{record.flagReason}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              <AttendanceBadge status={record.status} />
              <LocationBadge status={record.locationStatus} />
              {record.fraudScore > 0 && (
                <span className="text-xs text-muted-foreground">Fraud score: {record.fraudScore}</span>
              )}
            </div>

            <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/dashboard/student')}>
              View my attendance
            </Button>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="rounded-xl border border-border bg-card p-7 space-y-4">
            <div className="flex items-start gap-4">
              <XCircle className="h-8 w-8 text-destructive shrink-0" />
              <div>
                <p className="font-semibold">Could not record attendance</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMsg}</p>
              </div>
            </div>
            {isAuthenticated() && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/dashboard/student')}>
                Back to dashboard
              </Button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default function AttendPageWrapper() {
  return (
    <Suspense fallback={<AttendPageSkeleton />}>
      <AttendPage />
    </Suspense>
  )
}
