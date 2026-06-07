import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { AxiosRequestConfig } from 'axios'

export function useApiQuery<TData = unknown, TError = unknown>(
  queryKey: unknown[],
  url: string,
  config?: AxiosRequestConfig,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn: () => api.get<TData>(url, config),
    ...options,
  })
}

export function useApiMutation<TData = unknown, TVariables = unknown, TError = unknown>(
  url: string,
  method: 'post' | 'patch' | 'delete' = 'post',
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>
) {
  return useMutation<TData, TError, TVariables>({
    mutationFn: (variables) => {
      if (method === 'delete') return api.delete<TData>(url)
      if (method === 'patch') return api.patch<TData>(url, variables)
      return api.post<TData>(url, variables)
    },
    ...options,
  })
}

export function useInvalidate() {
  const qc = useQueryClient()
  return (...keys: unknown[][]) =>
    Promise.all(keys.map((k) => qc.invalidateQueries({ queryKey: k })))
}
