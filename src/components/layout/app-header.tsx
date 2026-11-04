import {
  ChevronDown,
  ChevronRight,
  FileText,
  Languages,
  LogOut,
  Menu,
  Moon,
  Plus,
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
import { findNavItem } from '@/config/navigation'
import { signOut, usePermissions, useSession } from '@/data/auth'
import { initials, updateSettings, useSettings } from '@/data/settings'
import { useTheme } from '@/hooks/use-theme'
import { LANGUAGES, t, type Language } from '@/i18n'
import { roleLabels } from '@/types/team'
import { GlobalSearch } from './global-search'
import { NotificationsMenu } from './notifications-menu'

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation()
  const current = findNavItem(pathname)
  const { theme, toggleTheme } = useTheme()
  const settings = useSettings()
  const session = useSession()
  const { canEditOrders } = usePermissions()
  const navigate = useNavigate()
  const userName = session?.name ?? ''

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:gap-4 sm:px-6">
      <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={t('Open menu')} onClick={onMenu}>
        <Menu />
      </Button>
      {/* Хлебные крошки: Home > Quotations. На телефоне место нужно кнопкам, раздел и так виден в заголовке */}
      <nav className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
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

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <GlobalSearch />

        {canEditOrders && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" aria-label={t('New')}>
                <Plus />
                <span className="hidden sm:inline">{t('New')}</span>
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
              <span className="hidden sm:inline">{settings.language.toUpperCase()}</span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
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
              aria-label={t('Account')}
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
              {/* Роль только показываем: менять роли может админ в Settings → Team, и не себе */}
              {session && (
                <div className="mt-1 text-xs font-normal text-muted-foreground">{t(roleLabels[session.role])}</div>
              )}
            </DropdownMenuLabel>
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
