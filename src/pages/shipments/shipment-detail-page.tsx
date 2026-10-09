import { ArrowLeft, Check, ChevronRight, CircleX } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { InfoField } from '@/components/info-field'
import { SectionCard } from '@/components/section-card'
import { ShipmentStatusBadge, shipmentStatuses } from '@/components/status-badge'
import { TransportModeLabel } from '@/components/transport-mode'
import { Button } from '@/components/ui/button'
import { setShipmentStatus, useQuotation, useShipment } from '@/data/store'
import { formatDate, formatDateTime, formatWeight } from '@/lib/format'
import { cn } from '@/lib/utils'
import { NotFoundPage } from '@/pages/not-found'
import { SHIPMENT_STATUSES } from '@/types/shipment'

export function ShipmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const shipment = useShipment(id)
  const quotation = useQuotation(shipment?.quotationId)

  if (!shipment) return <NotFoundPage />

  const isCancelled = shipment.status === 'cancelled'
  const currentIndex = SHIPMENT_STATUSES.indexOf(shipment.status as (typeof SHIPMENT_STATUSES)[number])
  const nextStatus = isCancelled ? undefined : SHIPMENT_STATUSES[currentIndex + 1]
  const reached = new Set(shipment.history.map((event) => event.status))

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon-sm" aria-label="Back" onClick={() => navigate('/shipments')}>
            <ArrowLeft />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{shipment.number}</h1>
              <ShipmentStatusBadge status={shipment.status} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {shipment.customer} · {shipment.collectionAddress} → {shipment.deliveryAddress}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isCancelled || shipment.status === 'completed'}
            onClick={() => setShipmentStatus(shipment.id, 'cancelled')}
            className="text-destructive hover:text-destructive"
          >
            <CircleX />
            Cancel shipment
          </Button>
          <Button
            size="sm"
            disabled={!nextStatus}
            onClick={() => nextStatus && setShipmentStatus(shipment.id, nextStatus)}
          >
            <ChevronRight />
            {nextStatus ? `Mark as: ${shipmentStatuses[nextStatus].label}` : 'No further status'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Route & dates">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoField label="Collection address">{shipment.collectionAddress}</InfoField>
              <InfoField label="Delivery address">{shipment.deliveryAddress}</InfoField>
              <InfoField label="Mode">
                <TransportModeLabel mode={shipment.mode} />
              </InfoField>
              <InfoField label="Order date">{formatDate(shipment.orderDate)}</InfoField>
              <InfoField label="ETD">{formatDate(shipment.etd)}</InfoField>
              <InfoField label="ETA">{formatDate(shipment.eta)}</InfoField>
            </div>
          </SectionCard>
          <SectionCard title="Cargo">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoField label="Equipment">
                {shipment.transportQuantity} × {shipment.equipment}
              </InfoField>
              <InfoField label="Packages">{shipment.cargoDescription}</InfoField>
              <InfoField label="Weight">{formatWeight(shipment.weightKg)}</InfoField>
              <InfoField label="Quotation">
                {quotation ? (
                  <Link to={`/quotations/${quotation.id}`} className="font-medium text-primary hover:underline">
                    {quotation.reference}
                  </Link>
                ) : (
                  '—'
                )}
              </InfoField>
            </div>
          </SectionCard>
        </div>

        {/* Трекинг: все статусы по порядку, пройденные отмечены */}
        <SectionCard title="Tracking">
          <ol className="space-y-0">
            {SHIPMENT_STATUSES.map((status, index) => {
              const event = [...shipment.history].reverse().find((item) => item.status === status)
              const done = reached.has(status) || (!isCancelled && index <= currentIndex)
              const isCurrent = status === shipment.status
              const isLast = index === SHIPMENT_STATUSES.length - 1
              return (
                <li key={status} className="relative flex gap-3 pb-5 last:pb-0">
                  {!isLast && (
                    <span
                      className={cn(
                        'absolute top-6 left-[11px] h-[calc(100%-1.25rem)] w-px',
                        done ? 'bg-primary' : 'bg-border',
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                      done
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground',
                      isCurrent && 'ring-4 ring-primary/20',
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div
                      className={cn(
                        'text-sm',
                        isCurrent ? 'font-semibold' : done ? 'font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {shipmentStatuses[status].label}
                    </div>
                    {event && <div className="text-xs text-muted-foreground">{formatDateTime(event.at)}</div>}
                    {event?.note && <div className="text-xs text-muted-foreground">{event.note}</div>}
                  </div>
                </li>
              )
            })}
          </ol>
          {isCancelled && (
            <div className="mt-5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              This shipment was cancelled.
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
