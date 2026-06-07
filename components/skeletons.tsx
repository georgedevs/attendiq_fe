/**
 * Content-aware skeletons.
 *
 * Each skeleton mirrors the exact layout of the real component it replaces
 * — same heights, same column widths, same spacing. This prevents layout
 * shift and makes the shimmer feel like real content loading, not a placeholder.
 *
 * All use the shared shimmer animation from globals.css so they wave in sync.
 */

import { Skeleton } from '@/components/ui/skeleton'

/* ── Stat cards (responsive full-width KPI strip) ───────────── */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  const cols = count <= 2 ? 'grid-cols-2' : count === 3 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
          {/* Label line */}
          <Skeleton className="h-3 w-16" />
          {/* Big number */}
          <Skeleton className="h-8 w-12" />
        </div>
      ))}
    </div>
  )
}

/* ── List rows (divide-y list inside a card) ─────────────────── */
export function ListRowsSkeleton({ rows = 4, twoLine = true }: { rows?: number; twoLine?: boolean }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5 gap-4">
          {/* Left: title + optional subtitle */}
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-3.5 w-24" />
            {twoLine && <Skeleton className="h-3 w-40" />}
          </div>
          {/* Right: badge/action area */}
          <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/* ── Course row (with unit count on the right) ───────────────── */
export function CourseListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5 gap-4">
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/* ── Session row (code + date/count + status dot) ────────────── */
export function SessionListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5 gap-4">
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Attendance row (code + date on left, two badge slots right) */
export function AttendanceListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Page header (title + subtitle) ─────────────────────────── */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
    </div>
  )
}

/* ── Full dashboard skeleton (2-column layout) ───────────────── */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeaderSkeleton />
      {/* KPI strip */}
      <StatCardsSkeleton count={4} />
      {/* 2-column main content */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-4">
          <Skeleton className="h-3 w-24" />
          <SessionListSkeleton rows={5} />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-20" />
          <CourseListSkeleton rows={4} />
        </div>
      </div>
    </div>
  )
}

/* ── Login page skeleton ─────────────────────────────────────── */
export function LoginPageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-5">
        <div className="w-full max-w-sm space-y-8">
          {/* Heading */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-64" />
          </div>
          {/* Microsoft button */}
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            {/* Divider */}
            <div className="relative py-2">
              <Skeleton className="h-px w-full" />
            </div>
            {/* Email input */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Attend page skeleton (mobile card) ──────────────────────── */
export function AttendPageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm space-y-10">
        {/* Brand */}
        <div className="text-center space-y-1">
          <Skeleton className="h-3 w-16 mx-auto" />
          <Skeleton className="h-3 w-28 mx-auto" />
        </div>
        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-7 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded-full shrink-0" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="space-y-2 ml-8">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3.5 w-44" />
          </div>
        </div>
      </div>
    </div>
  )
}
