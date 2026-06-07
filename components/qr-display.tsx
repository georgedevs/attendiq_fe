'use client'

import { useEffect, useState, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useSessionQr } from '@/hooks/use-sessions'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

interface QrDisplayProps {
  sessionId: string
}

export function QrDisplay({ sessionId }: QrDisplayProps) {
  const { data, refetch, isLoading } = useSessionQr(sessionId)
  const qr = data?.data

  const [timeLeft, setTimeLeft] = useState(0)
  const [totalMs, setTotalMs]   = useState(15000)

  const scheduleRefresh = useCallback(
    (expiresInMs: number) => {
      // Fetch 500ms before the token expires so the new QR is ready instantly
      const delay = Math.max(0, expiresInMs - 500)
      return setTimeout(() => refetch(), delay)
    },
    [refetch],
  )

  useEffect(() => {
    if (!qr) return
    setTotalMs(qr.stepSeconds * 1000)
    setTimeLeft(qr.expiresInMs)
    const refreshTimer = scheduleRefresh(qr.expiresInMs)
    const tick = setInterval(() => setTimeLeft((t) => Math.max(0, t - 100)), 100)
    return () => { clearTimeout(refreshTimer); clearInterval(tick) }
  }, [qr, scheduleRefresh])

  // Use the current page's origin so the QR works regardless of how the
  // frontend is accessed — forwarded port, ngrok, local IP, or production domain.
  const qrUrl = qr
    ? `${window.location.origin}/attend?t=${qr.token}&s=${qr.sessionId}`
    : ''
  const progressPct  = totalMs > 0 ? (timeLeft / totalMs) * 100 : 0
  const secondsLeft  = Math.ceil(timeLeft / 1000)
  const stepSeconds  = qr?.stepSeconds ?? 15

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-[248px] w-[248px] rounded-xl" />
        <div className="w-full max-w-[248px] space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </div>
    )
  }

  if (!qr) {
    return (
      <div className="flex h-[248px] w-[248px] items-center justify-center text-sm italic text-muted-foreground">
        QR unavailable
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR code — white background so it's scannable in any theme */}
      <div className="rounded-xl border border-border bg-white p-4">
        <QRCodeSVG
          value={qrUrl}
          size={216}
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Timer + progress */}
      <div className="w-full max-w-[248px] space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Refreshes in <span className="font-medium tabular-nums">{secondsLeft}s</span>
          </span>
          <span className="italic">
            rotates every {stepSeconds}s
          </span>
        </div>
        <Progress value={progressPct} className="h-1" />
      </div>
    </div>
  )
}
