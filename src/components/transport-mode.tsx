import { Plane, Ship, TrainFront, Truck, type LucideIcon } from 'lucide-react'

import { transportModeLabels, type TransportMode } from '@/types/logistics'
import { cn } from '@/lib/utils'

// Иконка вида транспорта (колонка «Sign» на слайде 5)
const icons: Record<TransportMode, LucideIcon> = {
  air: Plane,
  sea: Ship,
  road: Truck,
  rail: TrainFront,
}

export function TransportModeIcon({ mode, className }: { mode: TransportMode; className?: string }) {
  const Icon = icons[mode]
  return <Icon className={cn('size-4 text-muted-foreground', className)} aria-label={transportModeLabels[mode]} />
}

export function TransportModeLabel({ mode }: { mode: TransportMode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <TransportModeIcon mode={mode} />
      {transportModeLabels[mode]}
    </span>
  )
}
