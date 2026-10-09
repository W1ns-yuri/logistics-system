import { useSyncExternalStore } from 'react'

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
  userName: string
  userRole: string
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
  userName: 'Yuri W.',
  userRole: 'Operations manager',
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
