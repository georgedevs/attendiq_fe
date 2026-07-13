import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiQuery } from './use-api'
import { api } from '@/lib/api-client'
import type { ApiSuccess, Session, QrData, PaginatedData } from '@/lib/types'

export function useSessions(params?: {
  page?: number
  limit?: number
  courseId?: string
  status?: string
  enabled?: boolean
}) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.courseId) query.set('courseId', params.courseId)
  if (params?.status) query.set('status', params.status)
  const qs = query.toString()
  return useApiQuery<ApiSuccess<PaginatedData<Session & { course?: { code: string; title: string } }>>>(
    ['sessions', params],
    `/sessions${qs ? `?${qs}` : ''}`,
    undefined,
    { enabled: params?.enabled ?? true }
  )
}

export function useSession(id: string) {
  return useApiQuery<ApiSuccess<Session & { course?: { code: string; title: string } }>>(
    ['sessions', id],
    `/sessions/${id}`,
    undefined,
    { enabled: !!id }
  )
}

export function useSessionQr(id: string, enabled = true) {
  return useApiQuery<ApiSuccess<QrData>>(
    ['sessions', id, 'qr'],
    `/sessions/${id}/qr`,
    undefined,
    { enabled: !!id && enabled, refetchOnWindowFocus: true }
  )
}

export function useStartSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      courseId: string
      lecturerLatitude?: number
      lecturerLongitude?: number
      lecturerLocationAccuracy?: number
    }) => api.post<ApiSuccess<Session>>('/sessions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useSessionAction(id: string, action: 'pause' | 'resume' | 'end') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch(`/sessions/${id}/${action}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['sessions', id] })
    },
  })
}

export function useArchiveSession(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['sessions', id] })
    },
  })
}
