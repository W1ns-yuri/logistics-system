// Форматирование для таблиц и карточек. Всё в одном месте, чтобы формат был везде одинаковым.

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// '2026-09-30' → '30.09.2026'
export function formatDate(iso?: string) {
  return iso ? dateFormatter.format(new Date(iso)) : '—'
}

export function formatDateTime(iso?: string) {
  return iso ? dateTimeFormatter.format(new Date(iso)) : '—'
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
