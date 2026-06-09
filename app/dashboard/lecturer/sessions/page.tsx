'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Loader2, MapPin, ChevronRight, Download } from 'lucide-react'
import { useSessions, useStartSession } from '@/hooks/use-sessions'
import { useCourses } from '@/hooks/use-courses'
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
import { formatDateTime, toTitleCase } from '@/lib/utils'
import { api } from '@/lib/api-client'
import type { Session, ApiSuccess } from '@/lib/types'
import type { AttendanceRow } from '@/hooks/use-session-attendance'

function StatusDot({ status }: { status: string }) {
  const c = status === 'active' ? 'bg-green-500' : status === 'paused' ? 'bg-yellow-500' : 'bg-border'
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${c}`} />
}

function StartDialog() {
  const [open, setOpen]         = useState(false)
  const [courseId, setCourseId] = useState('')
  const [loading, setLoading]   = useState(false)
  const { data: meData }        = useMe()
  const lecturerId              = (meData?.data?.profile as { id?: string } | null)?.id
  const { data: coursesData }   = useCourses({ limit: 100, lecturerId })
  const courses                 = coursesData?.data?.data || []
  const { config }              = useAppConfig()
  const start                   = useStartSession()

  const handle = async () => {
    if (!courseId) { toast.error('Select a course'); return }
    setLoading(true)
    let gps: { lecturerLatitude: number; lecturerLongitude: number; lecturerLocationAccuracy: number } | undefined
    await new Promise<void>((resolve) => {
      if (!navigator.geolocation) { resolve(); return }
      navigator.geolocation.getCurrentPosition(
        (p) => { gps = { lecturerLatitude: p.coords.latitude, lecturerLongitude: p.coords.longitude, lecturerLocationAccuracy: p.coords.accuracy }; resolve() },
        () => resolve(), { timeout: 5000 }
      )
    })
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
                <SelectValue placeholder={courses.length ? 'Select a course' : 'No courses — create one first'} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex text-primary items-center gap-1.5 text-[.85rem] bg-accent/20 p-2 rounded-lg italic -text-muted-foreground">
            <MapPin size={30} className=" shrink-0" />
            <p className="">GPS will be captured. Students within{' '}
            <span className="font-bold not-italic">{config.gpsGeofenceMeters}m</span>{' '}
            will be marked present.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handle} disabled={loading || !courseId}>
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

  const { data: activeData, isLoading: activeLoading } = useSessions({ status: 'active', limit: 20 })
  const { data: allData,    isLoading: allLoading    } = useSessions({ limit: 100 })

  const active = (activeData?.data?.data || []).filter(s =>
    courseIdFilter ? s.courseId === courseIdFilter : true
  )
  const all = (allData?.data?.data || []).filter(s =>
    courseIdFilter ? s.courseId === courseIdFilter : true
  )
  const total = courseIdFilter ? all.length : allData?.data?.pagination.total

  // Find course name for the filter header
  const filteredCourse = courseIdFilter
    ? all.find(s => s.course)?.course as { code: string; title: string } | undefined
    : undefined

  const [reportLoading, setReportLoading] = useState(false)

  const downloadReport = async () => {
    if (!courseIdFilter || !all.length) return
    setReportLoading(true)
    try {
      // Fetch attendance for every session in parallel
      const results = await Promise.all(
        all.map(s =>
          api.get<ApiSuccess<{ records: AttendanceRow[] }>>(`/attend/session/${s.id}`)
            .then(r => ({ session: s, records: r.data.records }))
            .catch(() => ({ session: s, records: [] }))
        )
      )

      // Build student map: studentId → { name, matric, sessions: { [sessionId]: status } }
      const studentMap = new Map<string, { name: string; matric: string | null; sessions: Record<string, string> }>()
      for (const { session, records } of results) {
        for (const rec of records) {
          if (!studentMap.has(rec.studentId)) {
            studentMap.set(rec.studentId, { name: rec.studentName, matric: rec.matricNumber, sessions: {} })
          }
          studentMap.get(rec.studentId)!.sessions[session.id] = rec.status
        }
      }

      const sessions = all.slice().reverse() // chronological order
      const dateLabels = sessions.map(s => formatDateTime(s.startedAt))

      // CSV header
      const header = ['Student Name', 'Matric Number', ...dateLabels, 'Total Present', `Total Sessions (${sessions.length})`, 'Attendance %']

      // CSV rows
      const rows = Array.from(studentMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(student => {
          const statuses = sessions.map(s => {
            const st = student.sessions[s.id]
            if (!st) return 'Absent'
            if (st === 'present') return 'Present'
            if (st === 'flagged') return 'Flagged'
            if (st === 'rejected') return 'Rejected'
            return st
          })
          const present = statuses.filter(s => s === 'Present' || s === 'Flagged').length
          const pct = sessions.length ? `${Math.round((present / sessions.length) * 100)}%` : '0%'
          return [toTitleCase(student.name), student.matric ?? '', ...statuses, present, sessions.length, pct]
        })

      const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filteredCourse?.code ?? 'course'}-attendance-report.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredCourse
              ? <><span className="font-medium">{filteredCourse.code}</span>{' '}<span className="italic">· {total} session{total !== 1 ? 's' : ''}</span></>
              : total !== undefined
                ? <><span className="font-medium">{total}</span>{' '}<span className="italic">session{total !== 1 ? 's' : ''} total</span></>
                : <span className="italic">Your attendance sessions</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {courseIdFilter && (
            <>
              <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
                <Link href="/dashboard/lecturer/sessions">All courses</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadReport}
                disabled={reportLoading || allLoading || !all.length}
              >
                {reportLoading
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  : <Download className="h-4 w-4 mr-1.5" />}
                Download Report
              </Button>
            </>
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
          {activeLoading ? <SessionListSkeleton rows={3} /> : !active.length ? (
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
          {allLoading ? <SessionListSkeleton rows={6} /> : !all.length ? (
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
