import { useApiQuery } from './use-api'
import type { ApiSuccess, MeResponse } from '@/lib/types'
import { isAuthenticated } from '@/lib/auth'

export function useMe() {
  return useApiQuery<ApiSuccess<MeResponse>>(
    ['me'],
    '/users/me',
    undefined,
    { enabled: isAuthenticated(), staleTime: 5 * 60 * 1000 }
  )
}
