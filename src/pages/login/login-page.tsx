import { useState, type FormEvent } from 'react'
import { ArrowRight, Container, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, useSession } from '@/data/auth'
import { useSettings } from '@/data/settings'
import { RouteMap } from './route-map'

const STATS = [
  { value: '1 295', label: 'quotations a year' },
  { value: '98.4%', label: 'on-time delivery' },
  { value: '14', label: 'countries served' },
]

const CURRENT_YEAR = new Date().getFullYear()

export function LoginPage() {
  const session = useSession()
  const settings = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('manager@company.com')
  const [password, setPassword] = useState('demo-password')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Куда вернуть после входа (RequireAuth кладёт это в state)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (session) return <Navigate to={from} replace />

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    // Небольшая пауза, чтобы вход ощущался как настоящий запрос к серверу
    setTimeout(() => {
      signIn(email)
      navigate(from, { replace: true })
    }, 700)
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1.15fr_1fr]">
      {/* Левая половина: бренд и живая карта маршрутов */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        {/* Точечная сетка на фоне */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Container className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sidebar-accent-foreground">{settings.companyName}</div>
            <div className="text-sm text-sidebar-foreground/60">{settings.companyTagline}</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-4xl leading-tight font-semibold tracking-tight text-sidebar-accent-foreground">
            Every shipment, from quote to delivery.
          </h1>
          <p className="mt-4 max-w-md text-sidebar-foreground/70">
            Quotations, margins, tracking and invoices in one place. Air, sea, road and rail.
          </p>
          <div className="mt-8 -mx-4">
            <RouteMap />
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-6 border-t border-sidebar-border pt-6">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-semibold text-sidebar-accent-foreground tabular-nums">{stat.value}</div>
              <div className="text-sm text-sidebar-foreground/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Правая половина: форма */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Container className="size-5" />
            </div>
            <div className="font-semibold">{settings.companyName}</div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Welcome back. Enter your work account to continue.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" defaultChecked className="size-4 rounded border-input accent-primary" />
              Keep me signed in
            </label>

            <Button type="submit" className="h-10 w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="h-10 w-full" onClick={handleSubmit} disabled={loading}>
            <KeyRound />
            Continue with SSO
          </Button>

          <div className="mt-8 flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-px size-4 shrink-0 text-success" />
            <span>Demo mode: any email and password will sign you in. Data is sample data.</span>
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            © {CURRENT_YEAR} {settings.companyName}. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  )
}
