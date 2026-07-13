'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, ArrowRight } from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import { useApiMutation, useInvalidate } from '@/hooks/use-api'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import type { ApiSuccess, MeResponse } from '@/lib/types'

// Must stay in sync with MATRIC_REGEX in the backend users.dto.ts
const MATRIC_REGEX = /^\d{2}\/\d{4,6}$/

function OnboardingForm() {
  const router = useRouter()
  const { data, isLoading } = useMe()
  const me = data?.data
  const invalidate = useInvalidate()

  const [matricNumber, setMatricNumber] = useState('')
  const [fullName, setFullName] = useState('')
  const [touched, setTouched] = useState(false)

  const profile = me?.profile as { fullName?: string; matricNumber?: string | null } | null
  const alreadyOnboarded = !!me && (me.role === 'lecturer' || !!profile?.matricNumber)

  // Prefill full name from the Microsoft account; redirect out if already onboarded.
  useEffect(() => {
    if (!me) return
    if (me.role === 'lecturer') {
      router.replace('/dashboard/lecturer')
      return
    }
    if (profile?.matricNumber) {
      router.replace('/dashboard/student')
      return
    }
    if (profile?.fullName) setFullName(profile.fullName)
  }, [me, profile, router])

  const mutation = useApiMutation<ApiSuccess<MeResponse>, { matricNumber: string; fullName: string }>(
    '/users/onboarding',
    'post',
    {
      onSuccess: async () => {
        await invalidate(['me'])
        toast.success('You\'re all set!')
        router.replace('/dashboard/student')
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? 'Could not save your details')
      },
    },
  )

  const matricValid = MATRIC_REGEX.test(matricNumber.trim())
  const nameValid = fullName.trim().length >= 2
  const canSubmit = matricValid && nameValid && !mutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!matricValid || !nameValid) return
    mutation.mutate({ matricNumber: matricNumber.trim(), fullName: fullName.trim() })
  }

  // Don't flash the form while we still don't know (or do know and are
  // about to redirect) whether onboarding is even needed for this user.
  if (isLoading || alreadyOnboarded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-12 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-7">
        <div className="flex flex-col items-center gap-6 text-center">
          <Logo height={28} />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Finish setting up</h1>
            <p className="text-sm text-muted-foreground">
              Confirm your details before you can mark attendance. This is a one-time step.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="matric">Matric number</Label>
            <Input
              id="matric"
              value={matricNumber}
              onChange={(e) => setMatricNumber(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="22/10001"
              autoComplete="off"
              inputMode="text"
            />
            {touched && matricNumber && !matricValid && (
              <p className="text-xs text-destructive">
                Format must be like <span className="font-mono">22/10001</span> (year/serial).
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Your full name"
            />
            {touched && !nameValid && (
              <p className="text-xs text-destructive">Please enter your full name.</p>
            )}
          </div>

          <Button type="submit" disabled={!canSubmit} className="w-full">
            {mutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <>Confirm &amp; continue <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <ProtectedRoute requiredRole="student">
      <OnboardingForm />
    </ProtectedRoute>
  )
}
