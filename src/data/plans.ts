// Тарифы платформы и помощники для дат. Отдельный файл, чтобы им пользовались и данные, и демо-генератор.

export const PLANS = ['trial', 'lite', 'lite_plus', 'standard'] as const
export type Plan = (typeof PLANS)[number]

// Мест (сотрудников) по тарифу; null — без лимита. Lite+ обещаем «5–7», лимит ставим по верхней границе
export const planSeats: Record<Plan, number | null> = { trial: 3, lite: 3, lite_plus: 7, standard: 10 }
export const planLabels: Record<Plan, string> = {
  trial: 'Trial',
  lite: 'Lite',
  lite_plus: 'Lite+',
  standard: 'Standard',
}
// Цена в месяц, USD — от клиента (07.11)
export const planPrice: Record<Plan, number> = { trial: 0, lite: 10, lite_plus: 15, standard: 20 }

// Старые id тарифов (до 06.11) → новые, для данных, сохранённых в браузере
export const LEGACY_PLANS: Record<string, Plan> = { start: 'lite', business: 'lite_plus', enterprise: 'standard' }
export const upgradePlan = (plan: string): Plan => LEGACY_PLANS[plan] ?? (plan as Plan)

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
