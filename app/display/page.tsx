'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api-client'
import type { ApiSuccess } from '@/lib/types'

function DisplayEntry() {
  const router    = useRouter()
  const params    = useSearchParams()
  const [code, setCode]     = useState(params.get('code') ?? '')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (clean.length !== 6) { setError('Enter the 6-character code shown on the session page.'); return }

    setLoading(true)
    setError('')
    try {
      // Validate the code exists before navigating
      await api.get<ApiSuccess<unknown>>(`/sessions/display-qr?code=${clean}`)
      router.push(`/display/${clean}`)
    } catch {
      setError('Code not found or session has ended. Check the code and try again.')
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-format as user types: strip non-alphanum, uppercase, max 6 chars
    const clean = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6)
    setCode(clean)
    setError('')
  }

  // Display as XXX-XXX for readability
  const display = code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <span className="text-sm font-semibold tracking-tight">AttendIQ Display</span>
        <ThemeToggle />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Classroom Display</h1>
            <p className="text-sm italic text-muted-foreground">
              Enter the session code shown on the lecturer&apos;s screen to display the
              QR code for student attendance.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Code</label>
              <Input
                value={display}
                onChange={handleChange}
                placeholder="XXX-XXX"
                className="text-center text-2xl font-mono font-bold tracking-widest h-14"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Checking…' : 'Show QR Code'}
            </Button>
          </form>

          <p className="text-xs italic text-center text-muted-foreground">
            The code is shown on the lecturer&apos;s session page as{' '}
            <span className="font-mono font-medium not-italic">XK2-B94</span> format.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DisplayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-sm space-y-4 px-6">
          <div className="h-8 w-48 rounded-md skeleton-shimmer" />
          <div className="h-14 w-full rounded-md skeleton-shimmer" />
          <div className="h-11 w-full rounded-md skeleton-shimmer" />
        </div>
      </div>
    }>
      <DisplayEntry />
    </Suspense>
  )
}
