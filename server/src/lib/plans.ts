// Тарифы и даты лицензии — те же правила, что в интерфейсе (src/data/plans.ts)
export const PLANS = ['trial', 'lite', 'lite_plus', 'standard'] as const
export type Plan = (typeof PLANS)[number]

// trial — Trial, lite — Basic, lite_plus — Lite. Standard пока не продаём (id на будущее)
export const SOLD_PLANS = ['lite', 'lite_plus'] as const
export const planSeats: Record<Plan, number> = { trial: 5, lite: 3, lite_plus: 5, standard: 10 }
export const planLabels: Record<Plan, string> = { trial: 'Trial', lite: 'Basic', lite_plus: 'Lite', standard: 'Standard' }
export const planPrice: Record<Plan, number> = { trial: 0, lite: 15, lite_plus: 20, standard: 30 }
// Новых перевозок и котировок за календарный месяц; null — без лимита
export const planLimits: Record<Plan, { shipments: number; quotations: number } | null> = {
  trial: null,
  lite: { shipments: 30, quotations: 100 },
  lite_plus: null,
  standard: null,
}
// Приглашённая компания: после бесплатного доступа ещё столько дней на оплату
export const PROMO_GRACE_DAYS = 3
// Год стоит как 10 месяцев
export const paymentAmount = (plan: Plan, months: number) => planPrice[plan] * (months === 12 ? 10 : months)

// Сколько человек может быть в команде: места тарифа плюс добавленные владельцем
export const seatLimit = (company: { plan: string; extraSeats?: number | null }) =>
  planSeats[company.plan as Plan] + (company.extraSeats ?? 0)

export const TRIAL_DAYS = 14
const DAY = 24 * 60 * 60 * 1000
export const isoDate = (date: Date) => date.toISOString().slice(0, 10)
export const todayIso = () => isoDate(new Date())
export const addDays = (from: string | Date, days: number) => isoDate(new Date(new Date(from).getTime() + days * DAY))
export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY)

export function periodEnd(from: string, months: number) {
  const end = new Date(from)
  end.setUTCMonth(end.getUTCMonth() + months)
  return addDays(end, -1)
}

export type LicenseState = 'blocked' | 'expired' | 'active'

// Истекла — данные видны, но менять нельзя. Заблокирована — в рабочее пространство не пускаем
export function licenseState(company: { blocked: boolean; paidUntil: string }): LicenseState {
  if (company.blocked) return 'blocked'
  return daysBetween(todayIso(), company.paidUntil) < 0 ? 'expired' : 'active'
}
