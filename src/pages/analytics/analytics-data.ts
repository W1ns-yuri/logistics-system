import { invoiceTotals, quotationTotals } from '@/lib/calculation'
import { toUSD } from '@/lib/currency'
import type { Vendor } from '@/types/directory'
import type { Invoice } from '@/types/invoice'
import type { TransportMode } from '@/types/logistics'
import type { Quotation } from '@/types/quotation'
import type { Shipment, ShipmentStatus } from '@/types/shipment'

/*
 * Все расчёты для страницы аналитики. Деньги сводим в USD по демо-курсу.
 * Выручка и прибыль шипмента = доход и прибыль из калькуляции его котировки.
 */

export const PERIODS = [
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
] as const
export type Period = (typeof PERIODS)[number]['value']

export type MonthPoint = { month: string; revenue: number; profit: number; shipments: number }

const monthKey = (iso: string) => iso.slice(0, 7)

// Список месяцев 'YYYY-MM', заканчивая текущим
function lastMonths(count: number, today: Date) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (count - 1 - i), 1))
    return d.toISOString().slice(0, 7)
  })
}

export function buildAnalytics({
  period,
  quotations,
  shipments,
  invoices,
  vendors,
  today = new Date(),
}: {
  period: Period
  quotations: Quotation[]
  shipments: Shipment[]
  invoices: Invoice[]
  vendors: Vendor[]
  today?: Date
}) {
  const quotationById = new Map(quotations.map((q) => [q.id, q]))
  const money = (s: Shipment) => {
    const q = s.quotationId ? quotationById.get(s.quotationId) : undefined
    if (!q) return { revenue: 0, profit: 0 }
    const { income, profit } = quotationTotals(q)
    return { revenue: toUSD(income, q.currency), profit: toUSD(profit, q.currency) }
  }

  const months = lastMonths(period, today)
  const previousMonths = lastMonths(period * 2, today).slice(0, period)
  const live = shipments.filter((s) => s.status !== 'cancelled')
  const inPeriod = live.filter((s) => months.includes(monthKey(s.orderDate)))
  const inPrevious = live.filter((s) => previousMonths.includes(monthKey(s.orderDate)))

  // Помесячный тренд
  const trend: MonthPoint[] = months.map((month) => {
    const list = live.filter((s) => monthKey(s.orderDate) === month)
    return list.reduce(
      (acc, s) => {
        const m = money(s)
        acc.revenue += m.revenue
        acc.profit += m.profit
        acc.shipments += 1
        return acc
      },
      { month, revenue: 0, profit: 0, shipments: 0 },
    )
  })

  const sumMoney = (list: Shipment[]) =>
    list.reduce(
      (acc, s) => {
        const m = money(s)
        acc.revenue += m.revenue
        acc.profit += m.profit
        return acc
      },
      { revenue: 0, profit: 0 },
    )
  const current = sumMoney(inPeriod)
  const previous = sumMoney(inPrevious)
  const margin = current.revenue ? (current.profit / current.revenue) * 100 : 0
  const previousMargin = previous.revenue ? (previous.profit / previous.revenue) * 100 : 0
  // Сравниваем с прошлым периодом, только если за него есть данные по каждому месяцу —
  // иначе получаются бессмысленные +1000%
  const previousComplete = previousMonths.every((m) => live.some((s) => monthKey(s.orderDate) === m))
  const delta = (now: number, before: number) =>
    previousComplete && before ? ((now - before) / before) * 100 : undefined

  const kpis = {
    revenue: { value: current.revenue, delta: delta(current.revenue, previous.revenue) },
    profit: { value: current.profit, delta: delta(current.profit, previous.profit) },
    // Для маржи изменение — в процентных пунктах
    margin: { value: margin, delta: previousComplete && previous.revenue ? margin - previousMargin : undefined },
    shipments: { value: inPeriod.length, delta: delta(inPeriod.length, inPrevious.length) },
  }

  // Виды транспорта
  const modes = (['road', 'sea', 'air', 'rail'] as TransportMode[]).map((mode) => ({
    mode,
    count: inPeriod.filter((s) => s.mode === mode).length,
  }))

  // Топ клиентов по выручке
  const customerMap = new Map<string, { revenue: number; profit: number; shipments: number }>()
  for (const s of inPeriod) {
    const m = money(s)
    const row = customerMap.get(s.customer) ?? { revenue: 0, profit: 0, shipments: 0 }
    row.revenue += m.revenue
    row.profit += m.profit
    row.shipments += 1
    customerMap.set(s.customer, row)
  }
  const customers = [...customerMap.entries()]
    .map(([name, row]) => ({ name, ...row }))
    .sort((a, b) => b.revenue - a.revenue)

  // Топ направлений
  const routeMap = new Map<
    string,
    { from: string; to: string; mode: TransportMode; revenue: number; profit: number; shipments: number }
  >()
  for (const s of inPeriod) {
    const key = `${s.collectionAddress}→${s.deliveryAddress}`
    const m = money(s)
    const row = routeMap.get(key) ?? {
      from: s.collectionAddress,
      to: s.deliveryAddress,
      mode: s.mode,
      revenue: 0,
      profit: 0,
      shipments: 0,
    }
    row.revenue += m.revenue
    row.profit += m.profit
    row.shipments += 1
    routeMap.set(key, row)
  }
  const routes = [...routeMap.values()].sort((a, b) => b.shipments - a.shipments || b.revenue - a.revenue)

  // Вендоры: сколько шипментов вёз каждый
  const vendorRows = vendors
    .map((v) => ({ name: v.name, count: inPeriod.filter((s) => s.vendorId === v.id).length }))
    .filter((v) => v.count > 0)
    .sort((a, b) => b.count - a.count)

  // Воронка котировок за период
  const periodQuotations = quotations.filter((q) => months.includes(monthKey(q.createdAt)))
  const won = periodQuotations.filter((q) => q.status === 'shipment_created' || q.status === 'completed')
  const lost = periodQuotations.filter((q) => q.status === 'failed' || q.status === 'cancelled')
  const funnel = {
    created: periodQuotations.length,
    won: won.length,
    lost: lost.length,
    open: periodQuotations.length - won.length - lost.length,
    conversion: won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : 0,
  }

  // Дебиторка: кто сколько должен прямо сейчас, по срокам просрочки
  const todayIso = today.toISOString().slice(0, 10)
  const daysLate = (due: string) => Math.floor((Date.parse(todayIso) - Date.parse(due)) / 86_400_000)
  const buckets = [
    { key: 'current', label: 'Not due yet', amount: 0, count: 0 },
    { key: 'late30', label: '1–30 days late', amount: 0, count: 0 },
    { key: 'late60', label: '31–60 days late', amount: 0, count: 0 },
    { key: 'late90', label: '60+ days late', amount: 0, count: 0 },
  ]
  for (const inv of invoices) {
    const balance = toUSD(invoiceTotals(inv).balanceDue, inv.currency)
    if (balance <= 0.5) continue
    const late = daysLate(inv.dueDate)
    const bucket = late <= 0 ? buckets[0] : late <= 30 ? buckets[1] : late <= 60 ? buckets[2] : buckets[3]
    bucket!.amount += balance
    bucket!.count += 1
  }
  const receivables = { buckets, total: buckets.reduce((acc, b) => acc + b.amount, 0) }

  // Что едет прямо сейчас
  const pipelineStatuses: ShipmentStatus[] = ['loaded', 'in_transit', 'at_border', 'delivered']
  const pipeline = pipelineStatuses.map((status) => ({
    status,
    count: shipments.filter((s) => s.status === status).length,
  }))

  return { months, trend, kpis, modes, customers, routes, vendors: vendorRows, funnel, receivables, pipeline }
}

export type Analytics = ReturnType<typeof buildAnalytics>
