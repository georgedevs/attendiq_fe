'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Loader2, Pencil, Trash2, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useCourses, useCreateCourse, useUpdateCourse, useDeleteCourse } from '@/hooks/use-courses'
import { useMe } from '@/hooks/use-me'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import type { Course } from '@/lib/types'

interface CourseFormData {
  code: string; title: string; department: string; creditUnits: number
}

function CourseDialog({ trigger, initial, onSave, heading }: {
  trigger: React.ReactNode
  initial?: Partial<CourseFormData>
  onSave: (data: CourseFormData) => Promise<void>
  heading: string
}) {
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm]     = useState<CourseFormData>({
    code: initial?.code ?? '', title: initial?.title ?? '',
    department: initial?.department ?? '', creditUnits: initial?.creditUnits ?? 3,
  })
  const field = (k: keyof CourseFormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'creditUnits' ? Number(e.target.value) : e.target.value }))
  const handle = async () => {
    setLoading(true)
    try { await onSave(form); setOpen(false) }
    catch (err: unknown) { toast.error((err as { message?: string })?.message || 'Failed') }
    finally { setLoading(false) }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{heading}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={form.code} onChange={field('code')} placeholder="CSC401" />
            </div>
            <div className="space-y-1.5">
              <Label>Units</Label>
              <Input type="number" min={1} max={6} value={form.creditUnits} onChange={field('creditUnits')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={field('title')} placeholder="Introduction to Algorithms" />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Input value={form.department} onChange={field('department')} placeholder="Computer Science" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handle} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CourseCard({ course }: { course: Course }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const update = useUpdateCourse(course.id)
  const del    = useDeleteCourse(course.id)
  const handleUpdate = async (data: CourseFormData) => {
    const { code: _code, ...rest } = data
    await update.mutateAsync(rest); toast.success('Course updated')
  }
  const handleDelete = async () => {
    try { await del.mutateAsync(); toast.success('Course deleted') }
    catch { toast.error('Delete failed') }
  }
  return (
    <>
    <div className="rounded-xl shadow-2xl border  shadow-[green]/15 -bg-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{course.code}</p>
          <p className="text-xs italic text-muted-foreground truncate mt-0.5">{course.title}</p>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground shrink-0">
          {course.creditUnits} units
        </p>
      </div>

      {/* Sessions link — primary action for each course */}
      <Link
        href={`/dashboard/lecturer/sessions?courseId=${course.id}`}
        className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 hover:bg-muted transition-colors"
      >
        <ClipboardList className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium">View sessions & attendance</span>
      </Link>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <p className="text-xs italic text-muted-foreground">
          {course.department} · {course.creditUnits} units
        </p>
        <div className="flex items-center gap-0.5">
          <CourseDialog
            trigger={
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            }
            initial={course} onSave={handleUpdate} heading="Edit Course"
          />
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>

    <ConfirmDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      title={`Delete ${course.code}?`}
      description="This will permanently remove the course and cannot be undone."
      actionLabel="Delete course"
      destructive
      onConfirm={handleDelete}
    />
    </>
  )
}

function CourseCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-3 w-10" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export default function LecturerCoursesPage() {
  const { data: meData } = useMe()
  const lecturerId = (meData?.data?.profile as { id?: string } | null)?.id
  const { data, isLoading } = useCourses({ limit: 100, lecturerId })
  const create = useCreateCourse()
  const courses = data?.data?.data || []
  const total   = data?.data?.pagination.total

  const handleCreate = async (formData: CourseFormData) => {
    await create.mutateAsync(formData); toast.success('Course created')
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="ttl text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total !== undefined
              ? <><span className="font-medium">{total}</span>{' '}<span className="italic">course{total !== 1 ? 's' : ''} in your teaching schedule</span></>
              : <span className="italic">Your teaching courses</span>
            }
          </p>
        </div>
        <CourseDialog
          trigger={<Button size="sm"><Plus className="h-4 w-4 mr-1.5" /> New Course</Button>}
          onSave={handleCreate} heading="Create Course"
        />
      </div>

      {/* Grid — cards fill the full width */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      ) : !courses.length ? (
        <div className="rounded-xl border border-border bg-card px-6 py-16 text-center space-y-3">
          <p className="text-sm font-medium">No courses yet</p>
          <p className="text-sm italic text-muted-foreground">Create your first course to start taking attendance.</p>
          <CourseDialog
            trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1.5" /> Create course</Button>}
            onSave={handleCreate} heading="Create Course"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {courses.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  )
}
