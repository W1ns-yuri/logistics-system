// Тарифы платформы и помощники для дат. Отдельный файл, чтобы им пользовались и данные, и демо-генератор.

export const PLANS = ['trial', 'lite', 'lite_plus', 'standard'] as const
export type Plan = (typeof PLANS)[number]

/*
 * Тарифы с 16.11 (от заказчика). Внутренние id не меняли, чтобы не переделывать базу:
 * trial — Free (14 дней, всё доступно), lite — Basic ($15, с ограничениями), lite_plus — Lite ($20, без ограничений).
 * Standard пока не продаём: добавим позже с обновлениями, id оставлен на будущее.
 */
export const SOLD_PLANS: Plan[] = ['lite', 'lite_plus']
// Основной тариф: на него ведём людей (метка «Рекомендуем»)
export const RECOMMENDED_PLAN: Plan = 'lite_plus'

// Мест (сотрудников) по тарифу; null — без лимита. Больше — места сверх тарифа ставит владелец платформы
export const planSeats: Record<Plan, number | null> = { trial: 5, lite: 3, lite_plus: 5, standard: 10 }
export const planLabels: Record<Plan, string> = {
  trial: 'Free',
  lite: 'Basic',
  lite_plus: 'Lite',
  standard: 'Standard',
}
// Цена в месяц, USD — от заказчика (16.11)
export const planPrice: Record<Plan, number> = { trial: 0, lite: 15, lite_plus: 20, standard: 30 }

// Что входит в тариф. Пробный период — всё, чтобы клиент попробовал систему целиком
export type PlanFeatures = { analytics: boolean; memberResults: boolean; logo: boolean; export: boolean }
export const planFeatures: Record<Plan, PlanFeatures> = {
  trial: { analytics: true, memberResults: true, logo: true, export: true },
  lite: { analytics: false, memberResults: false, logo: false, export: false },
  lite_plus: { analytics: true, memberResults: true, logo: true, export: true },
  standard: { analytics: true, memberResults: true, logo: true, export: true },
}

// Сколько новых перевозок и котировок можно создать за календарный месяц; null — без лимита.
// Кончился лимит — нельзя только создавать новые, начатые заказы работают как обычно
export type MonthlyLimits = { shipments: number; quotations: number }
export const planLimits: Record<Plan, MonthlyLimits | null> = {
  trial: null,
  lite: { shipments: 30, quotations: 100 },
  lite_plus: null,
  standard: null,
}
// С какой доли лимита предупреждаем
export const LIMIT_WARNING = 0.8

// Бесплатный доступ для приглашённых компаний (до Нового года): после него ещё столько дней на оплату
export const PROMO_GRACE_DAYS = 3
// Скидка приглашённым компаниям на первый оплаченный месяц
export const PROMO_DISCOUNT = 0.3
export const DEFAULT_PROMO_UNTIL = '2026-12-31'

// Старые id тарифов (до 06.11) → новые, для данных, сохранённых в браузере
export const LEGACY_PLANS: Record<string, Plan> = { start: 'lite', business: 'lite_plus', enterprise: 'standard' }
export const upgradePlan = (plan: string): Plan => LEGACY_PLANS[plan] ?? (plan as Plan)

// Год стоит как 10 месяцев: два месяца в подарок
export const YEAR_PRICE_MONTHS = 10

export function paymentAmount(plan: Plan, months: number) {
  return planPrice[plan] * (months === 12 ? YEAR_PRICE_MONTHS : months)
}

// Первая оплата приглашённой компании: минус 30% от цены одного месяца
export const promoDiscount = (plan: Plan) => Math.round(planPrice[plan] * PROMO_DISCOUNT)

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
