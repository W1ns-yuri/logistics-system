import { Link } from 'react-router'

import { LateBadge } from '@/components/late-badge'
import { shipmentStatuses } from '@/components/status-badge'
import { TransportModeIcon } from '@/components/transport-mode'
import { t } from '@/i18n'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SHIPMENT_STATUSES, daysLate, type Shipment } from '@/types/shipment'

/*
 * Доска перевозок: колонка на каждый статус, в ней карточки.
 * На телефоне колонки идут одна под другой (без горизонтальной прокрутки), на компьютере — в ряд.
 * Отменённые на доске не показываем: они ничего не ждут.
 */
const COMPLETED_ON_BOARD = 10

export function ShipmentBoard({ shipments }: { shipments: Shipment[] }) {
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
      data-testid="shipment-board"
    >
      {SHIPMENT_STATUSES.map((status) => {
        const all = shipments.filter((s) => s.status === status)
        // Закрытых со временем сотни: на доске только 10 последних, остальные в таблице.
        // В остальных колонках опаздывающие сверху, дальше по ETA
        const list =
          status === 'completed'
            ? [...all].sort((a, b) => (b.eta ?? '').localeCompare(a.eta ?? '')).slice(0, COMPLETED_ON_BOARD)
            : all.sort((a, b) => daysLate(b) - daysLate(a) || (a.eta ?? '').localeCompare(b.eta ?? ''))
        return (
          <section key={status} className="flex min-w-0 flex-col rounded-xl border bg-muted/30" data-status={status}>
            <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <h2 className="truncate text-sm font-medium">{t(shipmentStatuses[status].label)}</h2>
              <span className="rounded-full bg-background px-2 text-xs font-medium tabular-nums">{all.length}</span>
            </header>
            <ul className="space-y-2 p-2">
              {list.length === 0 && (
                <li className="px-1 py-3 text-center text-xs text-muted-foreground">{t('Empty')}</li>
              )}
              {list.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/shipments/${s.id}`}
                    className={cn(
                      'block rounded-lg border bg-card p-3 text-sm shadow-xs transition-colors hover:border-primary/50',
                      daysLate(s) > 0 && 'border-destructive/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-primary">{s.number}</span>
                      <TransportModeIcon mode={s.mode} className="size-4 text-muted-foreground" />
                    </div>
                    <div className="mt-1 truncate font-medium">{s.customer}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.collectionAddress} → {s.deliveryAddress}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
                      <span className="text-muted-foreground tabular-nums">ETA {formatDate(s.eta)}</span>
                      <LateBadge shipment={s} />
                    </div>
                  </Link>
                </li>
              ))}
              {all.length > list.length && (
                <li className="px-1 pt-1 text-center text-xs text-muted-foreground">
                  {t('And {n} more in the table', { n: all.length - list.length })}
                </li>
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
