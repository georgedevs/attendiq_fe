'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User, Settings } from 'lucide-react'
import { logout } from '@/lib/auth'
import { useMe } from '@/hooks/use-me'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function UserProfileMenu({ isCollapsed }: { isCollapsed?: boolean }) {
  const router = useRouter()
  const { data } = useMe()
  const me = data?.data
  const name =
    (me?.profile as { fullName?: string } | null)?.fullName || me?.user.email || '...'

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-3 rounded-lg p-2 hover:bg-muted transition-colors w-full',
            isCollapsed && 'justify-center p-2'
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground capitalize">{me?.role || '...'}</p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <p className="font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground font-normal capitalize">{me?.role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
