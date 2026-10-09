import { useSyncExternalStore } from 'react'

import type { Customer, Vendor } from '@/types/directory'
import type { Invoice } from '@/types/invoice'
import type { Quotation } from '@/types/quotation'
import type { Shipment, ShipmentStatus } from '@/types/shipment'
import { mockCustomers } from './customers'
import { mockInvoices } from './invoices'
import { mockQuotations } from './quotations'
import { mockShipments } from './shipments'
import { mockVendors } from './vendors'

/*
 * Временная «база данных» в памяти браузера.
 * Компоненты подписываются через хуки ниже и перерисовываются при изменениях.
 * После перезагрузки страницы всё сбрасывается к мок-данным — это нормально, пока нет бэкенда.
 * Когда появится API, заменим этот файл, а страницы трогать почти не придётся.
 */

type State = {
  quotations: Quotation[]
  shipments: Shipment[]
  customers: Customer[]
  vendors: Vendor[]
  invoices: Invoice[]
}

let state: State = {
  quotations: mockQuotations,
  shipments: mockShipments,
  customers: mockCustomers,
  vendors: mockVendors,
  invoices: mockInvoices,
}
const listeners = new Set<() => void>()

function setState(update: (prev: State) => State) {
  state = update(state)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

// AT000010 → следующий номер AT000011
function nextNumber(prefix: string, existing: string[]) {
  const max = existing.reduce((acc, ref) => Math.max(acc, Number(ref.replace(prefix, '')) || 0), 0)
  return prefix + String(max + 1).padStart(6, '0')
}

const today = () => new Date().toISOString().slice(0, 10)

/* ---------- Quotations ---------- */

export const useQuotations = () => useStore((s) => s.quotations)
export const useQuotation = (id?: string) => useStore((s) => s.quotations.find((q) => q.id === id))

export function copyQuotation(id: string) {
  const source = state.quotations.find((q) => q.id === id)
  if (!source) return
  const copy: Quotation = {
    ...source,
    id: crypto.randomUUID(),
    reference: nextNumber(
      'AT',
      state.quotations.map((q) => q.reference),
    ),
    status: 'in_progress',
    createdAt: today(),
  }
  setState((s) => ({ ...s, quotations: [copy, ...s.quotations] }))
  return copy
}

export function deleteQuotation(id: string) {
  setState((s) => ({ ...s, quotations: s.quotations.filter((q) => q.id !== id) }))
}

// Кнопка «Create shipment»: переносим маршрут и груз из котировки в новый шипмент
export function createShipmentFromQuotation(id: string) {
  const q = state.quotations.find((item) => item.id === id)
  if (!q) return
  const now = new Date().toISOString()
  const shipment: Shipment = {
    id: crypto.randomUUID(),
    number: nextNumber(
      'SH',
      state.shipments.map((s) => s.number),
    ),
    quotationId: q.id,
    mode: q.mode,
    customer: q.customer,
    collectionAddress: q.collectionAddress,
    deliveryAddress: q.deliveryAddress,
    orderDate: today(),
    equipment: q.equipment,
    transportQuantity: q.transportQuantity,
    cargoDescription: q.cargo.map((line) => `${line.pieces} ${line.packageType}`).join(', '),
    weightKg: q.weightKg,
    status: 'loaded',
    history: [{ status: 'loaded', at: now, note: `Created from quotation ${q.reference}` }],
  }
  setState((s) => ({
    ...s,
    quotations: s.quotations.map((item) => (item.id === id ? { ...item, status: 'shipment_created' } : item)),
    shipments: [shipment, ...s.shipments],
  }))
  return shipment
}

/* ---------- Shipments ---------- */

export const useShipments = () => useStore((s) => s.shipments)
export const useShipment = (id?: string) => useStore((s) => s.shipments.find((item) => item.id === id))

export function copyShipment(id: string) {
  const source = state.shipments.find((item) => item.id === id)
  if (!source) return
  const copy: Shipment = {
    ...source,
    id: crypto.randomUUID(),
    number: nextNumber(
      'SH',
      state.shipments.map((item) => item.number),
    ),
    orderDate: today(),
    status: 'loaded',
    history: [{ status: 'loaded', at: new Date().toISOString(), note: `Copied from ${source.number}` }],
  }
  setState((s) => ({ ...s, shipments: [copy, ...s.shipments] }))
  return copy
}

export function deleteShipment(id: string) {
  setState((s) => ({ ...s, shipments: s.shipments.filter((item) => item.id !== id) }))
}

export function setShipmentStatus(id: string, status: ShipmentStatus, note?: string) {
  setState((s) => ({
    ...s,
    shipments: s.shipments.map((item) =>
      item.id === id
        ? { ...item, status, history: [...item.history, { status, at: new Date().toISOString(), note }] }
        : item,
    ),
  }))
}

/* ---------- Directory & finance ---------- */

export const useCustomers = () => useStore((s) => s.customers)
export const useVendors = () => useStore((s) => s.vendors)
export const useInvoices = () => useStore((s) => s.invoices)
