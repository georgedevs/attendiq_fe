'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMe } from '@/hooks/use-me'
import { useMyAttendance, useMyStats } from '@/hooks/use-attendance'
import { StatCard } from '@/components/stat-card'
import { StatCardsSkeleton, AttendanceListSkeleton, PageHeaderSkeleton } from '@/components/skeletons'
import { AttendanceBadge } from '@/components/attendance-badge'
import { LocationPermissionBanner } from '@/components/location-permission-banner'
import { Button } from '@/components/ui/button'
import { formatDateTime, toTitleCase } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { QueryErrorState } from '@/components/query-error-state'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </p>
  )
}

export default function StudentDashboard() {
  const router = useRouter()
  const { data: meData, isError: meIsError, refetch: refetchMe } = useMe()
  const me      = meData?.data
  const profile = me?.profile as { fullName?: string; matricNumber?: string | null } | null
  const name    = toTitleCase(profile?.fullName || me?.user.email?.split('@')[0] || 'Student')

  // Gate: students must finish onboarding (matric number) before using the app.
  const needsOnboarding = !!me && me.role === 'student' && !!profile && !profile.matricNumber

  useEffect(() => {
    if (needsOnboarding) router.replace('/onboarding')
  }, [needsOnboarding, router])

  const { data: attData, isError: attIsError, refetch: refetchAtt } = useMyAttendance({ limit: 10 })
  const { data: statsData, isError: statsIsError, refetch: refetchStats } = useMyStats()
  // "No data yet" (not "is fetching") is the skeleton condition: it also
  // covers the paused states — token mid-refresh, persisted cache still
  // restoring — where isLoading is false but rendering would show fallbacks.
  const attPending   = (!attData && !attIsError) || (!statsData && !statsIsError)
  const recent       = attData?.data?.data || []
  // Authoritative stats from the backend — flagged counts as attended, rejected
  // is excluded — so a student's numbers match what the lecturer sees.
  const stats        = statsData?.data
  const attended     = stats?.attended ?? 0
  const recentAttended = stats?.recent.attended ?? 0
  const recentWindow = stats?.recent.window ?? 0
  const rate         = stats && stats.recent.window > 0 ? `${stats.recent.ratePercent}%` : 'N/A'

  const hasError = meIsError || attIsError || statsIsError
  const refetchAll = () => {
    refetchMe()
    refetchAtt()
    refetchStats()
  }

  // Don't flash the real dashboard while we still don't know who this is (or
  // do know and are about to redirect to onboarding). Skeletons mirror the
  // real layout so there's no jump when content arrives.
  if (hasError) {
    return (
      <div className="space-y-8 py-10">
        <QueryErrorState message="Failed to load dashboard data. Please check your network connection." onRetry={refetchAll} />
      </div>
    )
  }

  if (!me || needsOnboarding) {
    return (
      <div className="space-y-8">
        <PageHeaderSkeleton />
        <StatCardsSkeleton count={3} />
        <AttendanceListSkeleton rows={6} />
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Welcome back,</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{name}</h1>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="italic">Student · Caleb University</span>
        </p>
      </div>

      {/* Get the location permission sorted before class, not during */}
      <LocationPermissionBanner />

      {/* Stats */}
      {attPending ? (
        <StatCardsSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Classes attended" value={attended}       sub="all time" />
          <StatCard label="Present"          value={recentAttended} sub={recentWindow ? `of last ${recentWindow}` : 'no records yet'} />
          <StatCard label="Attendance rate"  value={rate}           sub={recentWindow ? `last ${recentWindow} classes` : 'no records yet'} />
        </div>
      )}

      {/* Recent attendance: full width, primary content */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Recent attendance</SectionLabel>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 -mr-2 -mt-4">
            <Link href="/dashboard/student/attendance">See all</Link>
          </Button>
        </div>

        {attPending ? (
          <AttendanceListSkeleton rows={6} />
        ) : !recent.length ? (
          <div className="rounded-xl border border-border bg-card px-6 py-14 text-center space-y-2">
            <p className="text-sm font-medium">No attendance yet</p>
            <p className="text-sm italic text-muted-foreground">
              Scan the QR code shown in class to record your attendance.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {recent.map((r) => {
              const session = (r as { session?: { course?: { code: string; title: string } } }).session
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {session?.course?.code ?? `Session ${r.sessionId.slice(0, 8)}`}
                    </p>
                    {session?.course?.title && (
                      <p className="text-xs italic text-muted-foreground truncate">{session.course.title}</p>
                    )}
                    <p className="text-xs italic text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <AttendanceBadge status={r.status} />
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
