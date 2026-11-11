import { getSettings } from '@/data/settings'
import { ru } from './ru'

/*
 * Простейший перевод интерфейса.
 * Ключ — это английский текст: t('Shipments') вернёт «Шипменты» на русском или 'Shipments' на английском.
 * Если перевода нет, показываем английский — ничего не сломается.
 * При смене языка App перемонтирует роутер, поэтому все страницы перерисуются с новым языком.
 */

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
] as const
export type Language = (typeof LANGUAGES)[number]['value']

const dictionaries: Record<Language, Record<string, string>> = { en: {}, ru }

// Язык документа на печать (PDF котировки или инвойса) может отличаться от языка интерфейса:
// страница печати открывается в своей вкладке и ставит его здесь, настройки человека не трогаем
let documentLanguage: Language | null = null
export function setDocumentLanguage(language: Language | null) {
  documentLanguage = language
}
export const isLanguage = (value: unknown): value is Language => LANGUAGES.some((l) => l.value === value)

// Язык, на котором сейчас пишем: документа, если он задан, иначе интерфейса
export function currentLanguage(): Language {
  return documentLanguage ?? getSettings().language
}

// t('{n} shipments', { n: 5 }) → '5 shipments'
export function t(key: string, vars?: Record<string, string | number>) {
  const text = dictionaries[currentLanguage()]?.[key] ?? key
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
}

// Локаль для дат и чисел
export function locale() {
  return currentLanguage() === 'ru' ? 'ru-RU' : 'en-GB'
}
