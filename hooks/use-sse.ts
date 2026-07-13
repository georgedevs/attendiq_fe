'use client'

import { useEffect, useRef, useState } from 'react'
import { getAccessToken } from '@/lib/auth'

export interface LiveAttendanceEvent {
  type: 'attendance.recorded'
  sessionId: string
  studentId: string
  studentName: string
  status: string
  timestamp: string
}

export function useLiveFeed(sessionId: string, enabled = true) {
  const [events, setEvents]       = useState<LiveAttendanceEvent[]>([])
  const [connected, setConnected] = useState(false)
  const esRef                     = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled || !sessionId) return

    const token = getAccessToken()
    const base  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
    const url   = `${base}/sessions/${sessionId}/live?access_token=${token ?? ''}`

    const es = new EventSource(url)
    esRef.current = es

    es.addEventListener('open', () => setConnected(true))

    es.addEventListener('message', (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as LiveAttendanceEvent
        setEvents((prev) => {
          // Avoid duplicates (historical seed + live push can overlap)
          const isDupe = prev.some(
            (p) => p.studentId === event.studentId && p.timestamp === event.timestamp
          )
          if (isDupe) return prev
          // Newest first
          return [event, ...prev]
        })
      } catch { /* ignore malformed frames */ }
    })

    es.addEventListener('error', () => {
      setConnected(false)
      // EventSource auto-reconnects, no manual retry needed
    })

    return () => {
      es.close()
      esRef.current = null
      setConnected(false)
    }
  }, [sessionId, enabled])

  return { events, connected }
}
