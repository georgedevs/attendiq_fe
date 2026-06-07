export type UserRole = 'student' | 'lecturer' | 'admin'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type SessionStatus = 'active' | 'paused' | 'ended'
export type AttendanceStatus = 'present' | 'flagged' | 'rejected'
export type LocationStatus = 'green' | 'red' | 'neutral'

export interface ApiSuccess<T> {
  status: 'success'
  statusCode: number
  data: T
}

export interface ApiError {
  status: 'error'
  statusCode: number
  message: string | string[]
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedData<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface User {
  id: string
  email: string
  role: UserRole
  status: UserStatus
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface StudentProfile {
  id: string
  userId: string
  fullName: string
  matricNumber: string | null
  department: string
  level: number
  createdAt: string
  updatedAt: string
}

export interface LecturerProfile {
  id: string
  userId: string
  fullName: string
  staffId: string | null
  department: string
  createdAt: string
  updatedAt: string
}

export interface MeResponse {
  user: User
  profile: StudentProfile | LecturerProfile | null
  role: UserRole
}

export interface Course {
  id: string
  code: string
  title: string
  department: string
  creditUnits: number
  lecturerId: string
  createdAt: string
  updatedAt: string
  enrollmentCount?: number
}

export interface Enrollment {
  id: string
  courseId: string
  studentId: string
  academicYear: string
  semester: string
  course?: Course
  enrolledAt: string  // DB column name — NOT createdAt
}

export interface Session {
  id: string
  courseId: string
  lecturerId: string
  status: SessionStatus
  lecturerLatitude?: number
  lecturerLongitude?: number
  lecturerLocationAccuracy?: number
  startedAt: string   // DB column name — NOT createdAt
  endedAt: string | null
  updatedAt: string
  course?: Course
  attendanceCount?: number
}

export interface QrData {
  token: string
  sessionId: string
  stepSeconds: number
  expiresInMs: number
}

export interface AttendanceRecord {
  id: string
  sessionId: string
  studentId: string
  status: AttendanceStatus
  locationStatus: LocationStatus
  fraudScore: number
  gpsSpoofingSuspected: boolean
  fingerprintSimilarityScore: number | null
  flagReason: string | null
  createdAt: string
}

export interface LiveAttendanceEvent {
  type: 'attendance.recorded'
  sessionId: string
  studentId: string
  studentName: string
  status: AttendanceStatus
  timestamp: string
}
