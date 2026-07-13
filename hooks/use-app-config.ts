/**
 * Fetches live runtime config from the backend.
 * Values are driven by env vars: changing GPS_GEOFENCE_METERS in .env
 * and restarting the backend is all that's needed.
 *
 * Cached for 5 minutes (staleTime). Refetches on window focus.
 */
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { ApiSuccess } from '@/lib/types'

interface AppConfig {
  gpsGeofenceMeters: number
  gpsHighUncertaintyMeters: number
  totpStepSeconds: number
}

const DEFAULTS: AppConfig = {
  gpsGeofenceMeters: 200,
  gpsHighUncertaintyMeters: 300,
  totpStepSeconds: 30,
}

export function useAppConfig() {
  const { data, isLoading } = useQuery({
    queryKey: ['app-config'],
    queryFn: () => api.get<ApiSuccess<AppConfig>>('/app/config'),
    staleTime: 5 * 60 * 1000,   // 5 minutes, config rarely changes at runtime
    gcTime:    10 * 60 * 1000,
  })

  return {
    config: data?.data ?? DEFAULTS,
    isLoading,
  }
}
