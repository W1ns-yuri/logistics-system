import { useState, type FormEvent } from 'react'
import { Container, Eye, EyeOff } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, useSession } from '@/data/auth'
import { useSettings } from '@/data/settings'
import { cn } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()
// Сколько «идёт запрос» при входе, мс. Столько же едет полоса сверху карточки
const SIGN_IN_DELAY = 900

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
    }, SIGN_IN_DELAY)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/60 px-4 py-10">
      <main className="relative w-full max-w-[400px] overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Полоса прогресса по верхнему краю: единственная анимация на странице, отвечает на нажатие Sign in */}
        <div
          aria-hidden
          className={cn(
            'absolute inset-x-0 top-0 h-0.5 origin-left bg-primary transition-transform ease-out motion-reduce:transition-none',
            loading ? 'scale-x-100' : 'scale-x-0',
          )}
          style={{ transitionDuration: `${SIGN_IN_DELAY}ms` }}
        />

        <div className="px-8 pt-8 pb-7">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Container className="size-4" />
            </div>
            <span className="text-sm font-semibold">{settings.companyName}</span>
          </div>

          <h1 className="mt-8 text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Use your work email to open the workspace.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
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

            <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <input type="checkbox" defaultChecked className="size-4 rounded border-input accent-primary" />
              Keep me signed in
            </label>

            <Button type="submit" className="mt-2 h-10 w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <div className="border-t bg-muted/40 px-8 py-3 text-xs text-muted-foreground">
          Demo access: any email and password will work.
        </div>
      </main>

      <p className="mt-6 text-xs text-muted-foreground">
        © {CURRENT_YEAR} {settings.companyName}
      </p>
    </div>
  )
}
