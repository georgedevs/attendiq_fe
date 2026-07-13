'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useMyAttendance, useMyAttendanceByCourse } from '@/hooks/use-attendance'
import { Button } from '@/components/ui/button'
import { AttendanceListSkeleton } from '@/components/skeletons'
import { AttendanceBadge, LocationBadge } from '@/components/attendance-badge'
import { formatDateTime, cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { QueryErrorState } from '@/components/query-error-state'

export default function StudentAttendancePage() {
  const [historyPage, setHistoryPage] = useState(1)
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({})
  
  // Tab 1: Chronological (paginated)
  const { data: historyData, isError: historyIsError, refetch: refetchHistory } = useMyAttendance({ page: historyPage, limit: 20 })
  const pending = !historyData && !historyIsError
  const records = historyData?.data?.data || []
  const historyPagination = historyData?.data?.pagination

  // Tab 2: Grouped / Aggregated by Course (from Backend, unpaginated)
  const { data: courseData, isError: courseIsError, refetch: refetchCourse } = useMyAttendanceByCourse()
  const coursePending = !courseData && !courseIsError
  const coursesList = courseData?.data || []

  const toggleCourse = (code: string) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [code]: !prev[code],
    }))
  }

  const hasError = historyIsError || courseIsError
  const refetchAll = () => {
    refetchHistory()
    refetchCourse()
  }

  if (hasError) {
    return (
      <div className="space-y-8 py-10">
        <QueryErrorState message="Failed to load attendance details. Please check your network connection." onRetry={refetchAll} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {historyPagination ? (
            <>
              <span className="font-medium">{historyPagination.total}</span>{' '}
              <span className="italic">record{historyPagination.total !== 1 ? 's' : ''} total</span>
            </>
          ) : (
            <span className="italic">Your complete attendance history</span>
          )}
        </p>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="history">Chronological</TabsTrigger>
          <TabsTrigger value="courses">By Course</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-4 focus-visible:outline-none">
          {pending ? (
            <AttendanceListSkeleton rows={8} />
          ) : !records.length ? (
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
                  const s = (r as any).session
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

              {historyPagination && historyPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" size="sm" disabled={historyPage === 1} onClick={() => setHistoryPage(historyPage - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                  </Button>
                  <p className="text-xs italic text-muted-foreground">
                    Page {historyPage} of {historyPagination.totalPages}
                  </p>
                  <Button variant="outline" size="sm" disabled={historyPage === historyPagination.totalPages} onClick={() => setHistoryPage(historyPage + 1)}>
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="courses" className="space-y-4 focus-visible:outline-none">
          {coursePending ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                  </div>
                  <div className="h-2 bg-muted rounded w-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : !coursesList.length ? (
            <div className="rounded-xl border border-border bg-card px-6 py-16 text-center space-y-2">
              <p className="text-sm font-medium">No records yet</p>
              <p className="text-sm italic text-muted-foreground">
                Scan a QR code in class to start recording attendance.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {coursesList.map((course) => {
                const isExpanded = !!expandedCourses[course.code]
                const attendanceRate = course.total > 0 
                  ? Math.round(((course.present + course.flagged) / course.total) * 100) 
                  : 0
                
                return (
                  <div key={course.code} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-all duration-200 hover:border-primary/30 flex flex-col h-fit">
                    {/* Card Header clickable to toggle */}
                    <div 
                      onClick={() => toggleCourse(course.code)}
                      className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold tracking-tight text-foreground">{course.code}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {course.total} Session{course.total !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground truncate">{course.title}</p>
                        
                        {/* Quick stats mini progress bar */}
                        <div className="pt-2 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                attendanceRate >= 80 ? "bg-emerald-500" : attendanceRate >= 50 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${attendanceRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold shrink-0">
                            {attendanceRate}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                        
                        <div className="flex items-center gap-1.5 mt-auto pt-2 text-[10px] text-muted-foreground font-medium">
                          <span className="text-emerald-500 font-semibold">{course.present} P</span>
                          <span>•</span>
                          <span className="text-amber-500 font-semibold">{course.flagged} F</span>
                          <span>•</span>
                          <span className="text-rose-500 font-semibold">{course.rejected} R</span>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Details */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 divide-y divide-border/60">
                        {course.records
                          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((rec: any) => (
                            <div key={rec.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground">
                                  {formatDateTime(rec.createdAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <AttendanceBadge status={rec.status} />
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
