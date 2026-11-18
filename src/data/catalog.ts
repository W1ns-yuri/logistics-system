import { useSyncExternalStore } from 'react'

import { currentLanguage, t } from '@/i18n'
import { api, API_MODE } from '@/lib/api'
import { INCOTERMS, EQUIPMENT_TYPES, equipmentByMode, TRANSPORT_MODES, type TransportMode } from '@/types/logistics'
import { documentTypeLabels } from '@/types/shipment'
import { vendorTypeLabels } from '@/types/directory'
import { lostReasonLabels } from '@/types/quotation'
import { paymentMethodLabels } from '@/types/invoice'

/*
 * Справочники, которые владелец платформы меняет сам, без программиста.
 * Встроенные значения живут в коде (их ключи уже лежат в записях компаний), владелец может:
 * переименовать их (en/ru), скрыть из выбора или добавить свои. Город — отдельный вид: английское и русское
 * название плюс страна. Рабочая сборка берёт список с сервера, демо хранит его в браузере.
 */
export const CATALOG_KINDS = ['city', 'equipment', 'document', 'vendor_type', 'lost_reason', 'payment_method', 'incoterm'] as const
export type CatalogKind = (typeof CATALOG_KINDS)[number]

export type CatalogItem = {
  kind: CatalogKind
  key: string
  labelEn: string
  labelRu: string
  // город — страна; тип транспорта — виды перевозки через запятую (air,sea)
  extra: string
  hidden: boolean
}

// Встроенные значения каждого справочника: ключ → английское название (переводится через t)
const identity = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, k]))
export const BUILT_IN: Record<Exclude<CatalogKind, 'city'>, Record<string, string>> = {
  equipment: identity(EQUIPMENT_TYPES),
  document: documentTypeLabels,
  vendor_type: vendorTypeLabels,
  lost_reason: lostReasonLabels,
  payment_method: paymentMethodLabels,
  incoterm: identity(INCOTERMS),
}

export const catalogKindLabels: Record<CatalogKind, string> = {
  city: 'Cities',
  equipment: 'Equipment types',
  document: 'Document types',
  vendor_type: 'Vendor types',
  lost_reason: 'Lost reasons',
  payment_method: 'Payment methods',
  incoterm: 'Incoterms',
}

const STORAGE_KEY = 'omni-catalog'
let items: CatalogItem[] = readLocal()
const listeners = new Set<() => void>()
let loaded = !API_MODE

function readLocal(): CatalogItem[] {
  if (API_MODE) return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CatalogItem[]
  } catch {
    return []
  }
}

function emit(next: CatalogItem[]) {
  items = next
  if (!API_MODE) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // нет места или приватный режим — справочник останется до перезагрузки
    }
  }
  listeners.forEach((listener) => listener())
}

// Рабочая сборка: подтягиваем справочники с сервера при старте и после изменений владельца
export function loadCatalog() {
  if (!API_MODE) return Promise.resolve()
  return api<{ items: CatalogItem[] }>('/api/catalog')
    .then((data) => {
      loaded = true
      emit(data.items)
    })
    .catch(() => {
      loaded = true // нет сети: работаем со встроенными значениями
      listeners.forEach((listener) => listener())
    })
}

export function useCatalog() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => items,
  )
}

// Рабочая сборка ждёт справочники при старте (один короткий запрос), чтобы списки сразу были полными
export function useCatalogReady() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => loaded,
  )
}

const findItem = (kind: CatalogKind, key: string) => items.find((i) => i.kind === kind && i.key === key)

// Название на языке интерфейса: правка владельца, иначе встроенный перевод, иначе сам ключ
export function catalogLabel(kind: CatalogKind, key: string) {
  const item = findItem(kind, key)
  const ru = currentLanguage() === 'ru'
  if (item) return (ru && item.labelRu) || item.labelEn
  if (kind === 'city') return key
  const builtIn = BUILT_IN[kind][key]
  return builtIn ? t(builtIn) : key
}

/*
 * Варианты для выпадающего списка: встроенные + свои, без скрытых.
 * current — значение, уже сохранённое в записи: его показываем, даже если владелец его скрыл.
 */
export function catalogOptions(kind: Exclude<CatalogKind, 'city'>, current?: string) {
  const builtIn = Object.keys(BUILT_IN[kind])
  const custom = items.filter((i) => i.kind === kind && !(i.key in BUILT_IN[kind])).map((i) => i.key)
  return [...builtIn, ...custom]
    .filter((key) => key === current || !findItem(kind, key)?.hidden)
    .map((key) => ({ value: key, label: catalogLabel(kind, key) }))
}

// Какие типы транспорта подходят к виду перевозки: встроенные по таблице, свои — по галочкам владельца
export function equipmentForMode(mode: TransportMode, current?: string) {
  return catalogOptions('equipment', current)
    .filter(({ value }) => {
      if (value === current) return true
      const item = findItem('equipment', value)
      if (item?.extra) return item.extra.split(',').includes(mode)
      return (equipmentByMode[mode] as string[]).includes(value)
    })
    .map(({ value }) => value)
}

export const equipmentModes = (key: string): TransportMode[] => {
  const item = findItem('equipment', key)
  if (item?.extra) return item.extra.split(',').filter((m): m is TransportMode => (TRANSPORT_MODES as readonly string[]).includes(m))
  return TRANSPORT_MODES.filter((mode) => (equipmentByMode[mode] as string[]).includes(key))
}

// Города, добавленные владельцем: английское название, русское и страна
export const catalogCities = () =>
  items.filter((i) => i.kind === 'city' && !i.hidden).map((i) => ({ city: i.key, ru: i.labelRu, country: i.extra }))

// Сохранить значение (новое или правку встроенного)
export async function saveCatalogItem(item: CatalogItem) {
  if (API_MODE) {
    await api(`/api/platform/catalog/${item.kind}/${encodeURIComponent(item.key)}`, {
      method: 'PUT',
      body: { labelEn: item.labelEn, labelRu: item.labelRu, extra: item.extra, hidden: item.hidden },
    })
  }
  emit([...items.filter((i) => !(i.kind === item.kind && i.key === item.key)), item])
}

// Удалить своё значение или вернуть встроенному исходный вид
export async function removeCatalogItem(kind: CatalogKind, key: string) {
  if (API_MODE) await api(`/api/platform/catalog/${kind}/${encodeURIComponent(key)}`, { method: 'DELETE' })
  emit(items.filter((i) => !(i.kind === kind && i.key === key)))
}
