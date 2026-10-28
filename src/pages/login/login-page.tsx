import { useState, type FormEvent } from 'react'
import { BriefcaseBusiness, Calculator, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import { AuthLayout } from '@/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, useSession } from '@/data/auth'
import { t } from '@/i18n'
import { PRODUCT_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

// Сколько «идёт запрос» при входе, мс. Столько же едет полоса сверху карточки
const SIGN_IN_DELAY = 900

const DEMO_ACCOUNTS = [
  { email: 'manager@company.com', label: 'Admin', icon: KeyRound },
  { email: 'operator@company.com', label: 'Employee', icon: BriefcaseBusiness },
  { email: 'accountant@company.com', label: 'Accountant', icon: Calculator },
]

export function LoginPage() {
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('manager@company.com')
  const [password, setPassword] = useState('demo-password')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Куда вернуть после входа (RequireAuth кладёт это в state)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (session) return <Navigate to={from} replace />

  const enter = (address: string) => {
    setLoading(true)
    // Небольшая пауза, чтобы вход ощущался как настоящий запрос к серверу
    setTimeout(() => {
      signIn(address)
      navigate(from, { replace: true })
    }, SIGN_IN_DELAY)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!loading) enter(email.trim().toLowerCase())
  }

  return (
    <AuthLayout tab="signin">
      <div className="relative">
        {/* Полоса прогресса по верхнему краю отвечает на нажатие Sign in */}
        <div
          aria-hidden
          className={cn(
            'absolute inset-x-0 top-0 h-0.5 origin-left bg-primary transition-transform ease-out motion-reduce:transition-none',
            loading ? 'scale-x-100' : 'scale-x-0',
          )}
          style={{ transitionDuration: `${SIGN_IN_DELAY}ms` }}
        />

        <div className="px-6 pt-7 pb-6 sm:px-8">
          <h1 className="text-2xl font-semibold tracking-tight">{t('Sign in to {name}', { name: PRODUCT_NAME })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('Enter your work email to open the workspace.')}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('Email')}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus
                  placeholder="name@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('Password')}</Label>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
                  {t('Forgot password?')}
                </button>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 pr-10 pl-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t('Hide password') : t('Show password')}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-1 text-sm">
              <input type="checkbox" defaultChecked className="size-4 rounded border-input accent-primary" />
              {t('Keep me signed in')}
            </label>

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? t('Signing in…') : t('Sign in')}
            </Button>
          </form>
        </div>

        {/* Демо-команда: войти под ролью в один клик и посмотреть, что она видит */}
        <div className="border-t bg-muted/40 px-6 py-4 sm:px-8">
          <div className="text-sm font-medium">{t('Demo access')}</div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map(({ email: address, label, icon: Icon }) => (
              <Button
                key={address}
                type="button"
                variant="outline"
                className="h-10 bg-card px-2"
                disabled={loading}
                onClick={() => enter(address)}
              >
                <Icon className="max-sm:hidden" />
                {t(label)}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('No password needed. Pick a role to try the system.')}
          </p>
        </div>

        <div className="border-t px-6 py-3.5 text-center text-sm sm:px-8">
          {t('New company?')}{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            {t('Create an account')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
