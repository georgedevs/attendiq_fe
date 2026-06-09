'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMyAttendance } from '@/hooks/use-attendance'
import { Button } from '@/components/ui/button'
import { AttendanceListSkeleton } from '@/components/skeletons'
import { AttendanceBadge } from '@/components/attendance-badge'
import { formatDateTime } from '@/lib/utils'

export default function StudentAttendancePage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useMyAttendance({ page, limit: 20 })
  const records    = data?.data?.data || []
  const pagination = data?.data?.pagination

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pagination
            ? <><span className="font-medium">{pagination.total}</span>{' '}<span className="italic">record{pagination.total !== 1 ? 's' : ''} total</span></>
            : <span className="italic">Your complete attendance history</span>
          }
        </p>
      </div>

      {isLoading ? (
        <AttendanceListSkeleton rows={8} />
      ) : isError || !records.length ? (
        <div className="rounded-xl border border-border bg-card px-6 py-16 text-center space-y-2">
          <p className="text-sm font-medium">No records yet</p>
          <p className="text-sm italic text-muted-foreground">
            Scan a QR code in class to start recording attendance.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {records.map((r) => {
              const s = (r as { session?: { course?: { code: string; title: string } } }).session
              return (
                <div key={r.id} className="flex items-start justify-between px-5 py-4 gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {s?.course?.code ?? `Session ${r.sessionId.slice(0, 8)}`}
                    </p>
                    {s?.course?.title && (
                      <p className="text-xs italic text-muted-foreground truncate">{s.course.title}</p>
                    )}
                    <p className="text-xs italic text-muted-foreground mt-0.5">
                      {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <AttendanceBadge status={r.status} />
                  </div>
                </div>
              )
            })}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
              </Button>
              <p className="text-xs italic text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </p>
              <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
