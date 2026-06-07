import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  /** Italic secondary line below the value */
  sub?: string
  loading?: boolean
  className?: string
}

export function StatCard({ label, value, sub, loading, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 space-y-1.5', className)}>
      {/* Label — uppercase tracking, muted, small */}
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>

      {loading ? (
        <div className="space-y-2 pt-1">
          <Skeleton className="h-8 w-12" />
          {sub !== undefined && <Skeleton className="h-3 w-16" />}
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold tracking-tight leading-none">{value}</p>
          {sub && (
            <p className="text-xs italic text-muted-foreground">{sub}</p>
          )}
        </>
      )}
    </div>
  )
}
