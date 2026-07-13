import type { QueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { ApiSuccess, MeResponse } from './types'

/**
 * Decides where a freshly signed-in user should land by asking the server
 * who they are BEFORE navigating anywhere. This is what prevents the
 * login → dashboard-flash → onboarding bounce: the wrong page never mounts.
 *
 * Also seeds the ['me'] query cache with the response so the destination
 * page renders immediately instead of refetching what we just loaded.
 */
export async function resolvePostLoginDestination(queryClient?: QueryClient): Promise<string> {
  try {
    const res = await api.get<ApiSuccess<MeResponse>>('/users/me')
    queryClient?.setQueryData(['me'], res)

    const me = res.data
    const profile = me.profile as { matricNumber?: string | null; department?: string | null } | null

    if (me.role === 'lecturer') {
      return profile?.department ? '/dashboard/lecturer' : '/onboarding/lecturer'
    }
    return profile?.matricNumber ? '/dashboard/student' : '/onboarding'
  } catch {
    // If /me fails we can't know; fall back to the student dashboard whose
    // own gate will sort it out (the flash is only avoided on the happy path).
    return '/dashboard/student'
  }
}
