'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveAuthTokens } from '@/lib/auth'
import { toast } from 'sonner'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    const error = params.get('error')

    if (error) {
      toast.error(`Login failed: ${error}`)
      router.replace('/login')
      return
    }

    if (token) {
      // MS OAuth only returns an access token — no refresh token via redirect.
      // Store just the access token; refresh won't work until backend passes it.
      saveAuthTokens(token, '')
      toast.success('Signed in successfully')
      const role = (typeof window !== 'undefined')
        ? (() => {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]))
              return payload.role as string
            } catch {
              return null
            }
          })()
        : null
      router.replace(role === 'lecturer' ? '/dashboard/lecturer' : '/dashboard/student')
    } else {
      router.replace('/login')
    }
  }, [params, router])

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
