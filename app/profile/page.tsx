'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save, LogOut } from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import { useApiMutation, useInvalidate } from '@/hooks/use-api'
import { ProtectedRoute } from '@/components/protected-route'
import { DashboardSidebar } from '@/components/dashboard-sidebar'
import { MobileHeader } from '@/components/mobile-header'
import { MobileNav } from '@/components/mobile-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { logout } from '@/lib/auth'
import type { ApiSuccess, MeResponse } from '@/lib/types'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

function ProfileForm() {
  const { data, isLoading } = useMe()
  const me = data?.data
  const invalidate = useInvalidate()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const [fullName, setFullName]     = useState('')
  const [level, setLevel]           = useState('')
  const [department, setDepartment] = useState('')
  const [dirty, setDirty]           = useState(false)

  useEffect(() => {
    if (!me?.profile) return
    const p = me.profile as { fullName?: string; level?: number; department?: string }
    setFullName(p.fullName || '')
    setLevel(String(p.level || ''))
    setDepartment(p.department || '')
  }, [me])

  const updateMutation = useApiMutation<ApiSuccess<MeResponse>, Record<string, unknown>>(
    '/users/me',
    'patch',
    {
      onSuccess: () => { toast.success('Profile updated'); setDirty(false); invalidate(['me']) },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message || 'Update failed'
        toast.error(Array.isArray(msg) ? msg.join(', ') : msg)
      },
    }
  )

  const handleSave = () => {
    const body: Record<string, unknown> = { fullName }
    if (me?.role === 'student' && level) body.level = Number(level)
    if (me?.role === 'lecturer') body.department = department
    updateMutation.mutate(body)
  }

  return (
    <div className="max-w-lg space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm italic text-muted-foreground mt-1">Your account and personal information</p>
      </div>

      {/* Account info — read-only */}
      <section className="space-y-4">
        <SectionLabel>Account</SectionLabel>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="px-4 py-3.5 space-y-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="px-4 py-3.5">
                <p className="text-xs italic text-muted-foreground mb-0.5">Email</p>
                <p className="text-sm font-medium">{me?.user.email}</p>
              </div>
              <div className="px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs italic text-muted-foreground mb-0.5">Role</p>
                  <p className="text-sm font-medium capitalize">{me?.role}</p>
                </div>
                <div>
                  <p className="text-xs italic text-muted-foreground mb-0.5 text-right">Status</p>
                  <p className="text-sm font-medium capitalize text-right">{me?.user.status}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sign out — visible on mobile where sidebar is hidden */}
      <section className="lg:hidden">
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </section>

      {/* Editable profile fields */}
      <section className="space-y-4">
        <SectionLabel>Profile details</SectionLabel>
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-10 w-full" /></div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setDirty(true) }}
                  placeholder="Your full name"
                />
              </div>

              {me?.role === 'student' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Level</Label>
                    <Input
                      type="number" min={100} max={700} step={100}
                      value={level}
                      onChange={(e) => { setLevel(e.target.value); setDirty(true) }}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center justify-between">
                      Matric Number
                      <span className="text-[10px] italic text-muted-foreground font-normal">
                        Assigned by registrar
                      </span>
                    </Label>
                    <Input
                      value={(me.profile as { matricNumber?: string | null })?.matricNumber || ''}
                      disabled
                      placeholder="Pending assignment"
                    />
                  </div>
                </>
              )}

              {me?.role === 'lecturer' && (
                <>
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Input
                      value={department}
                      onChange={(e) => { setDepartment(e.target.value); setDirty(true) }}
                      placeholder="Computer Science"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center justify-between">
                      Staff ID
                      <span className="text-[10px] italic text-muted-foreground font-normal">
                        Assigned by admin
                      </span>
                    </Label>
                    <Input
                      value={(me.profile as { staffId?: string | null })?.staffId || ''}
                      disabled
                      placeholder="Pending assignment"
                    />
                  </div>
                </>
              )}

              <Button onClick={handleSave} disabled={!dirty || updateMutation.isPending} className="w-full sm:w-auto">
                {updateMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  : <Save className="h-4 w-4 mr-1.5" />
                }
                Save changes
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <DashboardSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="px-4 py-5 pb-24 lg:px-6 lg:py-6 lg:pb-6">
              <ProfileForm />
            </div>
          </main>
        </div>
      </div>
      <MobileNav />
    </ProtectedRoute>
  )
}
