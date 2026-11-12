import { useMemo, useSyncExternalStore } from 'react'

import { invoiceTotals } from '@/lib/calculation'
import type { Invoice } from '@/types/invoice'
import type { Quotation } from '@/types/quotation'
import { daysLate, type Shipment } from '@/types/shipment'
import type { Session } from './session'
import type { Settings } from './settings'

/*
 * Уведомления в колокольчике. Их не рассылает сервер: они считаются из тех же данных,
 * что видит человек (перевозки, котировки, инвойсы), поэтому работают и в демо, и в рабочей сборке,
 * и приходят всем коллегам после синхронизации (опрос каждые 15 секунд).
 *
 * Что считается событием:
 * - перевозку перевёл в новый статус коллега (свои изменения не показываем);
 * - груз на границе или опаздывает (ETA прошла, а не доставлен);
 * - коллега создал новую котировку; срок действия котировки кончается через 2 дня;
 * - инвойс просрочен или срок оплаты через 3 дня (только тем, кто видит оплаты).
 */

export type NotificationKind = 'status' | 'quotation' | 'border' | 'payment'

export type AppNotification = {
  id: string
  kind: NotificationKind
  // Английский текст-ключ перевода и подстановки
  title: string
  titleParams?: Record<string, string | number>
  description: string
  descriptionParams?: Record<string, string | number>
  at: string // ISO
  link: string
}

const kindSetting: Record<NotificationKind, keyof Settings> = {
  status: 'notifyStatusChanges',
  quotation: 'notifyNewQuotations',
  border: 'notifyBorderDelays',
  payment: 'notifyPayments',
}

const DAY = 86_400_000
// Сколько дней назад событие ещё интересно
const RECENT_DAYS = 7
const STATUS_TEXT: Record<string, string> = {
  pending: 'Pending',
  loaded: 'Loaded',
  in_transit: 'In transit',
  at_border: 'At the border',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10)
const sameEmail = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()

export function buildNotifications(
  data: { shipments: Shipment[]; quotations: Quotation[]; invoices: Invoice[] },
  session: Pick<Session, 'email' | 'role'> | null,
  now = new Date(),
): AppNotification[] {
  if (!session) return []
  const me = session.email
  const since = now.getTime() - RECENT_DAYS * DAY
  const today = isoDay(now)
  const inDays = (n: number) => isoDay(new Date(now.getTime() + n * DAY))
  const list: AppNotification[] = []

  for (const s of data.shipments) {
    const route = `${s.collectionAddress} → ${s.deliveryAddress}`
    // Свежие шаги перевозки, сделанные не мной
    for (const event of s.history.slice(1)) {
      const at = Date.parse(event.at)
      if (!(at >= since) || sameEmail(event.by, me)) continue
      if (!event.by && sameEmail(s.createdBy, me)) continue // старые шаги без автора: свои перевозки не дёргаем
      list.push({
        id: `ship:${s.id}:${event.status}:${event.at}`,
        kind: event.status === 'at_border' ? 'border' : 'status',
        title: '{number}: {status}',
        titleParams: { number: s.number, status: STATUS_TEXT[event.status] ?? event.status },
        description: event.note || route,
        at: event.at,
        link: `/shipments/${s.id}`,
      })
    }
    const late = daysLate(s, now)
    if (late > 0 && s.eta) {
      list.push({
        id: `late:${s.id}:${s.eta}`,
        kind: 'border',
        title: '{number} is {n} days late',
        titleParams: { number: s.number, n: late },
        description: route,
        at: new Date(Date.parse(s.eta) + DAY).toISOString(),
        link: `/shipments/${s.id}`,
      })
    }
  }

  for (const q of data.quotations) {
    if (!sameEmail(q.createdBy, me) && q.createdAt && Date.parse(q.createdAt) >= since && session.role !== 'accountant') {
      list.push({
        id: `q-new:${q.id}`,
        kind: 'quotation',
        title: 'New quotation {reference}',
        titleParams: { reference: q.reference },
        description: '{customer} · {by}',
        descriptionParams: { customer: q.customer, by: q.createdBy ?? '' },
        at: q.createdAt,
        link: `/quotations/${q.id}`,
      })
    }
    // Срок котировки кончается: напоминаем автору (и админу), пока клиент не ответил
    const mine = sameEmail(q.createdBy, me) || session.role === 'admin'
    if (mine && q.validTo && (q.status === 'in_progress' || q.status === 'completed')) {
      if (q.validTo >= today && q.validTo <= inDays(2)) {
        list.push({
          id: `q-exp:${q.id}:${q.validTo}`,
          kind: 'quotation',
          title: 'Quotation {reference} expires soon',
          titleParams: { reference: q.reference },
          description: '{customer} · valid until {date}',
          descriptionParams: { customer: q.customer, date: q.validTo },
          at: `${q.validTo}T00:00:00`,
          link: `/quotations/${q.id}`,
        })
      }
    }
  }

  // Деньги видят админ и бухгалтер
  if (session.role !== 'employee') {
    for (const inv of data.invoices) {
      if (inv.status === 'draft' || inv.status === 'paid') continue
      const { balanceDue } = invoiceTotals(inv)
      if (balanceDue <= 0.005) continue
      if (inv.dueDate < today) {
        list.push({
          id: `inv-overdue:${inv.id}:${inv.dueDate}`,
          kind: 'payment',
          title: 'Invoice {number} is overdue',
          titleParams: { number: inv.number },
          description: '{customer} · {amount} due',
          descriptionParams: { customer: inv.billTo, amount: balanceDue, currency: inv.currency },
          at: `${inv.dueDate}T23:59:00`,
          link: `/payments/${inv.id}`,
        })
      } else if (inv.dueDate <= inDays(3)) {
        list.push({
          id: `inv-due:${inv.id}:${inv.dueDate}`,
          kind: 'payment',
          title: 'Invoice {number} is due soon',
          titleParams: { number: inv.number },
          description: '{customer} · {amount} due',
          descriptionParams: { customer: inv.billTo, amount: balanceDue, currency: inv.currency },
          at: `${today}T00:00:00`,
          link: `/payments/${inv.id}`,
        })
      }
    }
  }

  return list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50)
}

// Показываем только типы, включённые в настройках
export const visibleNotifications = (items: AppNotification[], settings: Settings) =>
  items.filter((n) => settings[kindSetting[n.kind]] !== false)

/* ---------- Прочитанные: личное, хранится в этом браузере ---------- */

const READ_KEY = 'notifications-read'
const MAX_READ = 500

function loadRead(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    // нет localStorage — помним до перезагрузки
  }
  return new Set()
}

let readIds = loadRead()
const listeners = new Set<() => void>()

function save(next: Set<string>) {
  readIds = next
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...next].slice(-MAX_READ)))
  } catch {
    // не сохранилось — не страшно
  }
  listeners.forEach((listener) => listener())
}

export function useReadIds() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => readIds,
  )
}

export const markRead = (id: string) => save(new Set(readIds).add(id))
export const markAllRead = (ids: string[]) => save(new Set([...readIds, ...ids]))

// Список уведомлений для текущего человека; пересчитывается, когда меняются данные
export function useNotificationList(
  data: { shipments: Shipment[]; quotations: Quotation[]; invoices: Invoice[] },
  session: Pick<Session, 'email' | 'role'> | null,
  settings: Settings,
) {
  const { shipments, quotations, invoices } = data
  const email = session?.email
  const role = session?.role
  return useMemo(
    () =>
      visibleNotifications(
        buildNotifications({ shipments, quotations, invoices }, email && role ? { email, role } : null),
        settings,
      ),
    [shipments, quotations, invoices, email, role, settings],
  )
}
