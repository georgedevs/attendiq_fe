import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { getAccessToken, getRefreshToken, saveAuthTokens, removeAuthTokens } from './auth'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    // Bypasses ngrok's browser warning interstitial page so API requests
    // return JSON instead of an HTML warning page.
    'ngrok-skip-browser-warning': 'true',
  },
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

function processQueue(err: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)))
  failedQueue = []
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    const skipRefresh = ['/auth/refresh', '/auth/exchange', '/v2/auth/login'].some((p) =>
      original?.url?.includes(p)
    )

    if (error.response?.status === 401 && !original?._retry && !skipRefresh) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return apiClient(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const refreshToken = getRefreshToken()
        if (!refreshToken) throw new Error('No refresh token')

        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
        const res = await axios.post(`${base}/auth/refresh`, { refreshToken })
        const { accessToken, refreshToken: newRefresh } = res.data.data

        saveAuthTokens(accessToken, newRefresh)
        processQueue(null, accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return apiClient(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        // Only kill the session when the refresh endpoint itself rejected the
        // token (4xx). If the refresh request never reached the server or the
        // server errored (network blip, campus wifi drop, 5xx), keep the
        // tokens — the next 401 will retry the refresh.
        const status = (refreshErr as { response?: { status?: number } })?.response?.status
        if (status && status >= 400 && status < 500) {
          removeAuthTokens()
          if (typeof window !== 'undefined') {
            const path = window.location.pathname
            if (!['/login'].includes(path)) window.location.href = '/login'
          }
        }
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject({
      message:
        (error.response?.data as Record<string, unknown>)?.message ||
        error.message,
      status: error.response?.status,
      data: error.response?.data,
    })
  }
)

export default apiClient

export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((r) => r.data),
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((r) => r.data),
  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((r) => r.data),
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((r) => r.data),
}
