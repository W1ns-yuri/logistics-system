import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signOut, usePermissions, useSession } from '@/data/auth'
import { licenseStatus, useCurrentCompany } from '@/data/platform'
import { t } from '@/i18n'

// Пускает дальше только после входа. Иначе — на /login, запомнив, куда человек шёл.
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()

  const company = useCurrentCompany()

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (company && licenseStatus(company) === 'blocked') return <BlockedScreen name={company.name} />
  return children
}

// Компанию заблокировал владелец платформы: в рабочее пространство не пускаем
function BlockedScreen({ name }: { name: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/60 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="size-5" />
        </div>
        <h1 className="mt-4 text-lg font-semibold">{t('Account blocked')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('The account of {name} is blocked. Contact support to restore access.', { name })}
        </p>
        <Button variant="outline" className="mt-6 w-full" onClick={signOut}>
          {t('Sign out')}
        </Button>
      </div>
    </div>
  )
}

// Оплаты и аналитику сотрудник не видит — отправляем на главную
export function RequirePayments({ children }: { children: ReactNode }) {
  const { canSeePayments } = usePermissions()
  if (!canSeePayments) return <Navigate to="/" replace />
  return children
}
