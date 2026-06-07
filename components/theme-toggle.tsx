'use client'

import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type Mode = 'light' | 'dark' | 'system'

const options: { value: Mode; label: string; icon: React.ElementType }[] = [
  { value: 'light',  label: 'Light',  icon: Sun     },
  { value: 'dark',   label: 'Dark',   icon: Moon    },
  { value: 'system', label: 'System', icon: Monitor },
]

const iconFor: Record<Mode, React.ElementType> = {
  light: Sun, dark: Moon, system: Monitor,
}

interface ThemeToggleProps {
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({ showLabel, className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current = (mounted ? theme ?? 'system' : 'system') as Mode
  const Icon = iconFor[current] ?? Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={showLabel ? 'sm' : 'icon'}
          className={cn(
            'text-muted-foreground hover:text-foreground',
            showLabel && 'w-full justify-start gap-2.5 px-2.5',
            className,
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {showLabel && <span className="text-sm">{options.find(o => o.value === current)?.label}</span>}
          {!showLabel && <span className="sr-only">Toggle theme</span>}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-36">
        {options.map(({ value, label, icon: OptionIcon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <OptionIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{label}</span>
            </span>
            {current === value && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
