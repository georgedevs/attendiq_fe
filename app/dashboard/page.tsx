'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredRole } from '@/lib/auth'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const role = getStoredRole()
    router.replace(role === 'lecturer' ? '/dashboard/lecturer' : '/dashboard/student')
  }, [router])

  return null
}
