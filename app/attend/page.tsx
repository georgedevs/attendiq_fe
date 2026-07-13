'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2, MapPin, Fingerprint, AlertTriangle, Navigation } from 'lucide-react'
import { AttendPageSkeleton } from '@/components/skeletons'
import { api } from '@/lib/api-client'
import { decodeLinkCode } from '@/lib/url-compress'
import { isAuthenticated, saveAuthTokens, setPostLoginRedirect, isDevBypassEnabled } from '@/lib/auth'
import { collectFingerprint } from '@/lib/fingerprint'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/logo'
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
  if (accuracy <= 20)   return <span className="text-green-600 dark:text-green-400 font-medium">{Math.round(accuracy)} m, excellent</span>
  if (accuracy <= 50)   return <span className="text-green-600 dark:text-green-400">{Math.round(accuracy)} m, good</span>
  if (accuracy <= 150)  return <span className="text-yellow-600 dark:text-yellow-400">{Math.round(accuracy)} m, fair</span>
  return <span className="text-muted-foreground">{Math.round(accuracy)} m, weak signal</span>
}

function AttendPage() {
  const params  = useSearchParams()
  const router  = useRouter()
  const queryClient = useQueryClient()
  const c = params.get('c')
  
  let s = params.get('s')
  let t = params.get('t')
  let displayToken = params.get('displayToken') || params.get('token')

  if (c) {
    const decoded = decodeLinkCode(c)
    if (decoded) {
      s = decoded.sessionId
      if (decoded.type === 'direct') {
        displayToken = decoded.token || null
      } else if (decoded.type === 'qr') {
        t = decoded.totp || null
      }
    }
  }

  const [step, setStep]               = useState<Step>('capture')
  const [captureToken, setCaptureToken] = useState<string | null>(null)
  const [record, setRecord]           = useState<AttendanceRecord | null>(null)
  const [errorMsg, setErrorMsg]       = useState('')

  // GPS state, updated live as watchPosition fires
  const [gps, setGps]             = useState<GPSCoords | null>(null)
  const [gpsError, setGpsError]   = useState(false)
  const [gpsSeconds, setGpsSeconds] = useState(0)
  const watchIdRef                = useRef<number | null>(null)
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null)

  // Dev bypass: email-only login, never shown in production
  const [devEmail, setDevEmail]     = useState('')
  const [devLoading, setDevLoading] = useState(false)

  /* ── Step 1: validate QR / resume stored token ─────────────────────────── */
  useEffect(() => {
    if (!s || (!t && !displayToken)) {
      setStep('error')
      setErrorMsg('Invalid attendance link or QR code.')
      return
    }

    const pending = typeof window !== 'undefined' ? sessionStorage.getItem(PENDING_TOKEN) : null
    const pSess   = typeof window !== 'undefined' ? sessionStorage.getItem(PENDING_SESSION) : null

    if (pending && pSess === s && isAuthenticated()) {
      sessionStorage.removeItem(PENDING_TOKEN)
      sessionStorage.removeItem(PENDING_SESSION)
      setCaptureToken(pending)
      setStep('gps-waiting')
      return
    }

    const queryParams = new URLSearchParams()
    queryParams.append('s', s)
    if (t) queryParams.append('t', t)
    if (displayToken) queryParams.append('displayToken', displayToken)

    api.get<ApiSuccess<{ captureToken: string }>>(`/attend/capture?${queryParams.toString()}`)
      .then((res) => {
        const token = (res as ApiSuccess<{ captureToken: string }>).data.captureToken
        setCaptureToken(token)
        setStep(isAuthenticated() ? 'gps-waiting' : 'login-prompt')
      })
      .catch((err) => {
        setStep('error')
        setErrorMsg(err?.message || 'Attendance link or QR code has expired. Ask your lecturer for a new one.')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Step 2: watch GPS, keeps updating until we submit or skip */
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

  const rememberPendingCapture = () => {
    if (captureToken && s) {
      sessionStorage.setItem(PENDING_TOKEN, captureToken)
      sessionStorage.setItem(PENDING_SESSION, s)
    }
  }

  const handleMicrosoftLogin = () => {
    rememberPendingCapture()
    setPostLoginRedirect(window.location.pathname + window.location.search)
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
    window.location.href = `${base}/auth/microsoft`
  }

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!devEmail.trim()) return
    setDevLoading(true)
    try {
      const res = await api.post<ApiSuccess<{ accessToken: string; refreshToken: string }>>(
        '/v2/auth/login',
        { email: devEmail },
      )
      const { accessToken, refreshToken } = (res as ApiSuccess<{ accessToken: string; refreshToken: string }>).data
      saveAuthTokens(accessToken, refreshToken)
      // Fresh session may be a different account; drop the previous cache.
      queryClient.clear()
      setStep('gps-waiting')
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Login failed')
    } finally {
      setDevLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-10 gap-1.5">
          <Logo height={28} />
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
          <div className="rounded-xl border border-border bg-card p-7 space-y-5">
            <div className="text-center">
              <p className="font-semibold">Sign in to continue</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your scan has been recorded. Sign in to submit your attendance, you have 15 minutes.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full h-11 gap-2.5 font-medium"
              onClick={handleMicrosoftLogin}
            >
              <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden>
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Continue with Microsoft
            </Button>

            {isDevBypassEnabled() && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-3 text-xs text-muted-foreground">or dev bypass</span>
                  </div>
                </div>

                <form onSubmit={handleDevLogin} className="space-y-3 text-left">
                  <div className="space-y-1.5">
                    <Label htmlFor="dev-email" className="text-sm">Email address</Label>
                    <Input
                      id="dev-email"
                      type="email"
                      placeholder="your@calebuniversity.edu.ng"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={devLoading}>
                    {devLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
                  </Button>
                </form>
              </>
            )}
          </div>
        )}

        {/* GPS waiting: live accuracy feed */}
        {step === 'gps-waiting' && (
          <div className="rounded-xl border border-border bg-card p-7 space-y-5">
            {gpsError ? (
              /* ── Location blocked / unavailable ── */
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Navigation className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                  <div>
                    <p className="font-semibold">Location access required</p>
                    <p className="text-xs italic text-muted-foreground mt-0.5">
                      AttendIQ needs your location to verify you are in the classroom.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 px-4 py-3 space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">How to enable location:</p>
                  <p><span className="font-medium">Android:</span> tap the lock icon in your browser address bar → Permissions → Location → Allow</p>
                  <p><span className="font-medium">iPhone:</span> Settings → Safari (or Chrome) → Location → Allow</p>
                </div>

                <Button className="w-full" onClick={() => window.location.reload()}>
                  I've enabled location, try again
                </Button>
              </div>
            ) : (
              /* ── GPS locking in ── */
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Navigation className={`h-5 w-5 shrink-0 mt-0.5 ${gps ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="font-semibold">Getting your location</p>
                    <p className="text-xs italic text-muted-foreground mt-0.5">
                      Hold still for a moment for the best accuracy.
                    </p>
                  </div>
                </div>

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

                {gps && (
                  <Button
                    className="w-full"
                    onClick={() => { stopWatch(); submitAttendance(gps) }}
                  >
                    <MapPin className="h-4 w-4 mr-1.5" />
                    Use this location ({Math.round(gps.accuracy)} m)
                  </Button>
                )}

                {gpsSeconds >= GPS_HINT_AFTER && !gps && (
                  <p className="text-xs italic text-muted-foreground text-center">
                    GPS is taking a while. Try moving near a window or stepping outside briefly.
                  </p>
                )}
              </div>
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
                  {record.status === 'present' ? 'Attendance recorded' : 'Marked, under review'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {record.status === 'present' ? 'You have been marked present for this session.' : 'Your lecturer will review your attendance.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
              <AttendanceBadge status={record.status} />
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
