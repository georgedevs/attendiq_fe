'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { saveAuthTokens, consumePostLoginRedirect } from '@/lib/auth'
import { resolvePostLoginDestination } from '@/lib/post-login'
import { toast } from 'sonner'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()
  const queryClient = useQueryClient()
  // React 18 strict mode runs effects twice in dev, and the exchange code is
  // single-use, so guard against firing the POST twice.
  const exchanged = useRef(false)

  useEffect(() => {
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      toast.error(error)
      router.replace('/login')
      return
    }

    if (!code) {
      router.replace('/login')
      return
    }

    if (exchanged.current) return
    exchanged.current = true

    const exchange = async () => {
      try {
        const axios = (await import('axios')).default
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
        const res = await axios.post(`${base}/auth/exchange`, { code })
        const { accessToken, refreshToken } = res.data.data
        if (!accessToken || !refreshToken) throw new Error('Malformed token response')

        saveAuthTokens(accessToken, refreshToken)
        // A fresh session may be a different account; drop anything cached
        // under the previous one before any page reads it.
        queryClient.clear()
        toast.success('Signed in successfully')
        const redirectTo = consumePostLoginRedirect()
        if (redirectTo) {
          router.replace(redirectTo)
          return
        }
        // Resolve onboarding vs dashboard from the server BEFORE navigating,
        // so the user never sees a dashboard flash on their way to onboarding.
        router.replace(await resolvePostLoginDestination(queryClient))
      } catch {
        toast.error('Sign in expired or was already used. Please try again.')
        router.replace('/login')
      }
    }

    void exchange()
  }, [params, router, queryClient])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-sm text-muted-foreground">Completing sign in…</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <CallbackHandler />
    </Suspense>
  )
}
