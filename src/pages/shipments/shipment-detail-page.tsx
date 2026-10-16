import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleX,
  Download,
  FileText,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { FormField } from '@/components/form-field'
import { InfoField } from '@/components/info-field'
import { RecordPaymentDialog } from '@/components/record-payment-dialog'
import { SectionCard } from '@/components/section-card'
import { InvoiceStatusBadge, ShipmentStatusBadge, shipmentStatuses } from '@/components/status-badge'
import { TransportModeLabel } from '@/components/transport-mode'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { usePermissions } from '@/data/auth'
import { useSettings } from '@/data/settings'
import {
  addShipmentDocument,
  createInvoiceFromShipment,
  removeShipmentDocument,
  setShipmentStatus,
  shipmentPayment,
  useInvoices,
  useQuotation,
  useShipment,
  useVendors,
} from '@/data/store'
import { t } from '@/i18n'
import { invoiceTotals } from '@/lib/calculation'
import { formatDate, formatDateTime, formatMoney, formatWeight } from '@/lib/format'
import { cn } from '@/lib/utils'
import { NotFoundPage } from '@/pages/not-found'
import type { Invoice } from '@/types/invoice'
import { CURRENCIES, type Currency } from '@/types/logistics'
import {
  DOCUMENT_TYPES,
  SHIPMENT_STATUSES,
  documentTypeLabels,
  type DocumentType,
  type Shipment,
  type ShipmentStatus,
} from '@/types/shipment'
import { ShipmentFormDialog } from './shipment-form-dialog'

export function ShipmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const shipment = useShipment(id)
  const quotation = useQuotation(shipment?.quotationId)
  const vendors = useVendors()
  const { canEditOrders, canSeePayments } = usePermissions()
  const [editOpen, setEditOpen] = useState(false)

  if (!shipment) return <NotFoundPage />

  const vendor = vendors.find((v) => v.id === shipment.vendorId)
  const isCancelled = shipment.status === 'cancelled'
  const currentIndex = SHIPMENT_STATUSES.indexOf(shipment.status as (typeof SHIPMENT_STATUSES)[number])
  const nextStatus = isCancelled ? undefined : SHIPMENT_STATUSES[currentIndex + 1]

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon-sm" aria-label={t('Back')} onClick={() => navigate('/shipments')}>
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
        {canEditOrders && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              {t('Edit')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isCancelled || shipment.status === 'completed'}
              onClick={() => setShipmentStatus(shipment.id, 'cancelled')}
              className="text-destructive hover:text-destructive"
            >
              <CircleX />
              {t('Cancel shipment')}
            </Button>
            <Button
              size="sm"
              disabled={!nextStatus}
              onClick={() => nextStatus && setShipmentStatus(shipment.id, nextStatus)}
            >
              <ChevronRight />
              {nextStatus
                ? t('Mark as: {status}', { status: t(shipmentStatuses[nextStatus].label) })
                : t('No further status')}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Route & dates">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <InfoField label="Pick up location">{shipment.collectionAddress}</InfoField>
              <InfoField label="Delivery location">{shipment.deliveryAddress}</InfoField>
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
              <InfoField label="Quantity">
                {shipment.transportQuantity} × {shipment.equipment}
              </InfoField>
              <InfoField label="Packages">{shipment.cargoDescription || '—'}</InfoField>
              <InfoField label="Weight">{formatWeight(shipment.weightKg)}</InfoField>
              <InfoField label="Vendor (carrier)">{vendor?.name ?? '—'}</InfoField>
              <InfoField label="Quotation">
                {quotation ? (
                  <Link to={`/quotations/${quotation.id}`} className="font-medium text-primary hover:underline">
                    {quotation.reference}
                  </Link>
                ) : (
                  '—'
                )}
              </InfoField>
              {shipment.notes && (
                <InfoField label="Notes" className="col-span-2 md:col-span-3">
                  <span className="whitespace-pre-line">{shipment.notes}</span>
                </InfoField>
              )}
            </div>
          </SectionCard>
          <DocumentsSection shipment={shipment} canEdit={canEditOrders} />
          {canSeePayments && <PaymentSection shipment={shipment} />}
        </div>

        <TrackingSection shipment={shipment} canEdit={canEditOrders} />
      </div>

      <ShipmentFormDialog open={editOpen} onOpenChange={setEditOpen} shipment={shipment} />
    </div>
  )
}

// Трекинг: основные этапы по порядку. Статус меняет человек — кнопкой или выбором из списка.
function TrackingSection({ shipment, canEdit }: { shipment: Shipment; canEdit: boolean }) {
  const isCancelled = shipment.status === 'cancelled'
  const currentIndex = SHIPMENT_STATUSES.indexOf(shipment.status as (typeof SHIPMENT_STATUSES)[number])
  const reached = new Set(shipment.history.map((event) => event.status))

  return (
    <SectionCard
      title="Tracking"
      action={
        canEdit && (
          <NativeSelect
            aria-label={t('Status')}
            className="h-8 w-40 text-xs"
            value={shipment.status}
            onChange={(e) => setShipmentStatus(shipment.id, e.target.value as ShipmentStatus)}
          >
            {[...SHIPMENT_STATUSES, 'cancelled' as const].map((status) => (
              <option key={status} value={status}>
                {t(shipmentStatuses[status].label)}
              </option>
            ))}
          </NativeSelect>
        )
      }
    >
      <ol>
        {SHIPMENT_STATUSES.map((status, index) => {
          const event = [...shipment.history].reverse().find((item) => item.status === status)
          const done = !isCancelled ? index <= currentIndex : reached.has(status)
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
                  done ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground',
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
                  {t(shipmentStatuses[status].label)}
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
          {t('This shipment was cancelled.')}
        </div>
      )}
    </SectionCard>
  )
}

// Больше ~1.5 МБ браузер не потянет хранить — такие файлы сохраняем только как запись
const MAX_STORED_FILE = 1.5 * 1024 * 1024

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// Документы прикладывать не обязательно: инвойс, упаковочный лист, CMR, AWB, B/L, сертификаты
function DocumentsSection({ shipment, canEdit }: { shipment: Shipment; canEdit: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<DocumentType>('invoice')
  const [warning, setWarning] = useState<string>()
  const documents = shipment.documents ?? []

  const upload = (files: FileList | null) => {
    setWarning(undefined)
    for (const file of Array.from(files ?? [])) {
      const base = { type, name: file.name, size: file.size }
      if (file.size > MAX_STORED_FILE) {
        addShipmentDocument(shipment.id, base)
        setWarning(t('Large files are saved as a record only until we have a server.'))
        continue
      }
      const reader = new FileReader()
      reader.onload = () => {
        const ok = addShipmentDocument(shipment.id, { ...base, dataUrl: String(reader.result) })
        if (!ok) setWarning(t('Browser storage is full: the file was saved as a record only.'))
      }
      reader.readAsDataURL(file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <SectionCard
      title="Documents"
      action={
        canEdit && (
          <div className="flex items-center gap-2">
            <NativeSelect
              aria-label={t('Document type')}
              className="h-8 w-36 text-xs"
              value={type}
              onChange={(e) => setType(e.target.value as DocumentType)}
            >
              {DOCUMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(documentTypeLabels[value])}
                </option>
              ))}
            </NativeSelect>
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <Paperclip />
              {t('Attach')}
            </Button>
            <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
          </div>
        )
      }
    >
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('No documents yet. Attaching is optional: invoice, packing list, CMR, AWB, B/L, certificates.')}
        </p>
      ) : (
        <ul className="divide-y">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{doc.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t(documentTypeLabels[doc.type])} · {formatSize(doc.size)} · {formatDateTime(doc.uploadedAt)}
                </div>
              </div>
              {doc.dataUrl && (
                <Button asChild size="icon-sm" variant="ghost" aria-label={t('Download')}>
                  <a href={doc.dataUrl} download={doc.name}>
                    <Download />
                  </a>
                </Button>
              )}
              {canEdit && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t('Delete')}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeShipmentDocument(shipment.id, doc.id)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {warning && <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">{warning}</p>}
    </SectionCard>
  )
}

// Оплата по шипменту: инвойсы клиенту и сколько он уже заплатил
function PaymentSection({ shipment }: { shipment: Shipment }) {
  const invoices = useInvoices().filter((inv) => inv.shipmentId === shipment.id)
  const { canEditPayments, canEditInvoices } = usePermissions()
  const [paying, setPaying] = useState<Invoice>()
  // Нет котировки — сумму инвойса вводим руками
  const [manualOpen, setManualOpen] = useState(false)
  const { paid, total, currency } = shipmentPayment(shipment.id, invoices)
  const share = total ? Math.min(1, paid / total) : 0

  return (
    <SectionCard
      title="Payment"
      action={
        canEditInvoices && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => (shipment.quotationId ? createInvoiceFromShipment(shipment.id) : setManualOpen(true))}
          >
            <Plus />
            {t('Create invoice')}
          </Button>
        )
      }
    >
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('No invoice for this shipment yet.')}</p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span>
                {t('Paid')}: <span className="font-semibold tabular-nums">{formatMoney(paid, currency)}</span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                {t('of')} {formatMoney(total, currency)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', share >= 1 ? 'bg-emerald-500' : 'bg-amber-500')}
                style={{ width: `${share * 100}%` }}
              />
            </div>
          </div>
          <ul className="divide-y rounded-lg border">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <Receipt className="size-4 text-muted-foreground" />
                <Link to="/payments" className="text-sm font-medium text-primary hover:underline">
                  {inv.number}
                </Link>
                <InvoiceStatusBadge status={inv.status} />
                <span className="ml-auto text-sm tabular-nums">
                  {formatMoney(inv.paid, inv.currency)} / {formatMoney(invoiceTotals(inv).total, inv.currency)}
                </span>
                {canEditPayments && inv.status !== 'paid' && (
                  <Button size="sm" variant="outline" onClick={() => setPaying(inv)}>
                    {t('Record payment')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <RecordPaymentDialog invoice={paying} onOpenChange={(open) => !open && setPaying(undefined)} />
      <ManualInvoiceDialog shipmentId={shipment.id} open={manualOpen} onOpenChange={setManualOpen} />
    </SectionCard>
  )
}

function ManualInvoiceDialog({
  shipmentId,
  open,
  onOpenChange,
}: {
  shipmentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const settings = useSettings()
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>(settings.defaultCurrency)
  const [error, setError] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) return setError(t('Enter an amount greater than 0'))
    createInvoiceFromShipment(shipmentId, { amount: value, currency })
    setAmount('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('Create invoice')}</DialogTitle>
            <DialogDescription>{t('This shipment has no quotation, so enter the amount to bill.')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <FormField label="Amount" htmlFor="invoice-amount" required error={error}>
              <Input
                id="invoice-amount"
                type="number"
                min={0}
                value={amount}
                aria-invalid={!!error}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError(undefined)
                }}
                autoFocus
              />
            </FormField>
            <FormField label="Currency" htmlFor="invoice-currency" required>
              <NativeSelect
                id="invoice-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit">{t('Create invoice')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
