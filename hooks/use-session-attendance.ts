import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { ApiSuccess } from '@/lib/types'

export interface AttendanceRow {
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

export interface SearchableStudent {
  studentId: string
  studentName: string
  matricNumber: string | null
}

interface SessionAttendanceData {
  records: AttendanceRow[]
  missing: never[]
  total: number
}

export function useSessionAttendance(sessionId: string) {
  return useQuery({
    queryKey: ['session-attendance', sessionId],
    queryFn: () =>
      api.get<ApiSuccess<SessionAttendanceData>>(`/attend/session/${sessionId}`),
    enabled: !!sessionId,
    refetchInterval: 10000,
  })
}

export function useSearchStudents(sessionId: string, q: string) {
  return useQuery({
    queryKey: ['search-students', sessionId, q],
    queryFn: () =>
      api.get<ApiSuccess<SearchableStudent[]>>(
        `/attend/session/${sessionId}/search-students?q=${encodeURIComponent(q)}`
      ),
    enabled: !!sessionId,
  })
}

export function useManualAttendance(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { studentId: string }) =>
      api.post(`/attend/session/${sessionId}/manual`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-attendance', sessionId] })
      qc.invalidateQueries({ queryKey: ['session', sessionId] })
      qc.invalidateQueries({ queryKey: ['search-students', sessionId] })
    },
  })
}

export function useUpdateAttendanceStatus(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ recordId, status }: { recordId: string; status: string }) =>
      api.patch(`/attend/${recordId}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-attendance', sessionId] })
    },
  })
}
