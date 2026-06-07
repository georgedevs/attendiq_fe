import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <GraduationCap className="h-5 w-5 text-primary-foreground" />
      </div>
      {!collapsed && (
        <span className="font-bold text-lg tracking-tight">AttendIQ</span>
      )}
    </div>
  )
}
