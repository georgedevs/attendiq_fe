import { useMutation } from '@tanstack/react-query'
import { useApiQuery } from './use-api'
import { api } from '@/lib/api-client'
import type { ApiSuccess, AttendanceRecord, PaginatedData, AttendanceStatus, LocationStatus } from '@/lib/types'
import type { DeviceFingerprint } from '@/lib/fingerprint'

export function useSubmitAttendance() {
  return useMutation({
    mutationFn: (data: {
      captureToken: string
      gps?: { latitude: number; longitude: number; accuracy: number }
      fingerprint?: DeviceFingerprint
    }) => api.post<ApiSuccess<AttendanceRecord>>('/attend/submit', data),
  })
}

export function useMyAttendance(params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  const qs = query.toString()
  return useApiQuery<ApiSuccess<PaginatedData<AttendanceRecord & {
    session?: {
      id: string
      startedAt: string
      course?: { id: string; code: string; title: string }
    }
  }>>>(
    ['my-attendance', params],
    `/attend/my${qs ? `?${qs}` : ''}`,
  )
}

export function useMyStats() {
  return useApiQuery<ApiSuccess<{
    attended: number
    rejected: number
    total: number
    recent: { window: number; attended: number; ratePercent: number }
  }>>(
    ['my-stats'],
    '/attend/my/stats',
  )
}

export function useMyAttendanceByCourse() {
  return useApiQuery<ApiSuccess<Array<{
    courseId: string
    code: string
    title: string
    present: number
    flagged: number
    rejected: number
    total: number
    records: Array<{
      id: string
      sessionId: string
      status: AttendanceStatus
      locationStatus: LocationStatus
      flagReason: string | null
      createdAt: string
    }>
  }>>>(
    ['my-attendance-by-course'],
    '/attend/my/by-course',
  )
}
