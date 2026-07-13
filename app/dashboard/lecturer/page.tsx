'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMe } from '@/hooks/use-me'
import { useCourses } from '@/hooks/use-courses'
import { useSessions } from '@/hooks/use-sessions'
import { StatCard } from '@/components/stat-card'
import { LocationPermissionBanner } from '@/components/location-permission-banner'
import { SessionListSkeleton, CourseListSkeleton, StatCardsSkeleton, PageHeaderSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { formatDateTime, toTitleCase } from '@/lib/utils'
import { QueryErrorState } from '@/components/query-error-state'
import { ChevronRight, Plus } from 'lucide-react'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </p>
  )
}

function StatusDot({ status }: { status: string }) {
  const c = status === 'active' ? 'bg-green-500' : status === 'paused' ? 'bg-yellow-500' : 'bg-border'
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${c}`} />
}

export default function LecturerDashboard() {
  const router = useRouter()
  const { data: meData, isError: meIsError, refetch: refetchMe } = useMe()
  const me = meData?.data
  const profile = me?.profile as { fullName?: string; id?: string; department?: string } | null
  const lecturerId = profile?.id
  const name = toTitleCase(profile?.fullName || me?.user.email?.split('@')[0] || 'Lecturer')

  // Gate: lecturers must finish onboarding (department) before using the app.
  const needsOnboarding = !!me && me.role === 'lecturer' && !!profile && !profile.department

  useEffect(() => {
    if (needsOnboarding) router.replace('/onboarding/lecturer')
  }, [needsOnboarding, router])

  const { data: coursesData, isError: coursesIsError, refetch: refetchCourses } = useCourses({ limit: 100 })
  const { data: activeData, isError: activeIsError, refetch: refetchActive } = useSessions({ status: 'active', limit: 10 })
  const { data: recentData, isError: recentIsError, refetch: refetchRecent } = useSessions({ limit: 10 })

  const hasError = meIsError || coursesIsError || activeIsError || recentIsError
  const refetchAll = () => {
    refetchMe()
    refetchCourses()
    refetchActive()
    refetchRecent()
  }

  // "No data yet" (not "is fetching") is the skeleton condition: it also
  // covers the paused states — token mid-refresh, persisted cache still
  // restoring — where isLoading is false but rendering would show fallbacks.
  const statsPending   = (!coursesData && !coursesIsError) || (!activeData && !activeIsError)
  const recentPending  = !recentData && !recentIsError
  const coursesPending = !coursesData && !coursesIsError

  const courses = coursesData?.data?.data || []
  const active  = activeData?.data?.data || []
  const recent  = recentData?.data?.data || []

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
        <SessionListSkeleton rows={5} />
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Welcome back,</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{name}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            {profile?.department ? (
              <>
                <span className="font-medium text-foreground">{profile.department}</span>
                <span className="text-muted-foreground/50">·</span>
                <span className="italic">Caleb University</span>
              </>
            ) : (
              <span className="italic">Lecturer · Caleb University</span>
            )}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 w-full sm:w-auto">
          <Link href="/dashboard/lecturer/sessions" className="flex items-center justify-center gap-1.5">
            <Plus className="h-4 w-4" /> New Session
          </Link>
        </Button>
      </div>

      {/* Sessions need the lecturer's GPS anchor — sort the permission now */}
      <LocationPermissionBanner />

      {/* KPI strip: always full width */}
      {statsPending ? (
        <StatCardsSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Courses"         value={coursesData?.data?.pagination.total ?? 'N/A'} sub="teaching" />
          <StatCard label="Active"          value={active.length} sub="right now" />
          <StatCard label="Total Sessions"  value={recentData?.data?.pagination.total ?? 'N/A'} sub="all time" />
        </div>
      )}

      {/* ── Live sessions banner (only when active) ─────────────── */}
      {active.length > 0 && (
        <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <p className="text-[11px] font-medium uppercase tracking-widest text-green-700 dark:text-green-400">
              Live now
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {active.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-green-200 dark:border-green-800 bg-white dark:bg-green-950/50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{s.course?.code ?? 'Session'}</p>
                  <p className="text-xs italic text-muted-foreground">
                    {s.attendanceCount ?? 0} students marked
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/dashboard/lecturer/sessions/${s.id}`}>Open</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main 2-column grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">

        {/* Left: Recent sessions (primary) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Recent sessions</SectionLabel>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 -mr-2 -mt-4">
              <Link href="/dashboard/lecturer/sessions">See all</Link>
            </Button>
          </div>
          {recentPending ? (
            <SessionListSkeleton rows={5} />
          ) : !recent.length ? (
            <div className="rounded-xl border border-border bg-card px-6 py-10 text-center space-y-3">
              <p className="text-sm font-medium">No sessions yet</p>
              <p className="text-sm italic text-muted-foreground">Start your first attendance session.</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/lecturer/sessions">Start a session</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {recent.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/lecturer/sessions/${s.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.course?.code ?? 'Session'}</p>
                    <p className="text-xs italic text-muted-foreground">{formatDateTime(s.startedAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {s.attendanceCount ?? 0} students
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <StatusDot status={s.status} />{s.status}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Right: My courses (summary panel) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>My courses</SectionLabel>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 -mr-2 -mt-4">
              <Link href="/dashboard/lecturer/courses">Manage</Link>
            </Button>
          </div>
          {coursesPending ? (
            <CourseListSkeleton rows={4} />
          ) : !courses.length ? (
            <div className="rounded-xl border border-border bg-card px-5 py-8 text-center space-y-3">
              <p className="text-sm italic text-muted-foreground">No courses yet.</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/lecturer/courses">Create a course</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {courses.slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  href="/dashboard/lecturer/courses"
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.code}</p>
                    <p className="text-xs italic text-muted-foreground truncate">{c.title}</p>
                  </div>
                  <p className="text-xs italic text-muted-foreground shrink-0 ml-4">
                    {c.creditUnits} units
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
