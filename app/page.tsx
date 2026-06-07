'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getStoredRole } from '@/lib/auth'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }
    const role = getStoredRole()
    if (role === 'lecturer') router.replace('/dashboard/lecturer')
    else router.replace('/dashboard/student')
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
