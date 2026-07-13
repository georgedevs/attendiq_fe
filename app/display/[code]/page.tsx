'use client'

import { use, useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Progress } from '@/components/ui/progress'
import type { ApiSuccess } from '@/lib/types'
import { encodeQrLink } from '@/lib/url-compress'

interface DisplayQRData {
  token: string
  sessionId: string
  stepSeconds: number
  expiresInMs: number
  courseCode: string | null
  courseTitle: string | null
  status: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

async function fetchDisplayQR(code: string): Promise<DisplayQRData> {
  const res = await fetch(`${API_BASE}/sessions/display-qr?code=${code}`, {
    cache: 'no-store',
    headers: { 'ngrok-skip-browser-warning': 'true' },
  })
  if (!res.ok) throw new Error('Session ended or code is invalid.')
  const json = (await res.json()) as ApiSuccess<DisplayQRData>
  return json.data
}

function DisplayQRPage({ code }: { code: string }) {
  const router   = useRouter()
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const [qr, setQr]             = useState<DisplayQRData | null>(null)
  const [timeLeft, setTimeLeft]  = useState(0)
  const [totalMs, setTotalMs]    = useState(30000)
  const [ended, setEnded]        = useState(false)
  const [error, setError]        = useState('')

  const load = useCallback(async () => {
    try {
      const data = await fetchDisplayQR(code)
      if (data.status === 'ended') { setEnded(true); return }
      setQr(data)
      setTotalMs(data.stepSeconds * 1000)
      setTimeLeft(data.expiresInMs)
    } catch {
      setEnded(true)
      setError('Session has ended or the code is no longer active.')
    }
  }, [code])

  // Initial load
  useEffect(() => { load() }, [load])

  // Schedule the next fetch 500 ms before token expiry
  useEffect(() => {
    if (!qr || ended) return

    const delay = Math.max(0, qr.expiresInMs - 500)
    const timer = setTimeout(() => load(), delay)
    const tick  = setInterval(() => setTimeLeft((t) => Math.max(0, t - 100)), 100)

    return () => { clearTimeout(timer); clearInterval(tick) }
  }, [qr, ended, load])

  const progress    = totalMs > 0 ? (timeLeft / totalMs) * 100 : 0
  const secondsLeft = Math.ceil(timeLeft / 1000)
  const qrUrl       = qr ? `${appUrl}/attend?c=${encodeQrLink(qr.sessionId, qr.token)}` : ''

  // ── Ended ───────────────────────────────────────────────────────────────────
  if (ended) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8 text-center">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          AttendIQ
        </p>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Session Ended</h2>
          <p className="text-sm italic text-muted-foreground">
            {error || 'This session has ended. The QR code is no longer active.'}
          </p>
        </div>
        <button
          onClick={() => router.push('/display')}
          className="text-sm text-primary underline underline-offset-4"
        >
          Enter a new code
        </button>
      </div>
    )
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (!qr) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8">
        <div className="h-3 w-20 rounded skeleton-shimmer" />
        <div className="h-72 w-72 rounded-2xl skeleton-shimmer" />
        <div className="space-y-2 w-72">
          <div className="h-3 w-full rounded skeleton-shimmer" />
          <div className="h-2 w-full rounded-full skeleton-shimmer" />
        </div>
      </div>
    )
  }

  // ── Paused ───────────────────────────────────────────────────────────────────
  if (qr.status === 'paused') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8 text-center">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          AttendIQ · {qr.courseCode ?? 'Session'}
        </p>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Session Paused</h2>
          <p className="text-sm italic text-muted-foreground">
            The lecturer has paused this session. Please wait.
          </p>
        </div>
      </div>
    )
  }

  // ── Active full-screen QR ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            AttendIQ
          </span>
          {(qr.courseCode || qr.courseTitle) && (
            <>
              <span className="text-border">·</span>
              <span className="text-sm font-semibold">{qr.courseCode}</span>
              {qr.courseTitle && (
                <span className="text-sm italic text-muted-foreground hidden sm:block">
                  {qr.courseTitle}
                </span>
              )}
            </>
          )}
        </div>
        <ThemeToggle />
      </div>

      {/* Main content: centred QR */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">

        {/* Course context */}
        <div className="text-center space-y-1">
          {qr.courseCode && (
            <p className="text-4xl font-bold tracking-tight">{qr.courseCode}</p>
          )}
          {qr.courseTitle && (
            <p className="text-lg italic text-muted-foreground">{qr.courseTitle}</p>
          )}
        </div>

        {/* QR code */}
        <div className="rounded-2xl border-4 border-border bg-white p-6 shadow-sm">
          <QRCodeSVG
            value={qrUrl}
            size={280}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Instruction */}
        <p className="text-base text-muted-foreground text-center max-w-sm">
          Open your phone browser and scan to mark attendance.
          <span className="italic"> Do not screenshot. The code changes every {qr.stepSeconds} seconds.</span>
        </p>

        {/* Countdown */}
        <div className="w-full max-w-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Refreshes in <span className="font-semibold tabular-nums text-foreground">{secondsLeft}s</span></span>
            <span className="italic">rotates every {qr.stepSeconds}s</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Active indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="italic">Session active</span>
        </div>
      </div>
    </div>
  )
}

export default function DisplayCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-72 w-72 rounded-2xl skeleton-shimmer" />
      </div>
    }>
      <DisplayQRPage code={code.toUpperCase()} />
    </Suspense>
  )
}
