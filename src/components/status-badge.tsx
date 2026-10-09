import { Badge } from '@/components/ui/badge'
import type { DocumentStatus } from '@/data/dashboard'

// Один словарь «статус → цвет и подпись», чтобы во всех таблицах статусы выглядели одинаково
const statusConfig: Record<DocumentStatus, { label: string; variant: 'info' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  in_progress: { label: 'In progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
  shipment_created: { label: 'Shipment created', variant: 'secondary' },
  in_transit: { label: 'In transit', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { label, variant } = statusConfig[status]
  return <Badge variant={variant}>{label}</Badge>
}
