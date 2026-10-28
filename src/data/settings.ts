import { useSyncExternalStore } from 'react'

import type { Language } from '@/i18n'
import type { Currency } from '@/types/logistics'

/*
 * Настройки приложения. Хранятся в localStorage браузера,
 * поэтому переживают перезагрузку страницы (в отличие от мок-данных).
 */

export type Theme = 'light' | 'dark' | 'system'

export type Settings = {
  companyName: string
  companyTagline: string
  companyAddress: string
  companyEmail: string
  companyPhone: string
  // Реквизиты для документов: заполняются после регистрации в Settings
  companyTaxId: string
  companyWebsite: string
  // Первые буквы номера документов: компания Win Fin → WF000001
  documentPrefix: string
  language: Language
  defaultCurrency: Currency
  quotationValidityDays: number
  theme: Theme
  notifyStatusChanges: boolean
  notifyNewQuotations: boolean
  notifyBorderDelays: boolean
}

export const defaultSettings: Settings = {
  companyName: 'Logistics',
  companyTagline: 'Forwarding suite',
  companyAddress: 'Ashgabat, Turkmenistan',
  companyEmail: 'info@company.com',
  companyPhone: '+993 00 000000',
  companyTaxId: '',
  companyWebsite: '',
  documentPrefix: 'AT',
  language: 'en',
  defaultCurrency: 'USD',
  quotationValidityDays: 14,
  theme: 'system',
  notifyStatusChanges: true,
  notifyNewQuotations: true,
  notifyBorderDelays: true,
}

const STORAGE_KEY = 'settings'

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // Сливаем с дефолтами: если позже добавим новое поле, старые сохранения не сломаются
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    // localStorage недоступен или там мусор — просто берём дефолты
  }
  return defaultSettings
}

let settings = load()
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Для кода вне компонентов (перевод, нумерация)
export function getSettings() {
  return settings
}

export function useSettings() {
  return useSyncExternalStore(subscribe, () => settings)
}

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // не сохранилось — настройки будут жить до перезагрузки
  }
  listeners.forEach((listener) => listener())
}

export function resetSettings() {
  updateSettings(defaultSettings)
}

// Инициалы для аватарки: "Yuri W." → "YW"
export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  )
}

// Кириллицу в номерах не используем (номера уходят в документы за границу): переводим в латиницу
const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ы: 'y',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ä: 'a',
  ç: 'c',
  ň: 'n',
  ö: 'o',
  ş: 's',
  ü: 'u',
  ý: 'y',
  ž: 'z',
}
const latin = (text: string) => [...text.toLowerCase()].map((ch) => TRANSLIT[ch] ?? ch).join('')

// Префикс номера из названия компании: "Win Fin" → "WF", "Logistics" → "LO", "Ак Йол" → "AY"
export function prefixFromName(name: string) {
  const [first = 'XX', second] = latin(name).match(/[a-z]+/g) ?? []
  const letters = second ? first.charAt(0) + second.charAt(0) : first.slice(0, 2)
  return letters.toUpperCase().padEnd(2, 'X')
}
