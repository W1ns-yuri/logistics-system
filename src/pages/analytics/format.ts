import { locale } from '@/i18n'

// $12 400 → $12.4k — для осей и плиток
export function usdShort(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `$${Math.round(value / 1000)}k`
  if (abs >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${Math.round(value)}`
}

export function usd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function monthLabel(month: string) {
  return new Intl.DateTimeFormat(locale(), { month: 'short', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  )
}
