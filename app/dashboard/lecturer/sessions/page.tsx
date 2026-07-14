'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Loader2, MapPin, ChevronRight, ChevronLeft } from 'lucide-react'
import { useSessions, useStartSession } from '@/hooks/use-sessions'
import { useCourses, useCourse } from '@/hooks/use-courses'
import { useMe } from '@/hooks/use-me'
import { useAppConfig } from '@/hooks/use-app-config'
import { Button } from '@/components/ui/button'
import { SessionListSkeleton } from '@/components/skeletons'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils'
import type { Session } from '@/lib/types'
import { QueryErrorState } from '@/components/query-error-state'

function StatusDot({ status }: { status: string }) {
  const c = status === 'active' ? 'bg-green-500' : status === 'paused' ? 'bg-yellow-500' : 'bg-border'
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${c}`} />
}

function StartDialog() {
  const [open, setOpen]         = useState(false)
  const [courseId, setCourseId] = useState('')
  const [loading, setLoading]   = useState(false)
  const { data: coursesData }   = useCourses({ limit: 100 })
  const courses                 = coursesData?.data?.data || []
  const { config }              = useAppConfig()
  const start                   = useStartSession()

  const [geoState, setGeoState] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking')

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setGeoState('denied')
      return
    }
    if (navigator.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        setGeoState(perm.state)
        perm.onchange = () => {
          setGeoState(perm.state)
        }
      } catch {
        setGeoState('prompt')
      }
    } else {
      setGeoState('prompt')
    }
  }

  useEffect(() => {
    if (open) {
      checkLocationPermission()
      // Request location immediately to trigger native browser prompt if needed
      navigator.geolocation.getCurrentPosition(
        () => {
          setGeoState('granted')
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGeoState('denied')
          }
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      )
    }
  }, [open])

  const handle = async () => {
    if (!courseId) { toast.error('Select a course'); return }
    if (!navigator.geolocation) { toast.error('Your browser does not support location, use a phone browser'); return }

    if (geoState === 'denied') {
      toast.error('Location blocked. Enable it in your browser settings then try again.')
      return
    }

    setLoading(true)
    let gps: { lecturerLatitude: number; lecturerLongitude: number; lecturerLocationAccuracy: number } | undefined

    try {
      gps = await new Promise<typeof gps>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lecturerLatitude: p.coords.latitude, lecturerLongitude: p.coords.longitude, lecturerLocationAccuracy: p.coords.accuracy }),
          (err) => {
            if (err.code === err.PERMISSION_DENIED) reject(new Error('Location permission denied. Allow location and try again.'))
            else reject(new Error('Could not get your location. Try again.'))
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        )
      })
    } catch (err: unknown) {
      toast.error((err as Error).message)
      setLoading(false)
      return
    }

    try {
      const res = await start.mutateAsync({ courseId, ...gps })
      toast.success('Session started'); setOpen(false)
      window.location.href = `/dashboard/lecturer/sessions/${res.data.id}`
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Failed to start session')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className=" h-4 w-4 mr-1.5" /> Start Session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Start Attendance Session</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder={courses.length ? 'Select a course' : 'No courses, create one first'} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                   <SelectItem key={c.id} value={c.id}>{c.code}: {c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {geoState === 'denied' && (
            <div className="flex flex-col gap-2 text-destructive text-[0.85rem] bg-destructive/10 p-3 rounded-lg border border-destructive/20 font-medium">
              <div className="flex items-start gap-2.5">
                <MapPin size={18} className="shrink-0 mt-0.5" />
                <p>
                  Location access is blocked. You must enable location permission in your browser settings to start the session.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-fit border-destructive/30 hover:bg-destructive/20 text-destructive mt-1 h-8"
                onClick={async () => {
                  setGeoState('checking')
                  await checkLocationPermission()
                  navigator.geolocation.getCurrentPosition(
                    () => setGeoState('granted'),
                    (err) => {
                      if (err.code === err.PERMISSION_DENIED) {
                        setGeoState('denied')
                      }
                    },
                    { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
                  )
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          {geoState === 'granted' && (
            <div className="flex text-emerald-600 dark:text-emerald-400 items-center gap-2.5 text-[0.85rem] bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 font-medium">
              <MapPin size={18} className="shrink-0" />
              <p>Location access is active.</p>
            </div>
          )}

          {geoState === 'prompt' && (
            <div className="flex text-yellow-600 dark:text-yellow-400 items-center gap-2.5 text-[0.85rem] bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 font-medium">
              <MapPin size={18} className="shrink-0 text-yellow-600 dark:text-yellow-400" />
              <p>Please allow the browser location prompt to proceed.</p>
            </div>
          )}

          <div className="flex text-primary items-center gap-1.5 text-[.85rem] bg-accent/20 p-2 rounded-lg italic -text-muted-foreground">
            <MapPin size={30} className=" shrink-0" />
            <p className="">GPS will be captured. Students within{' '}
            <span className="font-bold not-italic">{config.gpsGeofenceMeters}m</span>{' '}
            will be marked present.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handle} disabled={loading || !courseId || geoState === 'denied'}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SessionRow({ session }: { session: Session & { course?: { code: string; title: string } } }) {
  return (
    <Link
      href={`/dashboard/lecturer/sessions/${session.id}`}
      className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{session.course?.code ?? 'Session'}</p>
        <p className="text-xs italic text-muted-foreground">
          {formatDateTime(session.startedAt)} · {session.attendanceCount ?? 0} students
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <StatusDot status={session.status} />{session.status}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
    </Link>
  )
}

function SessionsPageInner() {
  const searchParams = useSearchParams()
  const courseIdFilter = searchParams.get('courseId')

  const { data: activeData, isError: activeIsError, refetch: refetchActive } = useSessions({ status: 'active', limit: 20 })
  const { data: allData, isError: allIsError, refetch: refetchAllSessions } = useSessions({ limit: 100 })

  // Skeleton whenever there's no data to show yet ("pending"), not just while
  // a fetch is in flight — covers paused/restoring states without fallbacks.
  const activePending = !activeData && !activeIsError
  const allPending    = !allData && !allIsError

  const active = (activeData?.data?.data || []).filter(s =>
    courseIdFilter ? s.courseId === courseIdFilter : true
  )
  const all = (allData?.data?.data || []).filter(s =>
    courseIdFilter ? s.courseId === courseIdFilter : true
  )
  const total = courseIdFilter ? all.length : allData?.data?.pagination.total

  // Fetch the course directly rather than deriving it from session data,
  // otherwise a course with zero sessions shows no course context at all,
  // making the filtered view look like an empty generic "Sessions" page.
  const { data: courseData, isError: courseIsError, refetch: refetchCourse } = useCourse(courseIdFilter ?? '')
  const filteredCourse = courseData?.data

  const hasError = activeIsError || allIsError || (courseIdFilter && courseIsError)
  const refetchAll = () => {
    refetchActive()
    refetchAllSessions()
    if (courseIdFilter) refetchCourse()
  }

  if (hasError) {
    return (
      <div className="space-y-8 py-10">
        <QueryErrorState
          message="Failed to load sessions. Please check your network connection."
          onRetry={refetchAll}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Breadcrumb: makes it unmistakable this is a course-scoped view */}
      {courseIdFilter && (
        <Link
          href="/dashboard/lecturer/courses"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Courses{filteredCourse ? <> / <span className="font-medium text-foreground">{filteredCourse.code}</span></> : null}
        </Link>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {filteredCourse ? filteredCourse.code : 'Sessions'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredCourse
              ? <><span className="italic">{filteredCourse.title}</span>{' '}<span className="italic">· {total} session{total !== 1 ? 's' : ''}</span></>
              : total !== undefined
                ? <><span className="font-medium">{total}</span>{' '}<span className="italic">session{total !== 1 ? 's' : ''} total</span></>
                : <span className="italic">Your attendance sessions</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {courseIdFilter && (
            <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
              <Link href="/dashboard/lecturer/sessions">All courses</Link>
            </Button>
          )}
          <StartDialog />
        </div>
      </div>

      <Tabs defaultValue={active.length > 0 ? 'active' : 'all'}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            Active {active.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
          </TabsTrigger>
          <TabsTrigger value="all">All Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-5">
          {activePending ? <SessionListSkeleton rows={3} /> : !active.length ? (
            <div className="rounded-xl border border-border bg-card px-6 py-12 text-center space-y-3">
              <p className="text-sm font-medium">No active sessions</p>
              <p className="text-sm italic text-muted-foreground">Start a session to begin taking attendance.</p>
              <StartDialog />
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {active.map((s) => <SessionRow key={s.id} session={s} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-5">
          {allPending ? <SessionListSkeleton rows={6} /> : !all.length ? (
            <div className="rounded-xl border border-border bg-card px-6 py-12 text-center space-y-3">
              <p className="text-sm italic text-muted-foreground">
                {courseIdFilter ? 'No sessions for this course yet.' : 'No sessions yet.'}
              </p>
              <StartDialog />
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {all.map((s) => <SessionRow key={s.id} session={s} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function LecturerSessionsPage() {
  return (
    <Suspense fallback={<SessionListSkeleton rows={5} />}>
      <SessionsPageInner />
    </Suspense>
  )
}
