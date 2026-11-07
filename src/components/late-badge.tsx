import { Clock } from 'lucide-react'

import { t } from '@/i18n'
import { daysLate, type Shipment } from '@/types/shipment'

// Красная метка «Опаздывает на N дн.»: видна только когда ETA прошла, а груз не доставлен
export function LateBadge({ shipment }: { shipment: Pick<Shipment, 'eta' | 'status'> }) {
  const days = daysLate(shipment)
  if (!days) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap text-destructive"
      data-testid="late-badge"
    >
      <Clock className="size-3.5" />
      {t('Late by {n} d.', { n: days })}
    </span>
  )
}
