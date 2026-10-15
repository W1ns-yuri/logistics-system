import type { Currency } from '@/types/logistics'

// Демо-курсы, чтобы сложить инвойсы в разных валютах в одну сумму.
// Настоящие курсы (и валюту отчётов) уточняем у заказчика.
export const USD_RATES: Record<Currency, number> = {
  USD: 1,
  TMT: 1 / 3.5, // официальный курс: 3.5 маната за доллар
  EUR: 1.08,
}

export function toUSD(value: number, currency: string) {
  return value * (USD_RATES[currency as Currency] ?? 1)
}
