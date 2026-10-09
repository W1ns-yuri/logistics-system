import { Badge } from '@/components/ui/badge'
import type { DocumentStatus } from '@/data/dashboard'
import type { QuotationStatus } from '@/types/quotation'
import type { ShipmentStatus } from '@/types/shipment'

type Variant = 'info' | 'success' | 'warning' | 'destructive' | 'secondary'
type StatusConfig<T extends string> = Record<T, { label: string; variant: Variant }>

// Словари «статус → цвет и подпись», чтобы во всех таблицах статусы выглядели одинаково

const documentStatuses: StatusConfig<DocumentStatus> = {
  in_progress: { label: 'In progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  shipment_created: { label: 'Shipment created', variant: 'secondary' },
  in_transit: { label: 'In transit', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export const quotationStatuses: StatusConfig<QuotationStatus> = {
  in_progress: { label: 'In progress', variant: 'info' },
  shipment_created: { label: 'Shipment created', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export const shipmentStatuses: StatusConfig<ShipmentStatus> = {
  loaded: { label: 'Loaded', variant: 'info' },
  on_the_way_to_port: { label: 'On the way to port', variant: 'info' },
  loaded_at_port: { label: 'Loaded at port', variant: 'info' },
  queue_at_border: { label: 'Queue at border', variant: 'warning' },
  transit: { label: 'Transit', variant: 'warning' },
  on_turkmenistan_border: { label: 'On Turkmenistan border', variant: 'warning' },
  delivered: { label: 'Delivered', variant: 'success' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { label, variant } = documentStatuses[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const { label, variant } = quotationStatuses[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const { label, variant } = shipmentStatuses[status]
  return <Badge variant={variant}>{label}</Badge>
}
