import type { Currency } from './logistics'

export const INVOICE_STATUSES = ['draft', 'sent', 'partially_paid', 'paid', 'overdue'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export type InvoiceLine = {
  item: string // Freight Forwarding Services
  description?: string // FCA Kocaeli → DAP Ashgabat via Iran
  quantity: number
  rate: number
}

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  card: 'Card',
  other: 'Other',
}

// Чек / квитанция к оплате (бухгалтер прикладывает файл)
export type PaymentReceipt = {
  name: string
  size: number
  dataUrl?: string
}

// Одна оплата по инвойсу. Клиент может платить частями: CP-AHL-124 + CP-AHL-143
export type Payment = {
  id: string
  number: string // CP-<префикс>-124
  date: string
  amount: number
  discount: number // «Payment Discount Made» — скидка, которую дали при этой оплате
  method: PaymentMethod
  reference?: string // номер перевода, чека
  receipt?: PaymentReceipt
}

// Структура взята из примеров INV-AHL-000140 и INV-AHL-000007
export type Invoice = {
  id: string
  number: string
  billTo: string
  invoiceDate: string
  terms: string
  dueDate: string
  poNumber?: string // P.O.# — номер заказа (у нас номер перевозки)
  projectName: string // 2026.05.18-AHL-62: дата заказа + номер
  shipmentId?: string
  currency: Currency
  lines: InvoiceLine[]
  payments: Payment[]
  // Считаются из payments, хранятся для удобства таблиц
  paid: number
  discount: number
  status: InvoiceStatus
}
