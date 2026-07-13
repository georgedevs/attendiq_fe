'use client'

import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QueryErrorStateProps {
  message?: string
  onRetry: () => void | Promise<unknown>
  className?: string
}

export function QueryErrorState({
  message = 'Failed to load data. Please check your internet connection and try again.',
  onRetry,
  className,
}: QueryErrorStateProps) {
  return (
    <div className={`rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-6 text-center space-y-3.5 ${className}`}>
      <div className="flex justify-center">
        <div className="rounded-full bg-destructive/10 p-2.5 text-destructive">
          <AlertCircle className="h-5 w-5 animate-pulse" />
        </div>
      </div>
      <div className="space-y-1 max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-foreground">Connection Error</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onRetry()}
        className="border-destructive/30 text-destructive hover:bg-destructive/5 gap-1.5 h-8 text-xs font-semibold"
      >
        <RotateCcw className="h-3 w-3" /> Retry
      </Button>
    </div>
  )
}
