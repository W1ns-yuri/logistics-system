import {
  AlertTriangle,
  Download,
  FileText,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  X,
} from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { DateInput } from '@/components/date-input'
import { ConfirmDelete } from '@/components/confirm-delete'
import { FormField } from '@/components/form-field'
import { RecordPaymentDialog } from '@/components/record-payment-dialog'
import { SectionCard } from '@/components/section-card'
import { InvoiceStatusBadge } from '@/components/status-badge'
import { PrintMenu } from '@/components/print-menu'
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
  addExtraCharge,
  createInvoiceFromShipment,
  deleteInvoice,
  removeExtraCharge,
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
import { acceptFor, fileError, readReceipt, RECEIPT_TYPES } from '@/lib/files'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { InvoiceFormDialog } from '@/pages/payments/invoice-form-dialog'
import { printInvoice } from '@/pages/payments/invoice-print-page'
import {
  PAYMENT_METHODS,
  paymentMethodLabels,
  type Invoice,
  type Payment,
  type PaymentMethod,
  type PaymentReceipt,
} from '@/types/invoice'
import { CURRENCIES, type Currency } from '@/types/logistics'
import type { ExtraCharge, Shipment, VendorPayment } from '@/types/shipment'

/*
 * Оплаты по перевозке в двух частях (попросил заказчик):
 * 1. Оплаты клиента — инвойсы клиенту и что он по ним заплатил.
 * 2. Оплаты подрядчикам — сколько мы заплатили перевозчику/агенту (наши расходы).
 */

export function CustomerPaymentsSection({ shipment, locked }: { shipment: Shipment; locked?: boolean }) {
  const invoices = useInvoices().filter((inv) => inv.shipmentId === shipment.id)
  const permissions = usePermissions()
  // Отменённая перевозка: смотреть можно, менять нельзя
  const canEditPayments = permissions.canEditPayments && !locked
  const canEditInvoices = permissions.canEditInvoices && !locked
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
            // Первый счёт берём из котировки, следующие только вручную, чтобы не выставить ту же сумму дважды
            onClick={() =>
              shipment.quotationId && !invoices.length ? createInvoiceFromShipment(shipment.id) : setManualOpen(true)
            }
          >
            <Plus />
            {invoices.length ? t('Add invoice') : t('Create invoice')}
          </Button>
        )
      }
    >
      {invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('No invoice for this shipment yet.')}</p>
      ) : (
        <div className="space-y-4">
          <Progress paid={paid} total={total} currency={currency} />
          {/* Каждый инвойс — своя карточка: сумма, сколько заплачено, остаток и все оплаты по датам */}
          {invoices.map((inv) => {
            const { total: invoiceTotal, balanceDue } = invoiceTotals(inv)
            return (
              <article key={inv.id} className="rounded-lg border" data-testid="invoice-card">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-muted/30 px-3 py-2.5">
                  <Receipt className="size-4 text-muted-foreground" />
                  <Link to="/payments" className="text-sm font-semibold text-primary hover:underline">
                    {inv.number}
                  </Link>
                  <InvoiceStatusBadge status={inv.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(inv.invoiceDate)} · {t('due {date}', { date: formatDate(inv.dueDate) })}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <PrintMenu variant="ghost" label="PDF" onPrint={(language) => printInvoice(inv.id, language)} />
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
                </div>
                <dl className="grid grid-cols-3 gap-3 px-3 py-2.5 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('Total')}</dt>
                    <dd className="font-medium tabular-nums">{formatMoney(invoiceTotal, inv.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('Paid')}</dt>
                    <dd className="font-medium text-success tabular-nums">{formatMoney(inv.paid, inv.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{t('Balance due')}</dt>
                    <dd className={cn('font-semibold tabular-nums', balanceDue > 0.005 && 'text-warning-text')}>
                      {formatMoney(Math.max(0, balanceDue), inv.currency)}
                    </dd>
                  </div>
                </dl>
                <div className="border-t px-3 py-2">
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    {t('Payments ({n})', { n: inv.payments.length })}
                  </div>
                  {inv.payments.length === 0 ? (
                    <p className="py-1 text-sm text-muted-foreground">{t('No payments yet.')}</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {[...inv.payments]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((p) => (
                          <PaymentRow
                            key={p.id}
                            title={formatDate(p.date)}
                            details={[p.number, t(paymentMethodLabels[p.method]), p.reference]}
                            amount={formatMoney(p.amount, inv.currency)}
                            receipt={p.receipt}
                            onEdit={canEditPayments ? () => setPaying({ invoice: inv, payment: p }) : undefined}
                            onDelete={canEditInvoices ? () => setRemoving({ invoice: inv, payment: p }) : undefined}
                          />
                        ))}
                    </ul>
                  )}
                </div>
              </article>
            )
          })}
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

export function VendorPaymentsSection({ shipment, locked }: { shipment: Shipment; locked?: boolean }) {
  const quotation = useQuotation(shipment.quotationId)
  const vendors = useVendors()
  const permissions = usePermissions()
  const canEditPayments = permissions.canEditPayments && !locked
  const canEditInvoices = permissions.canEditInvoices && !locked
  const [form, setForm] = useState<{ payment?: VendorPayment }>()
  const [removing, setRemoving] = useState<VendorPayment>()
  const [extraOpen, setExtraOpen] = useState(false)
  const [removingExtra, setRemovingExtra] = useState<ExtraCharge>()
  const extras = shipment.extraCharges ?? []
  const payments = [...(shipment.vendorPayments ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  // Сколько должны подрядчикам — себестоимость из калькуляции котировки.
  // В одной перевозке может быть несколько подрядчиков, поэтому считаем по каждому.
  const costCurrency = quotation?.currency
  // Доплаты сверх расчёта (штраф, простой) увеличивают долг подрядчику
  const extrasIn = (vendorId?: string) =>
    extras
      .filter((c) => c.currency === costCurrency && (vendorId === undefined || c.vendorId === vendorId))
      .reduce((acc, c) => acc + c.amount, 0)
  const cost = (quotation ? quotationTotals(quotation).cost : 0) + extrasIn()
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
  for (const c of extras)
    if (c.vendorId && c.currency === costCurrency) owed.set(c.vendorId, (owed.get(c.vendorId) ?? 0) + c.amount)
  for (const p of payments) if (p.vendorId && !owed.has(p.vendorId)) owed.set(p.vendorId, 0)
  const byVendor = [...owed].map(([vendorId, amount]) => ({ vendorId, owed: amount, paid: paidTo(vendorId) }))
  // Сколько ещё должны подрядчику (может быть меньше нуля — значит, переплатили)
  const balance = (vendorId: string) => (owed.get(vendorId) ?? 0) - paidTo(vendorId)
  const remaining = (vendorId: string) => Math.max(0, balance(vendorId))
  const defaultVendorId = byVendor.find((row) => row.owed > row.paid)?.vendorId ?? shipment.vendorId ?? ''

  return (
    <SectionCard
      title="Vendor payments"
      action={
        canEditPayments && (
          <div className="flex flex-wrap gap-2">
            {costCurrency && (
              <Button size="sm" variant="ghost" onClick={() => setExtraOpen(true)}>
                <Plus />
                {t('Extra charge')}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setForm({})}>
              <Plus />
              {t('Record vendor payment')}
            </Button>
          </div>
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
                <th className="py-1 text-right font-medium">{t('Owed')}</th>
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
                      row.owed > row.paid ? 'text-warning-text' : 'text-success',
                    )}
                  >
                    {formatMoney(Math.max(0, row.owed - row.paid), costCurrency)}
                    {row.paid - row.owed > 0.005 && (
                      <div className="text-xs font-normal text-destructive">
                        {t('Overpaid {amount}', { amount: formatMoney(row.paid - row.owed, costCurrency) })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {extras.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">{t('Extra charges')}</div>
            <ul className="space-y-1 rounded-lg border border-warning/40 bg-warning/5 p-2" data-testid="extra-charges">
              {extras.map((c) => (
                <PaymentRow
                  key={c.id}
                  title={`${vendorName(c.vendorId)} · ${c.reason}`}
                  details={[formatDate(c.date)]}
                  amount={`+${formatMoney(c.amount, c.currency)}`}
                  onDelete={canEditInvoices ? () => setRemovingExtra(c) : undefined}
                />
              ))}
            </ul>
          </div>
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
        balance={balance}
        vendorName={vendorName}
        onOpenChange={(open) => !open && setForm(undefined)}
      />
      {costCurrency && (
        <ExtraChargeDialog
          open={extraOpen}
          onOpenChange={setExtraOpen}
          shipment={shipment}
          currency={costCurrency}
          defaultVendorId={shipment.vendorId ?? byVendor[0]?.vendorId ?? ''}
        />
      )}
      <ConfirmDelete
        open={!!removingExtra}
        onOpenChange={(open) => !open && setRemovingExtra(undefined)}
        title={t('Delete extra charge?')}
        description="The amount we owe the vendor goes down by this charge."
        onConfirm={() => removingExtra && removeExtraCharge(shipment.id, removingExtra.id)}
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
  balance: (vendorId: string) => number
  vendorName: (vendorId?: string) => string
}

const round = (value: number) => (value ? String(Math.round(value * 100) / 100) : '')

function VendorPaymentForm({
  payment,
  shipment,
  defaultVendorId,
  costCurrency,
  remaining,
  balance,
  vendorName,
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
  const [extraReason, setExtraReason] = useState('')
  const [reasonError, setReasonError] = useState<string>()

  // Переплата: платим больше, чем должны этому подрядчику по расчёту и доплатам.
  // При исправлении оплаты её старая сумма уже входит в «оплачено», поэтому прибавляем её обратно
  const value = Number(amount)
  const owedNow = vendorId ? balance(vendorId) + (payment?.vendorId === vendorId ? payment.amount : 0) : 0
  const over =
    vendorId && costCurrency && currency === costCurrency && value > 0
      ? Math.round((value - Math.max(0, owedNow)) * 100) / 100
      : 0

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!(value > 0)) return setError(t('Enter an amount greater than 0'))
    if (over > 0 && extraReason.trim().length < 3) {
      setReasonError(t('Write what the extra payment is for'))
      document.getElementById('vendor-extra-reason')?.focus()
      return
    }
    // Переплату записываем отдельной строкой с причиной: долг подрядчику растёт на эту сумму
    if (over > 0) addExtraCharge(shipment.id, { vendorId, amount: over, currency, reason: extraReason.trim(), date })
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
          <DateInput id="vendor-payment-date" value={date} clearable={false} onChange={setDate} />
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
            accept={acceptFor(RECEIPT_TYPES)}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              const problem = await fileError(file, RECEIPT_TYPES)
              setWarning(problem)
              if (!problem) setReceipt(await readReceipt(file))
            }}
          />
        </FormField>
      </div>
      {over > 0 && (
        <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-text" />
            <span>
              {t(
                'This is {over} more than we owe {vendor} ({owed}). Write why, and the difference is saved as an extra charge.',
                {
                  over: formatMoney(over, currency),
                  vendor: vendorName(vendorId),
                  owed: formatMoney(Math.max(0, owedNow), currency),
                },
              )}
            </span>
          </div>
          <FormField label="Reason for the extra payment" htmlFor="vendor-extra-reason" required error={reasonError}>
            <Input
              id="vendor-extra-reason"
              value={extraReason}
              aria-invalid={!!reasonError}
              placeholder={t('e.g. Fine for an expired certificate')}
              onChange={(e) => {
                setExtraReason(e.target.value)
                setReasonError(undefined)
              }}
            />
          </FormField>
        </div>
      )}
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

// Доплата подрядчику без оплаты: например, штраф выставили, а заплатим позже
function ExtraChargeDialog({
  open,
  onOpenChange,
  shipment,
  currency,
  defaultVendorId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: Shipment
  currency: Currency
  defaultVendorId: string
}) {
  const [vendorId, setVendorId] = useState(defaultVendorId)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    const next = {
      amount: value > 0 ? undefined : t('Enter an amount greater than 0'),
      reason: reason.trim().length >= 3 ? undefined : t('Write what the extra payment is for'),
    }
    setErrors(next)
    if (next.amount || next.reason) return
    addExtraCharge(shipment.id, {
      vendorId: vendorId || undefined,
      amount: value,
      currency,
      reason: reason.trim(),
      date: new Date().toISOString().slice(0, 10),
    })
    setAmount('')
    setReason('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('Extra charge')}</DialogTitle>
            <DialogDescription>
              {t(
                'A cost on top of the calculation: a fine, demurrage, overweight. We will owe the vendor this much more.',
              )}
            </DialogDescription>
          </DialogHeader>
          <FormField label="Vendor" htmlFor="extra-vendor">
            <VendorPicker id="extra-vendor" value={vendorId} mode={shipment.mode} onChange={setVendorId} />
          </FormField>
          <FormField
            label={t('Amount, {currency}', { currency })}
            htmlFor="extra-amount"
            required
            error={errors.amount}
          >
            <Input
              id="extra-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              aria-invalid={!!errors.amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </FormField>
          <FormField label="Reason" htmlFor="extra-reason" required error={errors.reason}>
            <Input
              id="extra-reason"
              value={reason}
              aria-invalid={!!errors.reason}
              placeholder={t('e.g. Fine for an expired certificate')}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit">{t('Add charge')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
