import { Badge } from '@/components/ui/badge'
import { t } from '@/i18n'
import type { InvoiceStatus } from '@/types/invoice'
import type { QuotationStatus } from '@/types/quotation'
import type { ShipmentStatus } from '@/types/shipment'

type Variant = 'info' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'
type StatusConfig<T extends string> = Record<T, { label: string; variant: Variant }>

// Словари «статус → цвет и подпись», чтобы во всех таблицах статусы выглядели одинаково

export const quotationStatuses: StatusConfig<QuotationStatus> = {
  in_progress: { label: 'In progress', variant: 'info' },
  shipment_created: { label: 'Shipment created', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export const shipmentStatuses: StatusConfig<ShipmentStatus> = {
  pending: { label: 'Pending', variant: 'outline' },
  loaded: { label: 'Loaded', variant: 'info' },
  in_transit: { label: 'In transit', variant: 'info' },
  at_border: { label: 'At the border', variant: 'warning' },
  delivered: { label: 'Delivered', variant: 'success' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export const invoiceStatuses: StatusConfig<InvoiceStatus> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'info' },
  partially_paid: { label: 'Partially paid', variant: 'warning' },
  paid: { label: 'Paid', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'destructive' },
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, variant } = invoiceStatuses[status]
  return <Badge variant={variant}>{t(label)}</Badge>
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const { label, variant } = quotationStatuses[status]
  return <Badge variant={variant}>{t(label)}</Badge>
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const { label, variant } = shipmentStatuses[status]
  return <Badge variant={variant}>{t(label)}</Badge>
}
