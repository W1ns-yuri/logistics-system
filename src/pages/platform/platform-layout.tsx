import { useState, type FormEvent } from 'react'
import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Languages,
  Layers,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router'

import { AppSidebar } from '@/components/layout/app-sidebar'
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
import { Label } from '@/components/ui/label'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { NavGroup, NavItem } from '@/config/navigation'
import { signInOwner, signOutOwner, usePlatformOwner } from '@/data/platform'
import { initials, updateSettings, useSettings } from '@/data/settings'
import { useTheme } from '@/hooks/use-theme'
import { LANGUAGES, t, type Language } from '@/i18n'

// Меню админки платформы: тот же сайдбар, что в рабочем приложении, но свои разделы
const groups: NavGroup[] = [
  { label: 'Overview', items: [{ title: 'Dashboard', path: '/platform', icon: BarChart3, end: true }] },
  {
    label: 'Clients',
    items: [
      { title: 'Companies', path: '/platform/companies', icon: Building2 },
      { title: 'License payments', path: '/platform/payments', icon: CreditCard },
      { title: 'Plans', path: '/platform/plans', icon: Layers },
    ],
  },
]
const footer: NavItem[] = [{ title: 'Open the app', path: '/', icon: ExternalLink }]
const allItems = groups.flatMap((g) => g.items)

/*
 * Админка владельца платформы. Отдельный вход, свои разделы, дизайн как у рабочего приложения.
 * В прототипе пускает с любым email; на бэкенде здесь будет отдельная роль и вход с двухфакторной защитой.
 */
export function PlatformLayout() {
  const owner = usePlatformOwner()
  const [collapsed, setCollapsed] = useState(false)
  if (!owner) return <OwnerLogin />

  return (
    <TooltipProvider>
      <div className="flex h-svh overflow-hidden bg-muted/40">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
          nav={{ groups, footer, title: 'Platform admin', subtitle: 'All companies and licenses', icon: ShieldCheck }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <PlatformHeader owner={owner} />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

function PlatformHeader({ owner }: { owner: string }) {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const settings = useSettings()
  // Самый длинный подходящий раздел: /platform/companies/123 → Companies
  const current = [...allItems].reverse().find((item) => pathname.startsWith(item.path))

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-6">
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link to="/platform" className="text-muted-foreground hover:text-foreground">
          {t('Platform')}
        </Link>
        {current && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="truncate font-medium">{t(current.title)}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t('Account')}
              className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">{initials(owner)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="font-medium">{t('Platform owner')}</div>
              <div className="text-xs font-normal text-muted-foreground">{owner}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOutOwner}>
              <LogOut />
              {t('Sign out')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function OwnerLogin() {
  const [email, setEmail] = useState('owner@platform.com')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    signInOwner(email.trim())
  }
  return (
    <div className="flex min-h-svh items-center justify-center bg-sidebar px-4">
      <main className="w-full max-w-[380px] rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-4" />
        </div>
        <h1 className="mt-6 text-xl font-semibold tracking-tight">{t('Platform admin')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('For the platform owner only. Companies sign in on the main page.')}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="owner-email">{t('Email')}</Label>
            <Input
              id="owner-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner-password">{t('Password')}</Label>
            <Input id="owner-password" type="password" required defaultValue="demo-password" className="h-10" />
          </div>
          <Button type="submit" className="h-10 w-full">
            {t('Sign in')}
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">{t('Demo access: any email and password will work.')}</p>
      </main>
    </div>
  )
}
