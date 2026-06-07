const KEYS = {
  ACCESS: 'attendiq_access',
  REFRESH: 'attendiq_refresh',
  ROLE: 'attendiq_role',
} as const

function store<T extends string>(key: T, value: string) {
  if (typeof window !== 'undefined') localStorage.setItem(key, value)
}
function load<T extends string>(key: T): string | null {
  if (typeof window !== 'undefined') return localStorage.getItem(key)
  return null
}
function clear<T extends string>(key: T) {
  if (typeof window !== 'undefined') localStorage.removeItem(key)
}

export function saveAuthTokens(accessToken: string, refreshToken: string, role?: string) {
  store(KEYS.ACCESS, accessToken)
  store(KEYS.REFRESH, refreshToken)
  if (role) store(KEYS.ROLE, role)
  else {
    // Parse role from JWT payload without verification
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      if (payload.role) store(KEYS.ROLE, payload.role)
    } catch {}
  }
}

export function getAccessToken(): string | null {
  return load(KEYS.ACCESS)
}

export function getRefreshToken(): string | null {
  return load(KEYS.REFRESH)
}

export function getStoredRole(): string | null {
  return load(KEYS.ROLE)
}

export function removeAuthTokens() {
  clear(KEYS.ACCESS)
  clear(KEYS.REFRESH)
  clear(KEYS.ROLE)
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

export async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const axios = (await import('axios')).default
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
    const res = await axios.post(`${base}/auth/refresh`, { refreshToken })
    const { accessToken, refreshToken: newRefresh } = res.data.data
    if (!accessToken || !newRefresh) return false
    saveAuthTokens(accessToken, newRefresh)
    return true
  } catch {
    removeAuthTokens()
    return false
  }
}

export async function logout(): Promise<void> {
  try {
    const axios = (await import('axios')).default
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
    const accessToken = getAccessToken()
    const refreshToken = getRefreshToken()
    if (accessToken) {
      await axios.post(
        `${base}/auth/logout`,
        { refreshToken },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
    }
  } catch {}
  removeAuthTokens()
}
