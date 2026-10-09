import type { Currency } from './logistics'

export const INVOICE_STATUSES = ['draft', 'sent', 'partially_paid', 'paid', 'overdue'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export type InvoiceLine = {
  item: string
  description?: string
  quantity: number
  rate: number
}

// Структура взята из примера INV-AHL-000140
export type Invoice = {
  id: string
  number: string
  billTo: string
  invoiceDate: string
  terms: string
  dueDate: string
  projectName: string
  shipmentId?: string
  currency: Currency
  lines: InvoiceLine[]
  paid: number
  status: InvoiceStatus
}
