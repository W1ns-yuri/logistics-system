// Тарифы платформы и помощники для дат. Отдельный файл, чтобы им пользовались и данные, и демо-генератор.

export const PLANS = ['trial', 'start', 'business', 'enterprise'] as const
export type Plan = (typeof PLANS)[number]

// Мест (сотрудников) по тарифу; null — без лимита
export const planSeats: Record<Plan, number | null> = { trial: 3, start: 5, business: 15, enterprise: null }
export const planLabels: Record<Plan, string> = {
  trial: 'Trial',
  start: 'Start',
  business: 'Business',
  enterprise: 'Enterprise',
}
// Цена в месяц, USD. Примерные цифры для прототипа, обсудим с клиентом
export const planPrice: Record<Plan, number> = { trial: 0, start: 49, business: 129, enterprise: 299 }
// Год стоит как 10 месяцев: два месяца в подарок
export const YEAR_PRICE_MONTHS = 10

export function paymentAmount(plan: Plan, months: number) {
  return planPrice[plan] * (months === 12 ? YEAR_PRICE_MONTHS : months)
}

export const TRIAL_DAYS = 14

const DAY = 24 * 60 * 60 * 1000
export const isoDate = (date: Date) => date.toISOString().slice(0, 10)
export const todayIso = () => isoDate(new Date())
export const addDays = (from: string | Date, days: number) => isoDate(new Date(new Date(from).getTime() + days * DAY))
export const daysBetween = (from: string, to: string) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY)

// Конец периода в N месяцев, начиная с from (включительно): 01.10 + 1 мес → 31.10
export function periodEnd(from: string, months: number) {
  const end = new Date(from)
  end.setUTCMonth(end.getUTCMonth() + months)
  return addDays(end, -1)
}
