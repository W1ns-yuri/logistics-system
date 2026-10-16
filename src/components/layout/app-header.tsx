import {
  ChevronDown,
  ChevronRight,
  FileText,
  Languages,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Truck,
  User,
  Warehouse,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { findNavItem } from '@/config/navigation'
import { signOut, switchRole, usePermissions, useSession } from '@/data/auth'
import { initials, updateSettings, useSettings } from '@/data/settings'
import { useTheme } from '@/hooks/use-theme'
import { LANGUAGES, t, type Language } from '@/i18n'
import { ROLES, roleLabels, type Role } from '@/types/team'
import { NotificationsMenu } from './notifications-menu'

export function AppHeader() {
  const { pathname } = useLocation()
  const current = findNavItem(pathname)
  const { theme, toggleTheme } = useTheme()
  const settings = useSettings()
  const session = useSession()
  const { canEditOrders } = usePermissions()
  const navigate = useNavigate()
  const userName = session?.name ?? ''

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-6">
      {/* Хлебные крошки: Home > Quotations */}
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          {t('Home')}
        </Link>
        {current && current.path !== '/' && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="truncate font-medium">{t(current.title)}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t('Search by reference, customer...')} className="h-9 w-72 pl-8" />
        </div>

        {canEditOrders && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus />
                {t('New')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/quotations/new">
                  <FileText />
                  {t('Quotation')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/shipments?new=1">
                  <Truck />
                  {t('Shipment')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/customers?new=1">
                  <User />
                  {t('Customer')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/vendors?new=1">
                  <Warehouse />
                  {t('Vendor')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Выбор языка: выпадающий список, чтобы потом легко добавить третий язык */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 px-2 font-semibold" aria-label={t('Language')}>
              <Languages />
              {settings.language.toUpperCase()}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>{t('Language')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={settings.language}
              onValueChange={(value) => updateSettings({ language: value as Language })}
            >
              {LANGUAGES.map((lang) => (
                <DropdownMenuRadioItem key={lang.value} value={lang.value}>
                  {lang.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label={t('Toggle theme')}>
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
                <AvatarFallback className="bg-primary/10 text-primary">{initials(userName)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="font-medium">{userName}</div>
              <div className="text-xs font-normal text-muted-foreground">{session?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* Для демо: посмотреть систему глазами другой роли */}
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {t('View as role')}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={session?.role} onValueChange={(value) => switchRole(value as Role)}>
              {ROLES.map((role) => (
                <DropdownMenuRadioItem key={role} value={role}>
                  {t(roleLabels[role])}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings />
                {t('Settings')}
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
              {t('Log out')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
