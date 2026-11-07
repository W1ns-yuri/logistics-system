import { useTeam } from '@/data/store'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { roleLabels } from '@/types/team'
import type { MemberStats } from './analytics-data'
import { usd } from './format'

const percent = (value: number) => `${Math.round(value)}%`

// Колонки одни и те же для таблицы админа и для «Моих результатов»
const columns: { key: keyof MemberStats; label: string; hint?: string; format?: (v: number) => string }[] = [
  { key: 'created', label: 'Quotations' },
  { key: 'won', label: 'Won', hint: 'A shipment was created from the quotation' },
  { key: 'failed', label: 'Failed', hint: 'The customer did not take our offer' },
  { key: 'cancelled', label: 'Cancelled', hint: 'We turned the request down ourselves' },
  { key: 'conversion', label: 'Conversion', hint: 'Won out of won + failed', format: percent },
  { key: 'shipments', label: 'Shipments' },
  { key: 'closed', label: 'Completed' },
  { key: 'revenue', label: 'Revenue', format: usd },
  { key: 'profit', label: 'Gross profit', format: usd },
  { key: 'margin', label: 'Margin', format: percent },
]

// Таблица по сотрудникам: видит только админ
export function TeamResultsTable({ members }: { members: MemberStats[] }) {
  const team = useTeam()
  // Все из команды, даже без котировок за период, плюс авторы, которых уже нет в команде
  const rows = [
    ...team.map((m) => ({ name: m.name, role: t(roleLabels[m.role]), stats: findStats(members, m.email) })),
    ...members
      .filter((s) => s.email && !team.some((m) => m.email.toLowerCase() === s.email))
      .map((s) => ({ name: s.email, role: t('Former member'), stats: s })),
  ].sort((a, b) => b.stats.revenue - a.stats.revenue || b.stats.created - a.stats.created)

  return (
    <>
      {/* Телефон: карточка на сотрудника, без горизонтального скролла */}
      <ul className="space-y-3 md:hidden" data-testid="team-results-cards">
        {rows.map((row) => (
          <li key={row.name} className="rounded-lg border p-3">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.role}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-semibold tabular-nums">{usd(row.stats.revenue)}</div>
                <div className="text-xs text-muted-foreground">{t('Revenue')}</div>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
              {columns
                .filter((c) => c.key !== 'revenue')
                .map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="truncate text-muted-foreground">{t(c.label)}</dt>
                    <dd
                      className={cn(
                        'font-medium tabular-nums',
                        c.key === 'failed' && row.stats.failed > 0 && 'text-destructive',
                      )}
                    >
                      {(c.format ?? String)(row.stats[c.key] as number)}
                    </dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-sm" data-testid="team-results">
          <thead>
            <tr className="border-y bg-muted/50 text-xs text-muted-foreground">
              <th className="px-5 py-2 text-left font-medium">{t('Member')}</th>
              {columns.map((c) => (
                <th key={c.key} title={c.hint ? t(c.hint) : undefined} className="px-3 py-2 text-right font-medium">
                  {t(c.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b last:border-0">
                <td className="px-5 py-2.5">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.role}</div>
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-3 py-2.5 text-right tabular-nums',
                      c.key === 'failed' && row.stats.failed > 0 && 'text-destructive',
                      !row.stats[c.key] && 'text-muted-foreground',
                    )}
                  >
                    {(c.format ?? String)(row.stats[c.key] as number)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// Плитки «Мои результаты»: сотрудник видит только свои цифры
export function MyResults({ stats }: { stats: MemberStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="my-results">
      {columns.map((c) => (
        <div key={c.key} className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="text-xs text-muted-foreground">{t(c.label)}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {(c.format ?? String)(stats[c.key] as number)}
          </div>
          {c.hint && <div className="mt-1 text-xs text-muted-foreground">{t(c.hint)}</div>}
        </div>
      ))}
    </div>
  )
}

export function findStats(members: MemberStats[], email = ''): MemberStats {
  return (
    members.find((s) => s.email === email.toLowerCase()) ?? {
      email,
      created: 0,
      won: 0,
      failed: 0,
      cancelled: 0,
      open: 0,
      conversion: 0,
      shipments: 0,
      closed: 0,
      revenue: 0,
      profit: 0,
      margin: 0,
    }
  )
}
