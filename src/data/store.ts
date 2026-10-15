import { useSyncExternalStore } from 'react'

import { invoiceTotals } from '@/lib/calculation'
import type { Customer, Vendor } from '@/types/directory'
import type { Invoice, InvoiceStatus } from '@/types/invoice'
import type { Currency } from '@/types/logistics'
import type { Quotation } from '@/types/quotation'
import type { Shipment, ShipmentDocument, ShipmentStatus } from '@/types/shipment'
import type { TeamMember } from '@/types/team'
import { archive } from './archive'
import { mockCustomers } from './customers'
import { mockInvoices } from './invoices'
import { mockQuotations } from './quotations'
import { getSettings } from './settings'
import { mockShipments } from './shipments'
import { mockTeam } from './team'
import { mockVendors } from './vendors'

/*
 * Временная «база данных» в браузере.
 * Все изменения сохраняются в localStorage, поэтому переживают перезагрузку страницы.
 * Компоненты подписываются через хуки ниже и перерисовываются при изменениях.
 * Когда появится настоящий бэкенд, заменим этот файл, а страницы трогать почти не придётся.
 */

type State = {
  quotations: Quotation[]
  shipments: Shipment[]
  customers: Customer[]
  vendors: Vendor[]
  invoices: Invoice[]
  team: TeamMember[]
}

// Меняем номер версии, когда меняется формат данных: старые сохранения тогда просто сбросятся
const STORAGE_KEY = 'db-v3'

const initialState = (): State => ({
  quotations: [...mockQuotations, ...archive.quotations],
  shipments: [...mockShipments, ...archive.shipments],
  customers: mockCustomers,
  vendors: mockVendors,
  invoices: [...mockInvoices, ...archive.invoices],
  team: mockTeam,
})

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...initialState(), ...JSON.parse(raw) }
  } catch {
    // нет доступа к localStorage или там мусор — начинаем с демо-данных
  }
  return initialState()
}

let state: State = load()
const listeners = new Set<() => void>()

// Возвращает false, если браузер не дал сохранить (например, слишком большой файл)
function setState(update: (prev: State) => State) {
  const next = update(state)
  let saved = true
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    saved = false
  }
  state = next
  listeners.forEach((listener) => listener())
  return saved
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

export function resetDemoData() {
  setState(() => initialState())
}

/* ---------- Нумерация ---------- */

// Номер = префикс компании + 6 цифр: WF000001. Котировки и шипменты делят один счётчик,
// потому что шипмент получает номер своей котировки.
export function nextDocumentNumber() {
  const prefix = getSettings().documentPrefix || 'XX'
  const used = [...state.quotations.map((q) => q.reference), ...state.shipments.map((s) => s.number)]
  const max = used
    .filter((ref) => ref.startsWith(prefix))
    .reduce((acc, ref) => Math.max(acc, Number(ref.slice(prefix.length)) || 0), 0)
  return prefix + String(max + 1).padStart(6, '0')
}

const today = () => new Date().toISOString().slice(0, 10)
const now = () => new Date().toISOString()
const newId = () => crypto.randomUUID()

/* ---------- Quotations ---------- */

export const useQuotations = () => useStore((s) => s.quotations)
export const useQuotation = (id?: string) => useStore((s) => s.quotations.find((q) => q.id === id))

export function createQuotation(data: Omit<Quotation, 'id' | 'reference' | 'createdAt'>) {
  const quotation: Quotation = { ...data, id: newId(), reference: nextDocumentNumber(), createdAt: today() }
  setState((s) => ({ ...s, quotations: [quotation, ...s.quotations] }))
  return quotation
}

export function updateQuotation(id: string, patch: Partial<Quotation>) {
  setState((s) => ({ ...s, quotations: s.quotations.map((q) => (q.id === id ? { ...q, ...patch } : q)) }))
}

export function copyQuotation(id: string) {
  const source = state.quotations.find((q) => q.id === id)
  if (!source) return
  const copy: Quotation = {
    ...source,
    id: newId(),
    reference: nextDocumentNumber(),
    status: 'in_progress',
    createdAt: today(),
  }
  setState((s) => ({ ...s, quotations: [copy, ...s.quotations] }))
  return copy
}

export function deleteQuotation(id: string) {
  setState((s) => ({ ...s, quotations: s.quotations.filter((q) => q.id !== id) }))
}

// Кнопка «Create shipment»: шипмент получает номер котировки, маршрут и груз переносятся
export function createShipmentFromQuotation(id: string) {
  const q = state.quotations.find((item) => item.id === id)
  if (!q) return
  const numberTaken = state.shipments.some((s) => s.number === q.reference)
  const shipment: Shipment = {
    id: newId(),
    number: numberTaken ? nextDocumentNumber() : q.reference,
    quotationId: q.id,
    mode: q.mode,
    customer: q.customer,
    vendorId: state.vendors.find((v) => v.name === q.carrier)?.id,
    collectionAddress: q.collectionAddress,
    deliveryAddress: q.deliveryAddress,
    orderDate: today(),
    equipment: q.equipment,
    transportQuantity: q.transportQuantity,
    cargoDescription: q.cargo.map((line) => `${line.pieces} ${line.packageType}`).join(', ') || q.natureOfGoods,
    weightKg: q.weightKg,
    status: 'loaded',
    history: [{ status: 'loaded', at: now(), note: `Created from quotation ${q.reference}` }],
    documents: [],
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

export function createShipment(data: Omit<Shipment, 'id' | 'number' | 'history' | 'documents'>) {
  const shipment: Shipment = {
    ...data,
    id: newId(),
    number: nextDocumentNumber(),
    history: [{ status: data.status, at: now() }],
    documents: [],
  }
  setState((s) => ({ ...s, shipments: [shipment, ...s.shipments] }))
  return shipment
}

export function updateShipment(id: string, patch: Partial<Shipment>) {
  setState((s) => ({ ...s, shipments: s.shipments.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
}

export function copyShipment(id: string) {
  const source = state.shipments.find((item) => item.id === id)
  if (!source) return
  const copy: Shipment = {
    ...source,
    id: newId(),
    number: nextDocumentNumber(),
    orderDate: today(),
    status: 'loaded',
    history: [{ status: 'loaded', at: now(), note: `Copied from ${source.number}` }],
    documents: [],
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
      item.id === id ? { ...item, status, history: [...item.history, { status, at: now(), note }] } : item,
    ),
  }))
}

export function addShipmentDocument(id: string, doc: Omit<ShipmentDocument, 'id' | 'uploadedAt'>) {
  const document: ShipmentDocument = { ...doc, id: newId(), uploadedAt: now() }
  const saved = setState((s) => ({
    ...s,
    shipments: s.shipments.map((item) =>
      item.id === id ? { ...item, documents: [...(item.documents ?? []), document] } : item,
    ),
  }))
  // Файл не влез в память браузера — сохраняем только запись о нём, без содержимого
  if (!saved && document.dataUrl) {
    setState((s) => ({
      ...s,
      shipments: s.shipments.map((item) =>
        item.id === id
          ? { ...item, documents: item.documents.map((d) => (d.id === document.id ? { ...d, dataUrl: undefined } : d)) }
          : item,
      ),
    }))
    return false
  }
  return true
}

export function removeShipmentDocument(id: string, documentId: string) {
  setState((s) => ({
    ...s,
    shipments: s.shipments.map((item) =>
      item.id === id ? { ...item, documents: item.documents.filter((d) => d.id !== documentId) } : item,
    ),
  }))
}

/* ---------- Customers ---------- */

export const useCustomers = () => useStore((s) => s.customers)

// Код клиента как в Scope: 3 буквы названия + 3 буквы города → HUASHA
function makeCode(name: string, city: string) {
  const part = (text: string) =>
    text
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 3)
      .toUpperCase()
      .padEnd(3, 'X')
  return part(name) + part(city)
}

export function createCustomer(data: Omit<Customer, 'id' | 'code'>) {
  const customer: Customer = { ...data, id: newId(), code: makeCode(data.name, data.city) }
  setState((s) => ({ ...s, customers: [customer, ...s.customers] }))
  return customer
}

export function updateCustomer(id: string, patch: Partial<Customer>) {
  setState((s) => ({ ...s, customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
}

export function deleteCustomer(id: string) {
  setState((s) => ({ ...s, customers: s.customers.filter((c) => c.id !== id) }))
}

/* ---------- Vendors ---------- */

export const useVendors = () => useStore((s) => s.vendors)

export function createVendor(data: Omit<Vendor, 'id' | 'code'>) {
  const vendor: Vendor = { ...data, id: newId(), code: makeCode(data.name, data.country) }
  setState((s) => ({ ...s, vendors: [vendor, ...s.vendors] }))
  return vendor
}

export function updateVendor(id: string, patch: Partial<Vendor>) {
  setState((s) => ({ ...s, vendors: s.vendors.map((v) => (v.id === id ? { ...v, ...patch } : v)) }))
}

export function deleteVendor(id: string) {
  setState((s) => ({ ...s, vendors: s.vendors.filter((v) => v.id !== id) }))
}

/* ---------- Invoices & payments ---------- */

export const useInvoices = () => useStore((s) => s.invoices)

// Статус инвойса считается из суммы оплат и срока
function invoiceStatus(invoice: Invoice): InvoiceStatus {
  const { total } = invoiceTotals(invoice)
  if (invoice.paid >= total && total > 0) return 'paid'
  if (invoice.dueDate < today()) return 'overdue'
  if (invoice.paid > 0) return 'partially_paid'
  return invoice.status === 'draft' ? 'draft' : 'sent'
}

// Номер инвойса: INV-<префикс>-000141
function nextInvoiceNumber() {
  const max = state.invoices.reduce((acc, inv) => Math.max(acc, Number(inv.number.split('-').pop()) || 0), 0)
  return `INV-${getSettings().documentPrefix}-${String(max + 1).padStart(6, '0')}`
}

// Инвойс из шипмента: строки берём из калькуляции котировки (доход по каждой строке)
// Если котировки нет, сумму и валюту вводят вручную (manual)
export function createInvoiceFromShipment(shipmentId: string, manual?: { amount: number; currency: Currency }) {
  const shipment = state.shipments.find((s) => s.id === shipmentId)
  if (!shipment) return
  const quotation = state.quotations.find((q) => q.id === shipment.quotationId)
  const lines =
    !manual && quotation?.charges.length
      ? quotation.charges.map((c) => ({ item: c.chargeType, quantity: c.quantity, rate: c.rateIncome }))
      : [
          {
            item: `Freight ${shipment.collectionAddress} → ${shipment.deliveryAddress}`,
            quantity: 1,
            rate: manual?.amount ?? 0,
          },
        ]
  const due = new Date()
  due.setDate(due.getDate() + 30)
  const invoice: Invoice = {
    id: newId(),
    number: nextInvoiceNumber(),
    billTo: shipment.customer,
    invoiceDate: today(),
    terms: quotation?.paymentTerms ?? 'Net 30',
    dueDate: due.toISOString().slice(0, 10),
    projectName: `${shipment.number} · ${shipment.collectionAddress} → ${shipment.deliveryAddress}`,
    shipmentId,
    currency: manual?.currency ?? quotation?.currency ?? getSettings().defaultCurrency,
    lines,
    paid: 0,
    status: 'sent',
  }
  setState((s) => ({ ...s, invoices: [invoice, ...s.invoices] }))
  return invoice
}

export function recordPayment(invoiceId: string, amount: number) {
  setState((s) => ({
    ...s,
    invoices: s.invoices.map((inv) => {
      if (inv.id !== invoiceId) return inv
      const next = { ...inv, paid: Math.max(0, inv.paid + amount) }
      return { ...next, status: invoiceStatus(next) }
    }),
  }))
}

export function deleteInvoice(id: string) {
  setState((s) => ({ ...s, invoices: s.invoices.filter((inv) => inv.id !== id) }))
}

// Сколько клиент уже заплатил по шипменту (колонка Payment в таблице шипментов)
export function shipmentPayment(shipmentId: string, invoices: Invoice[]) {
  return invoices
    .filter((inv) => inv.shipmentId === shipmentId)
    .reduce(
      (acc, inv) => {
        acc.total += invoiceTotals(inv).total
        acc.paid += inv.paid
        acc.currency = inv.currency
        return acc
      },
      { paid: 0, total: 0, currency: '' as string },
    )
}

/* ---------- Team ---------- */

export const useTeam = () => useStore((s) => s.team)

export function addTeamMember(data: Omit<TeamMember, 'id'>) {
  setState((s) => ({ ...s, team: [...s.team, { ...data, id: newId() }] }))
}

export function updateTeamMember(id: string, patch: Partial<TeamMember>) {
  setState((s) => ({ ...s, team: s.team.map((m) => (m.id === id ? { ...m, ...patch } : m)) }))
}

export function removeTeamMember(id: string) {
  setState((s) => ({ ...s, team: s.team.filter((m) => m.id !== id) }))
}

export function findMemberByEmail(email: string) {
  return state.team.find((m) => m.email.toLowerCase() === email.toLowerCase())
}

/* ---------- Для аналитики ---------- */

export const useAllData = () => useStore((s) => s)
