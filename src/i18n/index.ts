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

// Английский текст ключа годится почти везде; здесь только формы для «1 invoice» / «2 invoices»
const en: Record<string, string> = {
  '{n} invoices': '{n} invoice|{n} invoices',
  '{n} invoices past due date': '{n} invoice past due date|{n} invoices past due date',
  '{n} quotations': '{n} quotation|{n} quotations',
  '{n} days': '{n} day|{n} days',
}
const dictionaries: Record<Language, Record<string, string>> = { en, ru }

// Формы числа через «|»: в английском две (1 / много), в русском три (1 инвойс / 2 инвойса / 5 инвойсов)
const ORDER: Record<Language, Intl.LDMLPluralRule[]> = { en: ['one', 'other'], ru: ['one', 'few', 'many'] }
function pickForm(text: string, n: number, language: Language) {
  const forms = text.split('|')
  const index = ORDER[language].indexOf(new Intl.PluralRules(language).select(n))
  return forms[index] ?? forms[forms.length - 1]!
}

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
  const language = currentLanguage()
  let text = dictionaries[language]?.[key] ?? key
  if (!vars) return text
  if (text.includes('|') && typeof vars.n === 'number') text = pickForm(text, vars.n, language)
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
}

// Локаль для дат и чисел
export function locale() {
  return currentLanguage() === 'ru' ? 'ru-RU' : 'en-GB'
}
