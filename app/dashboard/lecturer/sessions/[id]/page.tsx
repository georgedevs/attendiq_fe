'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Pause, Play, Square, ArrowLeft, Users, Wifi, WifiOff,
  Monitor, Plus, Pencil, Loader2, Download,
} from 'lucide-react'
import { useSession, useSessionAction, useSessionQr } from '@/hooks/use-sessions'
import { useLiveFeed } from '@/hooks/use-sse'
import {
  useSessionAttendance,
  useSearchStudents,
  useManualAttendance,
  useUpdateAttendanceStatus,
} from '@/hooks/use-session-attendance'
import { Input } from '@/components/ui/input'
import { QrDisplay } from '@/components/qr-display'
import { AttendanceBadge } from '@/components/attendance-badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils'

/* ── Tiny helpers ───────────────────────────────────────────────────────────── */

function StatusDot({ status }: { status: string }) {
  const c = status === 'active' ? 'bg-green-500' : status === 'paused' ? 'bg-yellow-500' : 'bg-border'
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${c}`} />
}

/* ── Session controls (pause / resume / end) ────────────────────────────────── */

function Controls({ sessionId, status }: { sessionId: string; status: string }) {
  const [confirmEnd, setConfirmEnd] = useState(false)
  const pause  = useSessionAction(sessionId, 'pause')
  const resume = useSessionAction(sessionId, 'resume')
  const end    = useSessionAction(sessionId, 'end')

  const act = (m: typeof pause, label: string) => async () => {
    try { await m.mutateAsync(); toast.success(`Session ${label}`) }
    catch { toast.error(`Failed to ${label} session`) }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {status === 'active' && (
          <Button variant="outline" size="sm" onClick={act(pause, 'paused')}>
            <Pause className="h-3.5 w-3.5 mr-1.5" /> Pause
          </Button>
        )}
        {status === 'paused' && (
          <Button variant="outline" size="sm" onClick={act(resume, 'resumed')}>
            <Play className="h-3.5 w-3.5 mr-1.5" /> Resume
          </Button>
        )}
        {status !== 'ended' && (
          <Button
            variant="outline" size="sm"
            className="border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/5"
            onClick={() => setConfirmEnd(true)}
          >
            <Square className="h-3.5 w-3.5 mr-1.5" /> End
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmEnd}
        onOpenChange={setConfirmEnd}
        title="End this session?"
        description="Students will no longer be able to scan in. You can still edit the attendance list after ending."
        actionLabel="End session"
        destructive
        onConfirm={act(end, 'ended')}
      />
    </>
  )
}

/* ── Edit status dialog (per record) ───────────────────────────────────────── */

interface AttendanceRow {
  id: string
  studentId: string
  studentName: string
  matricNumber: string | null
  status: string
  locationStatus: string
  fraudScore: number
  flagReason: string | null
  isManual: boolean
  createdAt: string
}

function EditStatusDialog({
  record,
  open,
  onClose,
  sessionId,
}: { record: AttendanceRow; open: boolean; onClose: () => void; sessionId: string }) {
  const [status, setStatus] = useState(record.status)
  const update = useUpdateAttendanceStatus(sessionId)

  const handle = async () => {
    try {
      await update.mutateAsync({ recordId: record.id, status })
      toast.success('Status updated')
      onClose()
    } catch { toast.error('Failed to update status') }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Attendance</DialogTitle>
          <p className="text-sm italic text-muted-foreground">
            {record.studentName}{record.matricNumber ? ` · ${record.matricNumber}` : ''}
          </p>
        </DialogHeader>
        <div className="py-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handle} disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Manual add dialog — search any student, no enrollment required ─────────── */

function AddManualDialog({
  sessionId,
  open,
  onClose,
}: { sessionId: string; open: boolean; onClose: () => void }) {
  const [q, setQ]               = useState('')
  const [selected, setSelected] = useState<{ studentId: string; studentName: string } | null>(null)
  const { data, isLoading }     = useSearchStudents(sessionId, q)
  const results                 = data?.data ?? []
  const add                     = useManualAttendance(sessionId)

  const handle = async () => {
    if (!selected) return
    try {
      await add.mutateAsync({ studentId: selected.studentId })
      toast.success(`${selected.studentName} marked as present`)
      setQ(''); setSelected(null); onClose()
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || 'Failed to add student')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setQ(''); setSelected(null) }; onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Student Manually</DialogTitle>
          <p className="text-sm italic text-muted-foreground">
            For students who were present but couldn&apos;t scan. Search by name or matric number.
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            placeholder="Search by name or matric number…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelected(null) }}
            autoFocus
          />

          {/* Results list */}
          {q.trim() && (
            <div className="max-h-52 overflow-y-auto divide-y divide-border rounded-lg border border-border">
              {isLoading ? (
                <p className="text-sm italic text-muted-foreground text-center py-4">Searching…</p>
              ) : !results.length ? (
                <p className="text-sm italic text-muted-foreground text-center py-4">
                  No students found matching &ldquo;{q}&rdquo;
                </p>
              ) : (
                results.map((s) => (
                  <button
                    key={s.studentId}
                    type="button"
                    onClick={() => setSelected(s)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors ${
                      selected?.studentId === s.studentId ? 'bg-muted' : ''
                    }`}
                  >
                    <p className="text-sm font-medium">{s.studentName}</p>
                    {s.matricNumber && (
                      <p className="text-xs italic text-muted-foreground">{s.matricNumber}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {selected && (
            <p className="text-xs text-muted-foreground px-1">
              Selected: <span className="font-medium text-foreground">{selected.studentName}</span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handle} disabled={!selected || add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Present'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── CSV download helper ────────────────────────────────────────────────────── */

function downloadCSV(records: AttendanceRow[], courseCode: string) {
  const headers = ['Name', 'Matric Number', 'Status', 'Location', 'Fraud Score', 'Added Manually', 'Time']
  const rows = records.map((r) => [
    r.studentName,
    r.matricNumber ?? '',
    r.status,
    r.locationStatus,
    String(r.fraudScore),
    r.isManual ? 'Yes' : 'No',
    new Date(r.createdAt).toLocaleString(),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  const date  = new Date().toISOString().slice(0, 10)
  a.href      = url
  a.download  = `${courseCode}-attendance-${date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Full attendance list panel ─────────────────────────────────────────────── */

function AttendanceListPanel({
  sessionId,
  sessionEnded,
  courseCode,
}: {
  sessionId: string
  sessionEnded: boolean
  courseCode: string
}) {
  const { data, isLoading } = useSessionAttendance(sessionId)
  const [editRecord, setEditRecord] = useState<AttendanceRow | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const records = data?.data?.records ?? []

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Attendance List
            </p>
            {!isLoading && (
              <p className="text-xs italic text-muted-foreground mt-0.5">
                {records.length} student{records.length !== 1 ? 's' : ''} marked
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <Button
                size="sm" variant="outline"
                onClick={() => downloadCSV(records, courseCode)}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add student
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !records.length ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
            <Users className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm italic text-muted-foreground">No attendance records yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border -mx-1 px-1 max-h-[600px] overflow-y-auto">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{r.studentName}</p>
                    {r.isManual && (
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-border rounded px-1">
                        manual
                      </span>
                    )}
                  </div>
                  <p className="text-xs italic text-muted-foreground">
                    {r.matricNumber ? `${r.matricNumber} · ` : ''}{formatDateTime(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <AttendanceBadge status={r.status as 'present' | 'flagged' | 'rejected'} />
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditRecord(r)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editRecord && (
        <EditStatusDialog
          record={editRecord}
          open={!!editRecord}
          onClose={() => setEditRecord(null)}
          sessionId={sessionId}
        />
      )}

      <AddManualDialog
        sessionId={sessionId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </>
  )
}

/* ── Main page ──────────────────────────────────────────────────────────────── */

export default function SessionLivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params)
  const { data, isLoading } = useSession(id)
  const session  = data?.data
  const isActive  = session?.status === 'active'
  const isEnded   = session?.status === 'ended'
  const { events, connected } = useLiveFeed(id, isActive)
  const { data: qrData } = useSessionQr(id)
  const stepSeconds    = qrData?.data?.stepSeconds ?? 30
  const displayCode    = (session as { displayCode?: string | null; displayToken?: string | null } | undefined)?.displayCode ?? null
  const displayToken   = (session as { displayToken?: string | null } | undefined)?.displayToken ?? null
  const displayCodeFmt = displayCode ? `${displayCode.slice(0, 3)}-${displayCode.slice(3)}` : null
  const course = session?.course as { code: string; title: string } | undefined

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 mt-0.5">
          <Link href="/dashboard/lecturer/sessions"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-7 w-32" /><Skeleton className="h-4 w-56" /></div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">{course?.code ?? 'Session'}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {course?.title && <span className="italic">{course.title}</span>}
                {session && (
                  <>
                    {course?.title && ' · '}
                    <StatusDot status={session.status} />
                    {' '}{session.status}
                    {' · '}<span className="font-medium">{session.attendanceCount ?? 0}</span>
                    {' '}<span className="italic">marked · {formatDateTime(session.startedAt)}</span>
                  </>
                )}
              </p>
            </>
          )}
        </div>
        {session && session.status !== 'ended' && (
          <Controls sessionId={id} status={session.status} />
        )}
      </div>

      {/* ── Display code strip ──────────────────────────────────── */}
      {displayCodeFmt && session?.status !== 'ended' && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-4">
            <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs italic text-muted-foreground mb-0.5">Classroom display code</p>
              <p className="text-2xl font-bold font-mono tracking-widest">{displayCodeFmt}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-xs italic text-muted-foreground hidden sm:block text-right leading-relaxed">
              Go to <span className="font-mono font-semibold not-italic">
                {(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001').replace(/^https?:\/\//, '')}/display
              </span><br />
              and enter this code on any screen or tablet.
            </p>
            <Button
              variant="outline" size="sm"
              onClick={() => window.open(
                displayToken ? `/display/t/${displayToken}` : `/display/${displayCode}`,
                '_blank', 'noopener'
              )}
            >
              <Monitor className="h-3.5 w-3.5 mr-1.5" /> Project
            </Button>
          </div>
        </div>
      )}

      {/* ── QR + Live feed — hidden once session ends ───────────── */}
      {!isEnded && <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5">

        {/* QR panel */}
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-5">
            QR Code
          </p>
          <div className="flex flex-col items-center">
            {!isActive ? (
              <div className="flex items-center justify-center h-64 w-full">
                <p className="text-sm italic text-muted-foreground text-center px-4">
                  {session?.status === 'paused'
                    ? 'Session paused — resume to show the QR code.'
                    : 'Session has ended.'}
                </p>
              </div>
            ) : (
              <>
                <QrDisplay sessionId={id} />
                <p className="text-xs italic text-muted-foreground text-center mt-5 leading-relaxed max-w-xs">
                  Students scan this with their phone browser.
                  The code rotates every {stepSeconds}s — screenshots won&apos;t work.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Live feed / all records — tabbed */}
        <div className="rounded-xl border border-border bg-card p-6">
          <Tabs defaultValue="live">
            <div className="flex items-center justify-between mb-5">
              <TabsList>
                <TabsTrigger value="live" className="gap-2">
                  Live
                  {connected && isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">All Records</TabsTrigger>
              </TabsList>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {connected
                  ? <><Wifi className="h-3.5 w-3.5 text-green-500" /> Connected</>
                  : <><WifiOff className="h-3.5 w-3.5" /> {isActive ? 'Connecting…' : 'Offline'}</>
                }
              </span>
            </div>

            {/* Live tab — SSE stream */}
            <TabsContent value="live">
              {!events.length ? (
                <div className="flex flex-col items-center justify-center h-56 gap-3 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/20" />
                  <p className="text-sm italic text-muted-foreground">
                    {isActive ? 'Waiting for students to scan in.' : 'No events for this session.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border overflow-y-auto max-h-80 -mx-1 px-1">
                  {events.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{ev.studentName}</p>
                        <p className="text-xs italic text-muted-foreground">{formatDateTime(ev.timestamp)}</p>
                      </div>
                      <AttendanceBadge status={ev.status as 'present' | 'flagged' | 'rejected'} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* All records tab — full editable list */}
            <TabsContent value="all">
              <AllRecordsTab sessionId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>}

      {/* ── Full attendance management ───────────────────────────── */}
      {/* For ended sessions this is the primary content — shown full width */}
      {isEnded ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Attendance Record</h2>
            <p className="text-sm italic text-muted-foreground mt-0.5">
              Session ended · you can still edit records and download the full list.
            </p>
          </div>
          <AttendanceListPanel
            sessionId={id}
            sessionEnded={true}
            courseCode={course?.code ?? 'attendance'}
          />
        </div>
      ) : (
        <AttendanceListPanel
          sessionId={id}
          sessionEnded={false}
          courseCode={course?.code ?? 'attendance'}
        />
      )}
    </div>
  )
}

/* Inline all-records tab content (reuses the same hooks/components) */
function AllRecordsTab({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useSessionAttendance(sessionId)
  const [editRecord, setEditRecord] = useState<AttendanceRow | null>(null)
  const records = data?.data?.records ?? []

  return (
    <>
      {isLoading ? (
        <div className="space-y-3 py-2">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : !records.length ? (
        <div className="flex flex-col items-center justify-center h-56 gap-3 text-center">
          <Users className="h-8 w-8 text-muted-foreground/20" />
          <p className="text-sm italic text-muted-foreground">No records yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-y-auto max-h-80 -mx-1 px-1">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{r.studentName}</p>
                <p className="text-xs italic text-muted-foreground">{formatDateTime(r.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <AttendanceBadge status={r.status as 'present' | 'flagged' | 'rejected'} />
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditRecord(r)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editRecord && (
        <EditStatusDialog
          record={editRecord}
          open={!!editRecord}
          onClose={() => setEditRecord(null)}
          sessionId={sessionId}
        />
      )}
    </>
  )
}
