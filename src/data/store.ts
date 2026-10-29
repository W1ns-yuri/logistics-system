import { useSyncExternalStore } from 'react'

import { invoiceTotals } from '@/lib/calculation'
import type { Customer, Vendor } from '@/types/directory'
import type { Invoice, InvoiceStatus, Payment } from '@/types/invoice'
import type { Currency } from '@/types/logistics'
import type { Quotation } from '@/types/quotation'
import type { Shipment, ShipmentDocument, ShipmentStatus, VendorPayment } from '@/types/shipment'
import type { TeamMember } from '@/types/team'
import { archive } from './archive'
import { mockCustomers } from './customers'
import { mockInvoices } from './invoices'
import { mockQuotations } from './quotations'
import { getSession } from './session'
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
  // Города, которые добавили сами (их нет во встроенном списке)
  cities: CustomCity[]
}

export type CustomCity = { name: string; country: string }

// Меняем номер версии, когда меняется формат данных: старые сохранения тогда просто сбросятся
const STORAGE_KEY = 'db-v3'

// У перевозок свой счётчик с первого номера (попросил заказчик): SHP-WF-000001.
// Связь с котировкой видна в карточке перевозки.
const SHIPMENT_NUMBER = /^SHP-([A-Z0-9]+)-(\d+)$/
const shipmentNumber = (prefix: string, n: number) => `SHP-${prefix}-${String(n).padStart(6, '0')}`

// Последний номер перевозки с этим префиксом
function maxShipmentNumber(shipments: Shipment[], prefix: string) {
  return shipments.reduce((acc, s) => {
    const match = SHIPMENT_NUMBER.exec(s.number)
    return match?.[1] === prefix ? Math.max(acc, Number(match[2])) : acc
  }, 0)
}

// Как и у котировок, счёт идёт внутри своего префикса
function nextShipmentNumber() {
  const prefix = getSettings().documentPrefix || 'XX'
  return shipmentNumber(prefix, maxShipmentNumber(state.shipments, prefix) + 1)
}

/*
 * Раньше перевозка брала номер котировки (AT000151). Такие номера переводим в новый формат
 * (SHP-AT-000001) по порядку дат заказа, префикс берём из старого номера. В инвойсах обновляем
 * P.O.# и Project Name — чтобы ничего не разъехалось.
 */
// Перевозчик раньше был один на котировку (поле Carrier). Теперь он в каждой строке расчёта:
// старым строкам без перевозчика подставляем того, кто был указан в котировке или в её перевозке.
function chargesWithVendors(data: State): State {
  const quotations = data.quotations.map((q) => {
    if (q.charges.every((c) => 'vendorId' in c)) return q
    const fallback =
      data.vendors.find((v) => v.name === q.carrier)?.id ?? data.shipments.find((s) => s.quotationId === q.id)?.vendorId
    return {
      ...q,
      charges: q.charges.map((c, i) => ('vendorId' in c ? c : { ...c, vendorId: i === 0 ? fallback : undefined })),
    }
  })
  return { ...data, quotations }
}

function renumberShipments(data: State): State {
  const old = data.shipments
    .filter((s) => !SHIPMENT_NUMBER.test(s.number))
    .sort((a, b) => a.orderDate.localeCompare(b.orderDate) || a.number.localeCompare(b.number))
  if (!old.length) return data
  const counters = new Map<string, number>()
  const renamed = new Map(
    old.map((s) => {
      const prefix = /^([A-Z]+)\d+$/.exec(s.number)?.[1] ?? (getSettings().documentPrefix || 'XX')
      const n = (counters.get(prefix) ?? maxShipmentNumber(data.shipments, prefix)) + 1
      counters.set(prefix, n)
      return [s.id, shipmentNumber(prefix, n)]
    }),
  )
  const shipments = data.shipments.map((s) => (renamed.has(s.id) ? { ...s, number: renamed.get(s.id)! } : s))
  const invoices = data.invoices.map((inv) => {
    const before = data.shipments.find((s) => s.id === inv.shipmentId)
    const after = inv.shipmentId ? renamed.get(inv.shipmentId) : undefined
    if (!before || !after) return inv
    return {
      ...inv,
      poNumber: inv.poNumber === before.number ? after : inv.poNumber,
      projectName: inv.projectName?.replace(before.number, after),
    }
  })
  return { ...data, shipments, invoices }
}

/*
 * У демо-записей нет автора. Раздаём их между менеджером и сотрудником из демо-команды,
 * чтобы было видно правило «меняет только автор». В рабочем пространстве новой компании
 * демо-людей нет, и у всех её записей автор уже есть.
 */
const DEMO_OWNERS = ['manager@company.com', 'operator@company.com']
function withOwners(data: State): State {
  if (!DEMO_OWNERS.every((email) => data.team.some((m) => m.email === email))) return data
  const owner = (id: string) => DEMO_OWNERS[[...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 2]!
  const quotations = data.quotations.map((q) => (q.createdBy ? q : { ...q, createdBy: owner(q.id) }))
  const shipments = data.shipments.map((sh) => {
    if (sh.createdBy) return sh
    const quotation = quotations.find((q) => q.id === sh.quotationId)
    return { ...sh, createdBy: quotation?.createdBy ?? owner(sh.id) }
  })
  return { ...data, quotations, shipments }
}

const normalize = (data: State) => withOwners(renumberShipments(chargesWithVendors(data)))

const initialState = (): State =>
  normalize({
    quotations: [...mockQuotations, ...archive.quotations],
    shipments: [...mockShipments, ...archive.shipments],
    customers: mockCustomers,
    vendors: mockVendors,
    invoices: withPayments([...mockInvoices, ...archive.invoices], [...mockShipments, ...archive.shipments]),
    team: mockTeam,
    cities: [],
  })

/*
 * Демо-инвойсы хранят только сумму paid. Превращаем её в список оплат, а сохранения из прошлой
 * версии (без payments) достраиваем так же — ничего, что пользователь создал, не теряется.
 */
function withPayments(invoices: (Omit<Invoice, 'payments' | 'discount'> & Partial<Invoice>)[], shipments: Shipment[]) {
  let counter = 100
  return invoices.map((inv): Invoice => {
    const shipment = shipments.find((s) => s.id === inv.shipmentId)
    const base: Invoice = {
      ...inv,
      // Номер заказа и Project Name — по номеру перевозки
      poNumber: inv.payments ? inv.poNumber : (shipment?.number ?? inv.poNumber),
      projectName:
        shipment && !inv.payments ? `${shipment.orderDate.replaceAll('-', '.')}-${shipment.number}` : inv.projectName,
      payments: inv.payments ?? [],
      discount: inv.discount ?? 0,
    }
    if (inv.payments?.length || !inv.paid) return base
    const { total } = invoiceTotals({ ...base, discount: 0 })
    const prefix = inv.number.split('-')[1] ?? 'XX'
    const day = (offset: number) => {
      const d = new Date(`${inv.invoiceDate}T00:00:00Z`)
      d.setUTCDate(d.getUTCDate() + offset)
      return d.toISOString().slice(0, 10)
    }
    // Крупные оплаченные инвойсы — двумя платежами, как в примере клиента (10 000 + 21 200)
    const parts = inv.paid >= total && total > 5000 ? [0.4, 0.6] : [1]
    const payments = parts.map((share, i) => ({
      id: `${inv.id}-p${i}`,
      number: `CP-${prefix}-${String(++counter).padStart(3, '0')}`,
      // today() объявлен ниже и при загрузке ещё не готов, поэтому дата прямо здесь
      date: [day(3 + i * 20), new Date().toISOString().slice(0, 10)].sort()[0]!,
      amount: Math.round(inv.paid * share * 100) / 100,
      discount: 0,
      method: (i === 0 ? 'bank_transfer' : 'cash') as Payment['method'],
    }))
    return { ...base, payments }
  })
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = { ...initialState(), ...JSON.parse(raw) } as State
      return normalize({ ...saved, invoices: withPayments(saved.invoices, saved.shipments) })
    }
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

// Новая компания после регистрации: пустая база, в команде только её админ
export function startEmptyWorkspace(admin: { name: string; email: string }) {
  setState(() => ({
    quotations: [],
    shipments: [],
    customers: [],
    vendors: [],
    invoices: [],
    team: [{ id: crypto.randomUUID(), name: admin.name, email: admin.email, role: 'admin' }],
    cities: [],
  }))
}

/* ---------- Нумерация ---------- */

// Номер котировки = префикс компании + 6 цифр: WF000001
export function nextDocumentNumber() {
  const prefix = getSettings().documentPrefix || 'XX'
  const used = state.quotations.map((q) => q.reference)
  const max = used
    .filter((ref) => ref.startsWith(prefix))
    .reduce((acc, ref) => Math.max(acc, Number(ref.slice(prefix.length)) || 0), 0)
  return prefix + String(max + 1).padStart(6, '0')
}

const today = () => new Date().toISOString().slice(0, 10)
const now = () => new Date().toISOString()
const newId = () => crypto.randomUUID()
// Автор новой записи — тот, кто сейчас вошёл
const author = () => getSession()?.email

/* ---------- Quotations ---------- */

export const useQuotations = () => useStore((s) => s.quotations)
export const useQuotation = (id?: string) => useStore((s) => s.quotations.find((q) => q.id === id))

export function createQuotation(data: Omit<Quotation, 'id' | 'reference' | 'createdAt'>) {
  const quotation: Quotation = {
    ...data,
    id: newId(),
    reference: nextDocumentNumber(),
    createdAt: today(),
    createdBy: author(),
  }
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
    createdBy: author(),
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
  const shipment: Shipment = {
    id: newId(),
    number: nextShipmentNumber(),
    quotationId: q.id,
    createdBy: author(),
    mode: q.mode,
    customer: q.customer,
    // Основной перевозчик — из первой строки расчёта; остальные видны в оплатах подрядчикам
    vendorId: q.charges.find((c) => c.vendorId)?.vendorId,
    collectionAddress: q.collectionAddress,
    deliveryAddress: q.deliveryAddress,
    orderDate: today(),
    equipment: q.equipment,
    transportQuantity: q.transportQuantity,
    cargoDescription: q.cargo.map((line) => `${line.pieces} ${line.packageType}`).join(', ') || q.natureOfGoods,
    weightKg: q.weightKg,
    status: 'pending',
    history: [{ status: 'pending', at: now(), note: `Created from quotation ${q.reference}` }],
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
    number: nextShipmentNumber(),
    createdBy: author(),
    history: [{ status: data.status, at: now() }],
    documents: [],
  }
  setState((s) => ({ ...s, shipments: [shipment, ...s.shipments] }))
  return shipment
}

export function updateShipment(id: string, patch: Partial<Shipment>) {
  setState((s) => ({ ...s, shipments: s.shipments.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
}

/* ---------- Оплаты подрядчикам ---------- */

function nextVendorPaymentNumber() {
  return nextInPrefix(
    'VP',
    state.shipments.flatMap((s) => (s.vendorPayments ?? []).map((p) => p.number)),
    3,
  )
}

const mapVendorPayments = (shipmentId: string, update: (list: VendorPayment[]) => VendorPayment[]) =>
  setState((s) => ({
    ...s,
    shipments: s.shipments.map((item) =>
      item.id === shipmentId ? { ...item, vendorPayments: update(item.vendorPayments ?? []) } : item,
    ),
  }))

// Как и у оплат клиента: если чек не влез в память браузера, оставляем запись без файла и возвращаем false
export function saveVendorPayment(shipmentId: string, data: Omit<VendorPayment, 'id' | 'number'>, paymentId?: string) {
  const id = paymentId ?? newId()
  const saved = mapVendorPayments(shipmentId, (list) =>
    paymentId
      ? list.map((p) => (p.id === paymentId ? { ...p, ...data } : p))
      : [...list, { ...data, id, number: nextVendorPaymentNumber() }],
  )
  if (!saved && data.receipt?.dataUrl) {
    mapVendorPayments(shipmentId, (list) =>
      list.map((p) => (p.id === id && p.receipt ? { ...p, receipt: { ...p.receipt, dataUrl: undefined } } : p)),
    )
    return false
  }
  return true
}

export function removeVendorPayment(shipmentId: string, paymentId: string) {
  mapVendorPayments(shipmentId, (list) => list.filter((p) => p.id !== paymentId))
}

export function copyShipment(id: string) {
  const source = state.shipments.find((item) => item.id === id)
  if (!source) return
  const copy: Shipment = {
    ...source,
    id: newId(),
    number: nextShipmentNumber(),
    createdBy: author(),
    orderDate: today(),
    status: 'pending',
    history: [{ status: 'pending', at: now(), note: `Copied from ${source.number}` }],
    documents: [],
    vendorPayments: [],
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

// Статус инвойса считается из оплат и срока
function invoiceStatus(invoice: Invoice): InvoiceStatus {
  const { total, balanceDue } = invoiceTotals(invoice)
  if (total > 0 && balanceDue <= 0.005) return 'paid'
  if (invoice.dueDate < today()) return 'overdue'
  if (invoice.paid > 0) return 'partially_paid'
  return invoice.status === 'draft' ? 'draft' : 'sent'
}

// paid и discount — сумма по списку оплат; после любого изменения пересчитываем
function recalc(invoice: Invoice): Invoice {
  const paid = invoice.payments.reduce((acc, p) => acc + p.amount, 0)
  const discount = invoice.payments.reduce((acc, p) => acc + (p.discount || 0), 0)
  const next = { ...invoice, paid, discount }
  return { ...next, status: invoiceStatus(next) }
}

// Следующий номер вида KIND-<префикс>-NNN. Как у перевозок, счёт идёт внутри своего префикса:
// сменили префикс компании — новые документы начинаются с 1.
function nextInPrefix(kind: string, numbers: string[], pad: number) {
  const prefix = getSettings().documentPrefix || 'XX'
  const max = numbers.reduce((acc, number) => {
    const [k, p, n] = number.split('-')
    return k === kind && p === prefix ? Math.max(acc, Number(n) || 0) : acc
  }, 0)
  return `${kind}-${prefix}-${String(max + 1).padStart(pad, '0')}`
}

// Номер инвойса: INV-<префикс>-000141
function nextInvoiceNumber() {
  return nextInPrefix(
    'INV',
    state.invoices.map((inv) => inv.number),
    6,
  )
}

// Номер оплаты: CP-<префикс>-124 (как в приложении клиента). Счётчик общий для всех инвойсов.
function nextPaymentNumber() {
  return nextInPrefix(
    'CP',
    state.invoices.flatMap((inv) => inv.payments.map((p) => p.number)),
    3,
  )
}

// «Project Name» как у клиента: дата заказа + номер, 2026.05.18-AHL-62
const projectNameFor = (shipment: Shipment) => `${shipment.orderDate.replaceAll('-', '.')}-${shipment.number}`

// Инвойс из шипмента: строки берём из калькуляции котировки (доход по каждой строке)
// Если котировки нет, сумму и валюту вводят вручную (manual)
export function createInvoiceFromShipment(shipmentId: string, manual?: { amount: number; currency: Currency }) {
  const shipment = state.shipments.find((s) => s.id === shipmentId)
  if (!shipment) return
  const quotation = state.quotations.find((q) => q.id === shipment.quotationId)
  const route = `${shipment.collectionAddress} → ${shipment.deliveryAddress}`
  const lines =
    !manual && quotation?.charges.length
      ? quotation.charges.map((c) => ({
          item: c.chargeType,
          quantity: c.quantity,
          rate: c.rateIncome,
        }))
      : [
          {
            item: 'Freight Forwarding Services',
            description: quotation ? `${quotation.incoterm} ${route}` : route,
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
    poNumber: shipment.number,
    projectName: projectNameFor(shipment),
    shipmentId,
    currency: manual?.currency ?? quotation?.currency ?? getSettings().defaultCurrency,
    lines,
    payments: [],
    paid: 0,
    discount: 0,
    status: 'sent',
  }
  setState((s) => ({ ...s, invoices: [invoice, ...s.invoices] }))
  return invoice
}

export function updateInvoice(id: string, patch: Partial<Invoice>) {
  setState((s) => ({ ...s, invoices: s.invoices.map((inv) => (inv.id === id ? recalc({ ...inv, ...patch }) : inv)) }))
}

const mapInvoice = (id: string, update: (inv: Invoice) => Invoice) =>
  setState((s) => ({ ...s, invoices: s.invoices.map((inv) => (inv.id === id ? recalc(update(inv)) : inv)) }))

// Добавить оплату. Если чек не влез в память браузера — сохраняем оплату без файла и возвращаем false.
export function addPayment(invoiceId: string, data: Omit<Payment, 'id' | 'number'>) {
  const payment: Payment = { ...data, id: newId(), number: nextPaymentNumber() }
  const saved = mapInvoice(invoiceId, (inv) => ({ ...inv, payments: [...inv.payments, payment] }))
  if (!saved && payment.receipt?.dataUrl) {
    updatePayment(invoiceId, payment.id, { receipt: { ...payment.receipt, dataUrl: undefined } })
    return false
  }
  return true
}

export function updatePayment(invoiceId: string, paymentId: string, patch: Partial<Payment>) {
  const saved = mapInvoice(invoiceId, (inv) => ({
    ...inv,
    payments: inv.payments.map((p) => (p.id === paymentId ? { ...p, ...patch } : p)),
  }))
  if (!saved && patch.receipt?.dataUrl) {
    mapInvoice(invoiceId, (inv) => ({
      ...inv,
      payments: inv.payments.map((p) =>
        p.id === paymentId && p.receipt ? { ...p, receipt: { ...p.receipt, dataUrl: undefined } } : p,
      ),
    }))
    return false
  }
  return true
}

export function removePayment(invoiceId: string, paymentId: string) {
  mapInvoice(invoiceId, (inv) => ({ ...inv, payments: inv.payments.filter((p) => p.id !== paymentId) }))
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

/* ---------- Cities ---------- */

export const useCustomCities = () => useStore((s) => s.cities)

export function addCity(city: CustomCity) {
  const name = city.name.trim()
  if (!name || state.cities.some((c) => c.name.toLowerCase() === name.toLowerCase())) return
  setState((s) => ({ ...s, cities: [...s.cities, { name, country: city.country }] }))
}

/* ---------- Team ---------- */

export const useTeam = () => useStore((s) => s.team)

// Имя автора записи по email; если человека уже нет в команде — сам email
export const useMemberName = (email?: string) =>
  useStore((s) => (email ? (s.team.find((m) => m.email.toLowerCase() === email.toLowerCase())?.name ?? email) : ''))

export function addTeamMember(data: Omit<TeamMember, 'id'>) {
  setState((s) => ({ ...s, team: [...s.team, { ...data, id: newId() }] }))
}

export function updateTeamMember(id: string, patch: Partial<TeamMember>) {
  setState((s) => {
    const before = s.team.find((m) => m.id === id)
    const oldEmail = before?.email
    const newEmail = patch.email
    // Сменили email — котировки и перевозки этого человека остаются за ним
    const moved = (email?: string) => (oldEmail && newEmail && email === oldEmail ? newEmail : email)
    return {
      ...s,
      team: s.team.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      quotations:
        newEmail && newEmail !== oldEmail
          ? s.quotations.map((q) => ({ ...q, createdBy: moved(q.createdBy) }))
          : s.quotations,
      shipments:
        newEmail && newEmail !== oldEmail
          ? s.shipments.map((x) => ({ ...x, createdBy: moved(x.createdBy) }))
          : s.shipments,
    }
  })
}

export function removeTeamMember(id: string) {
  setState((s) => ({ ...s, team: s.team.filter((m) => m.id !== id) }))
}

export function findMemberByEmail(email: string) {
  return state.team.find((m) => m.email.toLowerCase() === email.toLowerCase())
}

/* ---------- Для аналитики ---------- */

export const useAllData = () => useStore((s) => s)
