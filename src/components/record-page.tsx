import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

// Шапка отдельной страницы записи (клиент, подрядчик, инвойс): назад, название, подпись, кнопки
export function RecordHeader({
  back,
  title,
  badge,
  subtitle,
  actions,
}: {
  back: string
  title: ReactNode
  badge?: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <Button asChild variant="outline" size="icon-sm" aria-label={t('Back')}>
          <Link to={back}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// Плитка с цифрой: «Котировок 12», «Должен 4 970 USD»
export function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'good' | 'bad' | 'warn'
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="text-xs text-muted-foreground">{t(label)}</div>
      <div
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          tone === 'good' && 'text-success',
          tone === 'bad' && 'text-destructive',
          tone === 'warn' && 'text-warning-text',
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

// Простой список записей: строка со ссылкой, подписью и значением справа
export function RecordList({
  empty,
  rows,
}: {
  empty: string
  rows: { key: string; to: string; title: ReactNode; meta?: ReactNode; right?: ReactNode }[]
}) {
  if (!rows.length) return <p className="p-5 text-sm text-muted-foreground">{t(empty)}</p>
  return (
    <ul className="divide-y">
      {rows.map((row) => (
        <li key={row.key}>
          <Link
            to={row.to}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
          >
            <span className="font-medium text-primary">{row.title}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{row.meta}</span>
            {row.right}
          </Link>
        </li>
      ))}
    </ul>
  )
}
