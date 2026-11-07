import { getSettings } from '@/data/settings'
import { t } from '@/i18n'

// Форматирование для таблиц и карточек. Всё в одном месте, чтобы формат был везде одинаковым.

// Дата на языке интерфейса: в английском «18 Nov 2026», в русском «18.11.2026»
const dateOptions: Record<'en' | 'ru', [string, Intl.DateTimeFormatOptions]> = {
  en: ['en-GB', { day: '2-digit', month: 'short', year: 'numeric' }],
  ru: ['ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }],
}
const formatters = new Map<string, Intl.DateTimeFormat>()
function formatter(withTime: boolean) {
  const language = getSettings().language
  const key = `${language}-${withTime}`
  let f = formatters.get(key)
  if (!f) {
    const [loc, options] = dateOptions[language] ?? dateOptions.en
    f = new Intl.DateTimeFormat(loc, withTime ? { ...options, hour: '2-digit', minute: '2-digit' } : options)
    formatters.set(key, f)
  }
  return f
}

// '2026-09-30' → '30 Sep 2026' / '30.09.2026'. Дата без времени — это местный день, а не полночь UTC
export function formatDate(iso?: string) {
  if (!iso) return '—'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return formatter(false).format(date)
}

export function formatDateTime(iso?: string) {
  return iso ? formatter(true).format(new Date(iso)) : '—'
}

// 24500 → '24 500 kg'
export function formatWeight(kg: number) {
  return `${new Intl.NumberFormat('ru-RU').format(kg)} kg`
}

export function formatMoney(value: number, currency: string) {
  return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ${currency}`
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)} %`
}

// «15 days» / «15-20 days» → на языке интерфейса. Старые записи в свободной форме показываем как есть
export function formatTransit(value?: string) {
  const days = value?.match(/^(\d+(?:-\d+)?) days$/)?.[1]
  return days ? t('{n} days', { n: days }) : value
}
