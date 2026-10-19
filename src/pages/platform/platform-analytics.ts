import { licenseStatus, periodEnd, todayIso, type Company, type Plan } from '@/data/platform'

/*
 * Цифры для дашборда владельца платформы: сколько денег пришло, сколько новых компаний,
 * сколько из пробного периода стали платить и кто скоро должен продлить лицензию.
 */

const monthKey = (iso: string) => iso.slice(0, 7)

function lastMonths(count: number, today: string) {
  const [y, m] = today.split('-').map(Number) as [number, number]
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1))
    return d.toISOString().slice(0, 7)
  })
}

// Последний день месяца YYYY-MM
const monthEnd = (month: string) => periodEnd(`${month}-01`, 1)

const delta = (now: number, prev: number) => (prev ? ((now - prev) / prev) * 100 : undefined)

// MRR на дату: каждая оплата, которая покрывает эту дату, даёт свою сумму в пересчёте на месяц
function mrrAt(companies: Company[], date: string) {
  let sum = 0
  for (const c of companies) {
    if (c.blocked) continue
    for (const p of c.payments) {
      if (p.from <= date && date <= periodEnd(p.from, p.months)) sum += p.amount / p.months
    }
  }
  return sum
}

export function buildPlatformAnalytics(companies: Company[], today = todayIso()) {
  const months = lastMonths(12, today)
  const thisMonth = months.at(-1)!
  const prevMonth = months.at(-2)!

  const trend = months.map((month) => {
    const payments = companies.flatMap((c) => c.payments.map((p, i) => ({ ...p, first: i === 0 })))
    const inMonth = payments.filter((p) => monthKey(p.date) === month)
    const signups = companies.filter((c) => monthKey(c.createdAt) === month)
    return {
      month,
      revenue: inMonth.reduce((acc, p) => acc + p.amount, 0),
      // Первая оплата компании — деньги от новых клиентов
      newRevenue: inMonth.filter((p) => p.first).reduce((acc, p) => acc + p.amount, 0),
      signups: signups.length,
      converted: signups.filter((c) => c.payments.length > 0).length,
      // Для последнего месяца — на сегодня, иначе на конец месяца
      mrr: mrrAt(companies, month === thisMonth ? today : monthEnd(month)),
      paying: companies.filter((c) =>
        c.payments.some((p) => {
          const at = month === thisMonth ? today : monthEnd(month)
          return p.from <= at && at <= periodEnd(p.from, p.months)
        }),
      ).length,
    }
  })
  const now = trend.at(-1)!
  const prev = trend.at(-2)!

  const rows = companies.map((c) => ({
    company: c,
    status: licenseStatus(c, today),
    revenue: c.payments.reduce((acc, p) => acc + p.amount, 0),
  }))
  const paying = rows.filter((r) => r.company.plan !== 'trial' && (r.status === 'active' || r.status === 'expiring'))

  // Пробный период уже закончился: сколько из них заплатили хотя бы раз
  const trialDone = rows.filter((r) => r.company.payments.length > 0 || r.status !== 'trial')
  const conversion = trialDone.length
    ? (trialDone.filter((r) => r.company.payments.length > 0).length / trialDone.length) * 100
    : 0
  const churned = rows.filter((r) => r.company.payments.length > 0 && r.status === 'expired')

  const planCounts = (['start', 'business', 'enterprise'] as Plan[]).map((plan) => ({
    plan,
    count: paying.filter((r) => r.company.plan === plan).length,
  }))
  const onTrial = rows.filter((r) => r.status === 'trial').length

  const byCountry = new Map<string, number>()
  for (const r of rows) byCountry.set(r.company.country, (byCountry.get(r.company.country) ?? 0) + r.revenue)

  // Кто должен продлить в ближайшие 14 дней, и кто уже просрочил (последние 30 дней)
  const renewals = rows
    .filter((r) => r.status !== 'blocked')
    .map((r) => ({ ...r, left: Math.round((Date.parse(r.company.paidUntil) - Date.parse(today)) / 86_400_000) }))
    .filter((r) => r.left <= 14 && r.left >= -30)
    .sort((a, b) => a.left - b.left)

  return {
    trend,
    kpis: {
      mrr: { value: now.mrr, delta: delta(now.mrr, prev.mrr) },
      revenue: { value: now.revenue, delta: delta(now.revenue, prev.revenue), month: thisMonth, prevMonth },
      signups: { value: now.signups, delta: delta(now.signups, prev.signups) },
      paying: { value: paying.length, delta: delta(now.paying, prev.paying) },
    },
    totalRevenue: trend.reduce((acc, p) => acc + p.revenue, 0),
    conversion,
    churned: churned.length,
    planCounts,
    onTrial,
    topCompanies: [...rows].sort((a, b) => b.revenue - a.revenue).filter((r) => r.revenue > 0),
    countries: [...byCountry.entries()]
      .map(([country, revenue]) => ({ country, revenue }))
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue),
    renewals,
  }
}
