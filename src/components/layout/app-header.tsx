import { ChevronRight, FileText, LogOut, Moon, Plus, Search, Settings, Sun, Truck, User } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { findNavItem } from '@/config/navigation'
import { signOut } from '@/data/auth'
import { initials, useSettings } from '@/data/settings'
import { useTheme } from '@/hooks/use-theme'
import { NotificationsMenu } from './notifications-menu'

export function AppHeader() {
  const { pathname } = useLocation()
  const current = findNavItem(pathname)
  const { theme, toggleTheme } = useTheme()
  const settings = useSettings()
  const navigate = useNavigate()

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-6">
      {/* Хлебные крошки: Home > Quotations */}
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          Home
        </Link>
        {current && current.path !== '/' && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="truncate font-medium">{current.title}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by reference, customer..." className="h-9 w-72 pl-8" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/quotations">
                <FileText />
                Quotation
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/shipments">
                <Truck />
                Shipment
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/customers">
                <User />
                Customer
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>

        <NotificationsMenu />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">{initials(settings.userName)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="font-medium">{settings.userName}</div>
              <div className="text-xs font-normal text-muted-foreground">{settings.userRole}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                signOut()
                navigate('/login')
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
