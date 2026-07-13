'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ArchiveConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  confirmText?: string
}

export function ArchiveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  confirmText = 'ARCHIVE',
}: ArchiveConfirmDialogProps) {
  const [inputVal, setInputVal] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) setInputVal('')
  }, [open])

  const handle = async () => {
    if (inputVal !== confirmText) return
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="select-none">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            Archive this session?
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2 select-none">
            <span className="block font-medium text-foreground dark:text-white">
              Warning: This action is destructive and cannot be undone.
            </span>
            <span className="block text-xs">
              Archiving this session will soft-delete it and also **soft-delete all student attendance records** associated with it. This session will no longer count in any student or course summaries, and students will no longer see it on their portal.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2 select-none">
          <Label htmlFor="confirm-archive-input" className="text-xs font-semibold text-muted-foreground select-none">
            Please type <span className="font-bold text-foreground underline select-none">{confirmText}</span> to confirm.
          </Label>
          <Input
            id="confirm-archive-input"
            type="text"
            placeholder={confirmText}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            className="border-destructive/30 focus-visible:ring-destructive select-none"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handle}
            disabled={isLoading || inputVal !== confirmText}
            variant="destructive"
          >
            {isLoading ? 'Archiving...' : 'Archive Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
