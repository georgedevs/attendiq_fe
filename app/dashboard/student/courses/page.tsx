'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Enrollment no longer exists — students just scan QR codes.
// Redirect anyone who lands here to their attendance history.
export default function StudentCoursesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/student/attendance') }, [router])
  return null
}
