import { AlertTriangle, Bell, FileText, Truck } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { markAllRead, markRead, useReadIds, visibleNotifications, type NotificationKind } from '@/data/notifications'
import { useSettings } from '@/data/settings'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const kindIcon: Record<NotificationKind, { icon: typeof Bell; className: string }> = {
  status: { icon: Truck, className: 'bg-primary/10 text-primary' },
  quotation: { icon: FileText, className: 'bg-success/12 text-success' },
  border: { icon: AlertTriangle, className: 'bg-warning/15 text-warning' },
}

export function NotificationsMenu() {
  const settings = useSettings()
  const readIds = useReadIds()
  const items = visibleNotifications(settings)
  const unread = items.filter((n) => !readIds.has(n.id)).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="relative">
          <Bell />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">Notifications</div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground"
          >
            Mark all as read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-1">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications. You can turn them on in Settings.
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
                        {n.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{n.description}</span>
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
            <Link to="/settings">Notification settings</Link>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
