import { useState, type FormEvent } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { Link, Outlet } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TooltipProvider } from '@/components/ui/tooltip'
import { signInOwner, signOutOwner, usePlatformOwner } from '@/data/platform'
import { t } from '@/i18n'

/*
 * Админка владельца платформы. Отдельный вход и свой каркас, чтобы не путать с рабочим приложением.
 * В прототипе пускает с любым email; на бэкенде здесь будет отдельная роль и вход с двухфакторной защитой.
 */
export function PlatformLayout() {
  const owner = usePlatformOwner()
  if (!owner) return <OwnerLogin />

  return (
    <TooltipProvider>
      <div className="min-h-svh bg-muted/40">
        <header className="sticky top-0 z-10 border-b bg-sidebar text-sidebar-foreground">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-6">
            <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <Link to="/platform" className="text-sm font-semibold text-sidebar-accent-foreground">
              {t('Platform admin')}
            </Link>
            <span className="text-xs text-sidebar-foreground/60">{t('All companies and licenses')}</span>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="hidden text-sidebar-foreground/70 sm:inline">{owner}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={signOutOwner}
                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut />
                {t('Sign out')}
              </Button>
            </div>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
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
