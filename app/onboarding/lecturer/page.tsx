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

function LecturerOnboardingForm() {
  const router = useRouter()
  const { data, isLoading } = useMe()
  const me = data?.data
  const invalidate = useInvalidate()

  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('')
  const [touched, setTouched] = useState(false)

  const profile = me?.profile as { fullName?: string; department?: string } | null
  const alreadyOnboarded = !!me && (me.role === 'student' || !!profile?.department)

  // Prefill full name from the Microsoft account; redirect out if already onboarded.
  useEffect(() => {
    if (!me) return
    if (me.role === 'student') {
      router.replace('/dashboard/student')
      return
    }
    if (profile?.department) {
      router.replace('/dashboard/lecturer')
      return
    }
    if (profile?.fullName) setFullName(profile.fullName)
  }, [me, profile, router])

  const mutation = useApiMutation<ApiSuccess<MeResponse>, { fullName: string; department: string }>(
    '/users/onboarding/lecturer',
    'post',
    {
      onSuccess: async () => {
        await invalidate(['me'])
        toast.success('Welcome to AttendIQ!')
        router.replace('/dashboard/lecturer')
      },
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? 'Could not save your details')
      },
    },
  )

  const nameValid = fullName.trim().length >= 2
  const departmentValid = department.trim().length >= 2
  const canSubmit = nameValid && departmentValid && !mutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!nameValid || !departmentValid) return
    mutation.mutate({ fullName: fullName.trim(), department: department.trim() })
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <Logo />
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm space-y-7">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Welcome, Lecturer</h1>
            <p className="text-sm text-muted-foreground">
              Confirm your details to finish setting up your lecturer account.
              This is a one-time step.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Dr. Jane Doe"
              />
              {touched && !nameValid && (
                <p className="text-xs text-destructive">Please enter your full name.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Computer Science"
              />
              {touched && !departmentValid && (
                <p className="text-xs text-destructive">Please enter your department.</p>
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
    </div>
  )
}

export default function LecturerOnboardingPage() {
  return (
    <ProtectedRoute requiredRole="lecturer">
      <LecturerOnboardingForm />
    </ProtectedRoute>
  )
}
