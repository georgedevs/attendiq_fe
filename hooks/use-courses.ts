import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApiQuery } from './use-api'
import { api } from '@/lib/api-client'
import type { ApiSuccess, Course, PaginatedData } from '@/lib/types'

export function useCourses(params?: { page?: number; limit?: number; department?: string; lecturerId?: string }) {
  const query = new URLSearchParams()
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.department) query.set('department', params.department)
  if (params?.lecturerId) query.set('lecturerId', params.lecturerId)
  const qs = query.toString()
  return useApiQuery<ApiSuccess<PaginatedData<Course>>>(
    ['courses', params],
    `/courses${qs ? `?${qs}` : ''}`
  )
}

export function useCourse(id: string) {
  return useApiQuery<ApiSuccess<Course>>(
    ['courses', id],
    `/courses/${id}`,
    undefined,
    { enabled: !!id }
  )
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { code: string; title: string; department: string; creditUnits: number }) =>
      api.post<ApiSuccess<Course>>('/courses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}

export function useUpdateCourse(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<{ title: string; department: string; creditUnits: number }>) =>
      api.patch<ApiSuccess<Course>>(`/courses/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] })
      qc.invalidateQueries({ queryKey: ['courses', id] })
    },
  })
}

export function useDeleteCourse(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/courses/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })
}
