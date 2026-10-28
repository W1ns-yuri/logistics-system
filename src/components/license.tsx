import { AlertTriangle, Lock } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/data/auth'
import { daysLeft, EXPIRING_DAYS, licenseStatus, useCurrentCompany, type LicenseStatus } from '@/data/platform'
import { t } from '@/i18n'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const statusView: Record<
  LicenseStatus,
  { label: string; variant: 'success' | 'info' | 'warning' | 'destructive' | 'outline' }
> = {
  active: { label: 'Active', variant: 'success' },
  trial: { label: 'Trial', variant: 'info' },
  expiring: { label: 'Expiring', variant: 'warning' },
  expired: { label: 'Expired', variant: 'destructive' },
  blocked: { label: 'Blocked', variant: 'outline' },
}

export function LicenseStatusBadge({ status }: { status: LicenseStatus }) {
  const view = statusView[status]
  return <Badge variant={view.variant}>{t(view.label)}</Badge>
}

// «осталось 5 дн.» / «истекла 3 дн. назад»
export function DaysLeft({ days, className }: { days: number; className?: string }) {
  return (
    <span
      className={cn(
        'tabular-nums',
        days < 0 ? 'text-destructive' : days <= EXPIRING_DAYS ? 'text-warning' : 'text-muted-foreground',
        className,
      )}
    >
      {days < 0 ? t('{n} d ago', { n: -days }) : t('{n} d left', { n: days })}
    </span>
  )
}

// Плашка над рабочим пространством: лицензия скоро кончится или уже кончилась
export function LicenseBanner() {
  const company = useCurrentCompany()
  const { role } = usePermissions()
  if (!company) return null
  const status = licenseStatus(company)
  const left = daysLeft(company)
  const showSoon = (status === 'expiring' || status === 'trial') && left <= EXPIRING_DAYS
  if (status !== 'expired' && !showSoon) return null

  const expired = status === 'expired'
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-6 py-2 text-sm',
        expired
          ? 'border-destructive/20 bg-destructive/10 text-destructive'
          : 'border-warning/20 bg-warning/10 text-warning',
      )}
    >
      {expired ? <Lock className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
      <span className="font-medium">
        {expired
          ? t('Your license expired on {date}. The workspace is read-only.', { date: formatDate(company.paidUntil) })
          : t('Your license ends on {date} ({n} d left).', { date: formatDate(company.paidUntil), n: left })}
      </span>
      {role === 'admin' && (
        <Link to="/settings#subscription" className="underline underline-offset-2">
          {t('Renew')}
        </Link>
      )}
    </div>
  )
}
