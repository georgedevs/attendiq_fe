'use client'

import Link from 'next/link'
import { useMe } from '@/hooks/use-me'
import { useMyAttendance } from '@/hooks/use-attendance'
import { StatCard } from '@/components/stat-card'
import { StatCardsSkeleton, AttendanceListSkeleton, PageHeaderSkeleton } from '@/components/skeletons'
import { AttendanceBadge } from '@/components/attendance-badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </p>
  )
}

export default function StudentDashboard() {
  const { data: meData, isLoading: meLoading } = useMe()
  const me      = meData?.data
  const profile = me?.profile as { fullName?: string; level?: number } | null
  const name    = profile?.fullName || me?.user.email?.split('@')[0] || 'Student'

  const { data: attData, isLoading: attLoading } = useMyAttendance({ limit: 10 })
  const recent       = attData?.data?.data || []
  const total        = attData?.data?.pagination.total ?? 0
  const presentCount = recent.filter((r) => r.status === 'present').length
  const rate         = recent.length > 0 ? `${Math.round((presentCount / recent.length) * 100)}%` : '—'

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        {meLoading ? <PageHeaderSkeleton /> : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {profile?.level
                ? <><span className="font-medium">{profile.level} Level</span>{' '}<span className="italic">· Caleb University</span></>
                : <span className="italic">Student · Caleb University</span>
              }
            </p>
          </>
        )}
      </div>

      {/* Stats */}
      {attLoading ? <StatCardsSkeleton count={3} /> : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Sessions"   value={total}        sub="attended" />
          <StatCard label="Present"    value={presentCount} sub={`of last ${recent.length}`} />
          <StatCard label="Rate"       value={rate}         sub="attendance" />
        </div>
      )}

      {/* Recent attendance — full width, primary content */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Recent attendance</SectionLabel>
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 -mr-2 -mt-4">
            <Link href="/dashboard/student/attendance">See all</Link>
          </Button>
        </div>

        {attLoading ? <AttendanceListSkeleton rows={6} /> : !recent.length ? (
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
