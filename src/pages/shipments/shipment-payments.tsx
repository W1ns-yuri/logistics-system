import { Download, FileText, MoreHorizontal, Paperclip, Pencil, Plus, Receipt, Trash2, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { ConfirmDelete } from '@/components/confirm-delete'
import { FormField } from '@/components/form-field'
import { RecordPaymentDialog } from '@/components/record-payment-dialog'
import { SectionCard } from '@/components/section-card'
import { InvoiceStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { VendorPicker } from '@/components/vendor-picker'
import { usePermissions } from '@/data/auth'
import { useSettings } from '@/data/settings'
import {
  createInvoiceFromShipment,
  deleteInvoice,
  removePayment,
  removeVendorPayment,
  saveVendorPayment,
  shipmentPayment,
  useInvoices,
  useQuotation,
  useVendors,
} from '@/data/store'
import { t } from '@/i18n'
import { chargeTotals, invoiceTotals, quotationTotals } from '@/lib/calculation'
import { readReceipt } from '@/lib/files'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { InvoiceFormDialog } from '@/pages/payments/invoice-form-dialog'
import {
  PAYMENT_METHODS,
  paymentMethodLabels,
  type Invoice,
  type Payment,
  type PaymentMethod,
  type PaymentReceipt,
} from '@/types/invoice'
import { CURRENCIES, type Currency } from '@/types/logistics'
import type { Shipment, VendorPayment } from '@/types/shipment'

/*
 * Оплаты по перевозке в двух частях (попросил заказчик):
 * 1. Оплаты клиента — инвойсы клиенту и что он по ним заплатил.
 * 2. Оплаты подрядчикам — сколько мы заплатили перевозчику/агенту (наши расходы).
 */

export function CustomerPaymentsSection({ shipment }: { shipment: Shipment }) {
  const invoices = useInvoices().filter((inv) => inv.shipmentId === shipment.id)
  const { canEditPayments, canEditInvoices } = usePermissions()
  const [paying, setPaying] = useState<{ invoice: Invoice; payment?: Payment }>()
  const [editing, setEditing] = useState<Invoice>()
  const [deleting, setDeleting] = useState<Invoice>()
  const [removing, setRemoving] = useState<{ invoice: Invoice; payment: Payment }>()
  // Нет котировки — сумму инвойса вводим руками
  const [manualOpen, setManualOpen] = useState(false)
  const { paid, total, currency } = shipmentPayment(shipment.id, invoices)

  return (
    <SectionCard
      title="Customer payments"
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
          <Progress paid={paid} total={total} currency={currency} />
          <ul className="divide-y rounded-lg border">
            {invoices.map((inv) => (
              <li key={inv.id} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Receipt className="size-4 text-muted-foreground" />
                  <Link to="/payments" className="text-sm font-medium text-primary hover:underline">
                    {inv.number}
                  </Link>
                  <InvoiceStatusBadge status={inv.status} />
                  <span className="ml-auto text-sm tabular-nums">
                    {formatMoney(inv.paid, inv.currency)} / {formatMoney(invoiceTotals(inv).total, inv.currency)}
                  </span>
                  {canEditPayments && inv.status !== 'paid' && (
                    <Button size="sm" variant="outline" onClick={() => setPaying({ invoice: inv })}>
                      {t('Record payment')}
                    </Button>
                  )}
                  {canEditInvoices && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label={t('More')}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(inv)}>
                          <Pencil />
                          {t('Edit invoice')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setDeleting(inv)}
                        >
                          <Trash2 />
                          {t('Delete invoice')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {inv.payments.length > 0 && (
                  <ul className="mt-2 space-y-1 border-l-2 pl-3 sm:ml-7">
                    {[...inv.payments]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((p) => (
                        <PaymentRow
                          key={p.id}
                          title={p.number}
                          details={[formatDate(p.date), t(paymentMethodLabels[p.method]), p.reference]}
                          amount={formatMoney(p.amount, inv.currency)}
                          receipt={p.receipt}
                          onEdit={canEditPayments ? () => setPaying({ invoice: inv, payment: p }) : undefined}
                          onDelete={canEditInvoices ? () => setRemoving({ invoice: inv, payment: p }) : undefined}
                        />
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <RecordPaymentDialog
        invoice={paying?.invoice}
        payment={paying?.payment}
        onOpenChange={(open) => !open && setPaying(undefined)}
      />
      <InvoiceFormDialog invoice={editing} onOpenChange={(open) => !open && setEditing(undefined)} />
      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={t('Delete invoice {ref}?', { ref: deleting?.number ?? '' })}
        description="The invoice and all its payments will be removed. This cannot be undone."
        onConfirm={() => deleting && deleteInvoice(deleting.id)}
      />
      <ConfirmDelete
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={t('Delete payment {ref}?', { ref: removing?.payment.number ?? '' })}
        description="The balance due will go back up by this amount."
        onConfirm={() => removing && removePayment(removing.invoice.id, removing.payment.id)}
      />
      <ManualInvoiceDialog shipmentId={shipment.id} open={manualOpen} onOpenChange={setManualOpen} />
    </SectionCard>
  )
}

export function VendorPaymentsSection({ shipment }: { shipment: Shipment }) {
  const quotation = useQuotation(shipment.quotationId)
  const vendors = useVendors()
  const { canEditPayments, canEditInvoices } = usePermissions()
  const [form, setForm] = useState<{ payment?: VendorPayment }>()
  const [removing, setRemoving] = useState<VendorPayment>()
  const payments = [...(shipment.vendorPayments ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  // Сколько должны подрядчикам — себестоимость из калькуляции котировки.
  // В одной перевозке может быть несколько подрядчиков, поэтому считаем по каждому.
  const cost = quotation ? quotationTotals(quotation).cost : 0
  const costCurrency = quotation?.currency
  const paidTo = (vendorId?: string) =>
    payments
      .filter((p) => p.currency === costCurrency && (vendorId === undefined || p.vendorId === vendorId))
      .reduce((acc, p) => acc + p.amount, 0)
  const paidInCost = paidTo()
  const vendorName = (id?: string) => vendors.find((v) => v.id === id)?.name ?? '—'
  const owed = new Map<string, number>()
  for (const charge of quotation?.charges ?? []) {
    if (charge.vendorId) owed.set(charge.vendorId, (owed.get(charge.vendorId) ?? 0) + chargeTotals(charge).cost)
  }
  for (const p of payments) if (p.vendorId && !owed.has(p.vendorId)) owed.set(p.vendorId, 0)
  const byVendor = [...owed].map(([vendorId, amount]) => ({ vendorId, owed: amount, paid: paidTo(vendorId) }))
  const remaining = (vendorId: string) => Math.max(0, (owed.get(vendorId) ?? 0) - paidTo(vendorId))
  const defaultVendorId = byVendor.find((row) => row.owed > row.paid)?.vendorId ?? shipment.vendorId ?? ''

  return (
    <SectionCard
      title="Vendor payments"
      action={
        canEditPayments && (
          <Button size="sm" variant="outline" onClick={() => setForm({})}>
            <Plus />
            {t('Record vendor payment')}
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {cost > 0 && costCurrency && (
          <Progress paid={paidInCost} total={cost} currency={costCurrency} label="Paid to vendors" />
        )}
        {costCurrency && byVendor.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1 font-medium">{t('Vendor')}</th>
                <th className="py-1 text-right font-medium">{t('By calculation')}</th>
                <th className="py-1 text-right font-medium">{t('Paid')}</th>
                <th className="py-1 text-right font-medium">{t('Left to pay')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {byVendor.map((row) => (
                <tr key={row.vendorId}>
                  <td className="py-1.5">{vendorName(row.vendorId)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(row.owed, costCurrency)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatMoney(row.paid, costCurrency)}</td>
                  <td
                    className={cn(
                      'py-1.5 text-right font-medium tabular-nums',
                      row.owed > row.paid ? 'text-amber-600 dark:text-warning' : 'text-success',
                    )}
                  >
                    {formatMoney(Math.max(0, row.owed - row.paid), costCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('No payments to vendors yet.')}</p>
        ) : (
          <ul className="space-y-1 rounded-lg border p-2">
            {payments.map((p) => (
              <PaymentRow
                key={p.id}
                title={`${p.number} · ${vendorName(p.vendorId)}`}
                details={[formatDate(p.date), t(paymentMethodLabels[p.method]), p.reference]}
                amount={formatMoney(p.amount, p.currency)}
                receipt={p.receipt}
                onEdit={canEditPayments ? () => setForm({ payment: p }) : undefined}
                onDelete={canEditInvoices ? () => setRemoving(p) : undefined}
              />
            ))}
          </ul>
        )}
      </div>
      <VendorPaymentDialog
        open={!!form}
        payment={form?.payment}
        shipment={shipment}
        defaultVendorId={defaultVendorId}
        costCurrency={costCurrency}
        remaining={remaining}
        onOpenChange={(open) => !open && setForm(undefined)}
      />
      <ConfirmDelete
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={t('Delete payment {ref}?', { ref: removing?.number ?? '' })}
        description="This payment to the vendor will be removed. This cannot be undone."
        onConfirm={() => removing && removeVendorPayment(shipment.id, removing.id)}
      />
    </SectionCard>
  )
}

function Progress({
  paid,
  total,
  currency,
  label = 'Paid',
}: {
  paid: number
  total: number
  currency: string
  label?: string
}) {
  const share = total ? Math.min(1, paid / total) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>
          {t(label)}: <span className="font-semibold tabular-nums">{formatMoney(paid, currency)}</span>
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
  )
}

// Одна оплата: номер, дата/способ, чек, сумма и кнопки «исправить» / «удалить»
function PaymentRow({
  title,
  details,
  amount,
  receipt,
  onEdit,
  onDelete,
}: {
  title: string
  details: (string | undefined)[]
  amount: string
  receipt?: PaymentReceipt
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
      <div className="min-w-40 flex-1">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{details.filter(Boolean).join(' · ')}</div>
      </div>
      {receipt &&
        (receipt.dataUrl ? (
          <a
            href={receipt.dataUrl}
            download={receipt.name}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Download className="size-3.5" />
            <span className="max-w-32 truncate">{receipt.name}</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            <span className="max-w-32 truncate">{receipt.name}</span>
          </span>
        ))}
      <span className="font-semibold tabular-nums">{amount}</span>
      {onEdit && (
        <Button size="icon-sm" variant="ghost" aria-label={t('Edit')} onClick={onEdit}>
          <Pencil />
        </Button>
      )}
      {onDelete && (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t('Delete')}
          className="text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      )}
    </li>
  )
}

function VendorPaymentDialog({
  open,
  payment,
  shipment,
  onOpenChange,
  ...rest
}: {
  open: boolean
  payment?: VendorPayment
  shipment: Shipment
  onOpenChange: (open: boolean) => void
} & Suggestion) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <VendorPaymentForm payment={payment} shipment={shipment} {...rest} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

// Подсказка суммы: сколько ещё должны выбранному подрядчику по расчёту котировки
type Suggestion = {
  defaultVendorId: string
  costCurrency?: Currency
  remaining: (vendorId: string) => number
}

const round = (value: number) => (value ? String(Math.round(value * 100) / 100) : '')

function VendorPaymentForm({
  payment,
  shipment,
  defaultVendorId,
  costCurrency,
  remaining,
  onDone,
}: {
  payment?: VendorPayment
  shipment: Shipment
  onDone: () => void
} & Suggestion) {
  const settings = useSettings()
  const fileRef = useRef<HTMLInputElement>(null)
  const [vendorId, setVendorId] = useState(payment?.vendorId ?? defaultVendorId)
  const [amount, setAmount] = useState(payment ? String(payment.amount) : round(remaining(defaultVendorId)))
  const [currency, setCurrency] = useState<Currency>(payment?.currency ?? costCurrency ?? settings.defaultCurrency)
  const pickVendor = (next: string) => {
    setVendorId(next)
    // Новая оплата: подставляем остаток долга именно этому подрядчику
    if (!payment) setAmount(round(remaining(next)))
  }
  const [date, setDate] = useState(() => payment?.date ?? new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<PaymentMethod>(payment?.method ?? 'bank_transfer')
  const [reference, setReference] = useState(payment?.reference ?? '')
  const [receipt, setReceipt] = useState<PaymentReceipt | undefined>(payment?.receipt)
  const [error, setError] = useState<string>()
  const [warning, setWarning] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!(value > 0)) return setError(t('Enter an amount greater than 0'))
    const ok = saveVendorPayment(
      shipment.id,
      {
        vendorId: vendorId || undefined,
        amount: value,
        currency,
        date,
        method,
        reference: reference.trim() || undefined,
        receipt,
      },
      payment?.id,
    )
    if (!ok) return setWarning(t('Browser storage is full: the file was saved as a record only.'))
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{payment ? t('Edit payment') : t('Record vendor payment')}</DialogTitle>
        <DialogDescription>
          {payment ? `${payment.number} · ` : ''}
          {shipment.number}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Vendor" htmlFor="vendor-payment-vendor" className="sm:col-span-2">
          <VendorPicker id="vendor-payment-vendor" value={vendorId} mode={shipment.mode} onChange={pickVendor} />
        </FormField>
        <FormField label="Amount" htmlFor="vendor-payment-amount" required error={error}>
          <div className="flex gap-2">
            <Input
              id="vendor-payment-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              aria-invalid={!!error}
              onChange={(e) => {
                setAmount(e.target.value)
                setError(undefined)
              }}
              autoFocus
            />
            <div className="w-24 shrink-0">
              <NativeSelect
                aria-label={t('Currency')}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </FormField>
        <FormField label="Payment date" htmlFor="vendor-payment-date" required>
          <Input id="vendor-payment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Payment method" htmlFor="vendor-payment-method" required>
          <NativeSelect
            id="vendor-payment-method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(paymentMethodLabels[m])}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Reference" htmlFor="vendor-payment-reference">
          <Input
            id="vendor-payment-reference"
            value={reference}
            placeholder={t('e.g. bank transfer or receipt number')}
            onChange={(e) => setReference(e.target.value)}
          />
        </FormField>
        <FormField label="Receipt" className="sm:col-span-2">
          {receipt ? (
            <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
              <Paperclip className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{receipt.name}</span>
              <button
                type="button"
                aria-label={t('Remove')}
                onClick={() => setReceipt(undefined)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip />
              {t('Attach receipt')}
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*,application/pdf"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) setReceipt(await readReceipt(file))
            }}
          />
        </FormField>
      </div>
      {warning && <p className="text-xs text-amber-600">{warning}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button type="submit">{t('Save payment')}</Button>
      </DialogFooter>
    </form>
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
