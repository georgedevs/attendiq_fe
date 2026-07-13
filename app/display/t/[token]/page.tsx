'use client'

/**
 * /display/t/[token]: Token-based classroom display.
 *
 * This page is reached via the "Project" button on the lecturer's session page.
 * The URL contains an opaque UUID (never the human-readable display code).
 * The page itself shows ZERO identifying information: no code, no session ID,
 * no URL visible context. Just the QR code + course name.
 *
 * Why:
 *   - Students who screenshot the projection cannot share the code
 *   - Even if someone copies the URL, the token is a one-time UUID that expires
 *     with the session. It can't be brute-forced (UUID is 122 bits of entropy)
 */

import { use, useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Logo } from '@/components/logo'
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

async function fetchByToken(token: string): Promise<DisplayQRData> {
  const res = await fetch(`${API_BASE}/sessions/display-qr/by-token?token=${token}`, {
    cache: 'no-store',
    headers: { 'ngrok-skip-browser-warning': 'true' },
  })
  if (!res.ok) throw new Error('expired')
  const json = (await res.json()) as ApiSuccess<DisplayQRData>
  return json.data
}

function TokenDisplayPage({ token }: { token: string }) {
  // Use current origin so the QR always encodes the URL this device is on,
  // whether that's localhost, a forwarded port, ngrok, or production.
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const [qr, setQr]            = useState<DisplayQRData | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalMs, setTotalMs]   = useState(30000)
  const [ended, setEnded]       = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchByToken(token)
      if (data.status === 'ended') { setEnded(true); return }
      setQr(data)
      setTotalMs(data.stepSeconds * 1000)
      setTimeLeft(data.expiresInMs)
    } catch {
      setEnded(true)
    }
  }, [token])

  useEffect(() => { load() }, [load])

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

  if (ended) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Logo height={24} />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Session Ended</h2>
          <p className="text-sm italic text-muted-foreground">
            This attendance session has closed.
          </p>
        </div>
      </div>
    )
  }

  if (!qr) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8">
        <div className="h-72 w-72 rounded-2xl skeleton-shimmer" />
        <div className="space-y-2 w-72">
          <div className="h-3 w-full rounded skeleton-shimmer" />
          <div className="h-2 w-full rounded-full skeleton-shimmer" />
        </div>
      </div>
    )
  }

  if (qr.status === 'paused') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Logo height={24} />
        {(qr.courseCode || qr.courseTitle) && (
          <div>
            {qr.courseCode && <p className="text-3xl font-bold tracking-tight">{qr.courseCode}</p>}
            {qr.courseTitle && <p className="text-base italic text-muted-foreground">{qr.courseTitle}</p>}
          </div>
        )}
        <h2 className="text-xl font-semibold">Session Paused</h2>
        <p className="text-sm italic text-muted-foreground">
          The lecturer has paused this session. Please wait.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top bar: no code, no token, just branding + theme toggle */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Logo height={24} />
          {qr.courseCode && (
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
        {/* Theme toggle only: no code, no identifying info */}
        <ThemeToggle />
      </div>

      {/* Main: centred QR, maximally prominent */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">

        {/* Course name */}
        {(qr.courseCode || qr.courseTitle) && (
          <div className="text-center space-y-1">
            {qr.courseCode && (
              <p className="text-5xl font-bold tracking-tight">{qr.courseCode}</p>
            )}
            {qr.courseTitle && (
              <p className="text-lg italic text-muted-foreground">{qr.courseTitle}</p>
            )}
          </div>
        )}

        {/* QR: white background always so it's scannable in dark mode */}
        <div className="rounded-2xl border-4 border-border bg-white p-6">
          <QRCodeSVG
            value={qrUrl}
            size={300}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Instruction: no code mentioned */}
        <p className="text-base text-muted-foreground text-center max-w-sm leading-relaxed">
          Open your phone browser and scan to mark attendance.
          <span className="italic"> Do not screenshot. The code changes every {qr.stepSeconds} seconds.</span>
        </p>

        {/* Countdown */}
        <div className="w-full max-w-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Refreshes in{' '}
              <span className="font-semibold tabular-nums text-foreground">{secondsLeft}s</span>
            </span>
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

export default function DisplayTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  return <TokenDisplayPage token={token} />
}
