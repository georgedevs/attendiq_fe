const KEYS = {
  ACCESS: 'attendiq_access',
  REFRESH: 'attendiq_refresh',
  ROLE: 'attendiq_role',
} as const

const POST_LOGIN_REDIRECT_KEY = 'attendiq_post_login_redirect'

// Carries the "come back here" path across the Microsoft OAuth round trip
// (the callback always lands the browser on a fixed /auth/callback URL,
// so we can't pass this through the OAuth flow itself. sessionStorage
// survives the redirect to Microsoft and back within the same tab).
export function setPostLoginRedirect(path: string) {
  if (typeof window !== 'undefined') sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path)
}

export function consumePostLoginRedirect(): string | null {
  if (typeof window === 'undefined') return null
  const path = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY)
  if (path) sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY)
  return path
}

// The email-only dev login bypasses Microsoft SSO entirely. Never expose it
// in production.
export function isDevBypassEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

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

// ── JWT payload handling ─────────────────────────────────────────────────────
// The access token is the single client-side source of truth for identity and
// role. Decoding here is NOT verification (only the backend can verify the
// signature); it exists so routing/UI decisions come from the same signed
// object the backend will check, instead of a separate editable key. Any
// tampered value still dies at the API, and ProtectedRoute additionally
// reconciles against the server's /users/me response.

interface TokenPayload {
  sub: string
  role?: string
  exp?: number
  [claim: string]: unknown
}

function decodeJwtPayload(token: string): TokenPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64)) as TokenPayload
  } catch {
    return null
  }
}

const CLOCK_SKEW_MS = 30_000

/** Decoded payload of the stored access token, or null if absent/malformed/expired. */
export function getTokenPayload(): TokenPayload | null {
  const token = getAccessToken()
  if (!token) return null
  const payload = decodeJwtPayload(token)
  if (!payload) return null
  if (payload.exp && payload.exp * 1000 < Date.now() - CLOCK_SKEW_MS) return null
  return payload
}

export function saveAuthTokens(accessToken: string, refreshToken: string, role?: string) {
  store(KEYS.ACCESS, accessToken)
  store(KEYS.REFRESH, refreshToken)
  // Cached copy of the role for moments when the access token is expired but
  // the session is still refreshable. getStoredRole() always prefers the live
  // JWT payload over this cache.
  const resolvedRole = role ?? decodeJwtPayload(accessToken)?.role
  if (resolvedRole) store(KEYS.ROLE, resolvedRole)
}

export function getAccessToken(): string | null {
  return load(KEYS.ACCESS)
}

export function getRefreshToken(): string | null {
  return load(KEYS.REFRESH)
}

export function getStoredRole(): string | null {
  return getTokenPayload()?.role ?? load(KEYS.ROLE)
}

export function removeAuthTokens() {
  clear(KEYS.ACCESS)
  clear(KEYS.REFRESH)
  clear(KEYS.ROLE)
}

/**
 * True when the session is usable: either the access token is present, well
 * formed and unexpired, or a refresh token exists (the axios interceptor
 * transparently refreshes on the first 401). A malformed or expired access
 * token with no refresh token is NOT authenticated, previously any leftover
 * string in localStorage counted.
 */
export function isAuthenticated(): boolean {
  return getTokenPayload() !== null || !!getRefreshToken()
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
  } catch (err: unknown) {
    // Only destroy the session when the SERVER rejected the token. A network
    // blip (offline phone, flaky campus wifi) must not log the user out —
    // keep the tokens and report the session as still alive; the axios
    // interceptor will retry the refresh on the next 401.
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status && status >= 400 && status < 500) {
      removeAuthTokens()
      return false
    }
    return true
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
