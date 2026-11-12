import { AlertTriangle, Bell, FileText, Truck, Wallet } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useSession } from '@/data/auth'
import { markAllRead, markRead, useNotificationList, useReadIds, type NotificationKind } from '@/data/notifications'
import { useSettings } from '@/data/settings'
import { useInvoices, useQuotations, useShipments } from '@/data/store'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

const kindIcon: Record<NotificationKind, { icon: typeof Bell; className: string }> = {
  status: { icon: Truck, className: 'bg-primary/10 text-primary' },
  quotation: { icon: FileText, className: 'bg-success/12 text-success' },
  border: { icon: AlertTriangle, className: 'bg-warning/15 text-warning-text' },
  payment: { icon: Wallet, className: 'bg-destructive/10 text-destructive' },
}

// Подстановки: даты — в формате языка, статусы — переводом
function texts(params?: Record<string, string | number>) {
  if (!params) return undefined
  const out: Record<string, string | number> = { ...params }
  if (typeof out.date === 'string') out.date = formatDate(out.date)
  if (typeof out.status === 'string') out.status = t(out.status)
  if (typeof out.amount === 'number') out.amount = formatMoney(out.amount, String(out.currency ?? ''))
  return out
}

export function NotificationsMenu() {
  const settings = useSettings()
  const session = useSession()
  const readIds = useReadIds()
  const items = useNotificationList(
    { shipments: useShipments(), quotations: useQuotations(), invoices: useInvoices() },
    session,
    settings,
  )
  const unread = items.filter((n) => !readIds.has(n.id)).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t('Notifications')} className="relative">
          <Bell />
          {unread > 0 && (
            <span
              data-testid="notifications-count"
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">{t('Notifications')}</div>
          <button
            type="button"
            onClick={() => markAllRead(items.map((n) => n.id))}
            disabled={unread === 0}
            className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground"
          >
            {t('Mark all as read')}
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-1">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('Nothing new. Here you will see shipment updates, quotations that expire and overdue invoices.')}
            </div>
          ) : (
            items.map((n) => {
              const { icon: Icon, className } = kindIcon[n.kind]
              const isUnread = !readIds.has(n.id)
              return (
                <DropdownMenuItem key={n.id} asChild className="items-start gap-3 px-3 py-2.5">
                  <Link to={n.link} onClick={() => markRead(n.id)}>
                    <span
                      className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', className)}
                    >
                      <Icon className="size-4 text-current" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', isUnread ? 'font-semibold' : 'font-medium')}>
                        {t(n.title, texts(n.titleParams))}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t(n.description, texts(n.descriptionParams))}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{formatDateTime(n.at)}</span>
                    </span>
                    {isUnread && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
                  </Link>
                </DropdownMenuItem>
              )
            })
          )}
        </div>
        <div className="border-t p-1">
          <DropdownMenuItem asChild className="justify-center text-xs text-muted-foreground">
            <Link to="/settings?tab=preferences">{t('Notification settings')}</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
