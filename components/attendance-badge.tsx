import { Badge } from '@/components/ui/badge'
import type { AttendanceStatus, LocationStatus } from '@/lib/types'

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  if (status === 'present') return <Badge variant="success">Present</Badge>
  if (status === 'flagged') return <Badge variant="warning">Flagged</Badge>
  return <Badge variant="destructive">Rejected</Badge>
}

export function LocationBadge({ status }: { status: LocationStatus }) {
  if (status === 'green') return <Badge variant="success">In Range</Badge>
  if (status === 'red') return <Badge variant="destructive">Out of Range</Badge>
  return <Badge variant="secondary">No GPS</Badge>
}

export function FraudScoreBadge({ score }: { score: number }) {
  const variant = score >= 40 ? 'destructive' : score > 0 ? 'warning' : 'success'
  return <Badge variant={variant}>Score {score}</Badge>
}
