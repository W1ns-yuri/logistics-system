import { Download, FileText, Paperclip, Pencil, Trash2, Wallet } from 'lucide-react'
import { useRef, useState } from 'react'

import { ConfirmDelete } from '@/components/confirm-delete'
import { RecordPaymentDialog } from '@/components/record-payment-dialog'
import { InvoiceStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/data/auth'
import { deleteInvoice, removePayment, updatePayment } from '@/data/store'
import { t } from '@/i18n'
import { invoiceTotals } from '@/lib/calculation'
import { formatSize, readReceipt } from '@/lib/files'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { paymentMethodLabels, type Invoice, type Payment } from '@/types/invoice'
import { InvoiceFormDialog } from './invoice-form-dialog'
import { InvoicePreview } from './invoice-preview'

// Карточка инвойса как в приложении клиента: сверху остаток, ниже вкладки Details / Payments
export function InvoicePanel({ invoice, onDeleted }: { invoice: Invoice; onDeleted: () => void }) {
  const { canEditPayments, canEditInvoices } = usePermissions()
  const [paying, setPaying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { balanceDue } = invoiceTotals(invoice)
  const money = (v: number) => formatMoney(v, invoice.currency)

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4 bg-primary/[0.06] px-6 py-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{invoice.number}</h2>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">{invoice.billTo}</div>
          <div className="mt-4 text-xs text-muted-foreground">{t('Balance due')}</div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">{money(Math.max(0, balanceDue))}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEditInvoices && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil />
                {t('Edit')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 />
                {t('Delete')}
              </Button>
            </>
          )}
          {canEditPayments && (
            <Button size="sm" disabled={invoice.status === 'paid'} onClick={() => setPaying(true)}>
              <Wallet />
              {t('Record payment')}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="payments" className="gap-0">
        <div className="border-y px-6 pt-2">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger value="details">{t('Details')}</TabsTrigger>
            <TabsTrigger value="payments">
              {t('Payments')} ({invoice.payments.length})
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="details" className="bg-muted/30 p-6">
          <InvoicePreview invoice={invoice} />
        </TabsContent>
        <TabsContent value="payments" className="p-0">
          <PaymentsList invoice={invoice} />
        </TabsContent>
      </Tabs>

      <RecordPaymentDialog invoice={paying ? invoice : undefined} onOpenChange={(open) => !open && setPaying(false)} />
      <InvoiceFormDialog invoice={editing ? invoice : undefined} onOpenChange={(open) => !open && setEditing(false)} />
      <ConfirmDelete
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('Delete invoice {ref}?', { ref: invoice.number })}
        description="The invoice and all its payments will be removed. This cannot be undone."
        onConfirm={() => {
          deleteInvoice(invoice.id)
          onDeleted()
        }}
      />
    </section>
  )
}

function PaymentsList({ invoice }: { invoice: Invoice }) {
  const { canEditPayments, canEditInvoices } = usePermissions()
  const [removing, setRemoving] = useState<Payment>()
  const [editing, setEditing] = useState<Payment>()
  const { total } = invoiceTotals(invoice)
  const money = (v: number) => formatMoney(v, invoice.currency)

  if (!invoice.payments.length) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
        <Wallet className="size-5" />
        {t('No payments yet.')}
      </div>
    )
  }

  // Самые свежие сверху, как в приложении клиента
  const payments = [...invoice.payments].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <ul className="divide-y">
        {payments.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
            <div className="min-w-48 flex-1">
              <div className="font-medium">
                {t('Payment')} # {p.number}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(p.date)}
                {p.reference && <> · {p.reference}</>}
              </div>
            </div>
            <ReceiptCell invoiceId={invoice.id} payment={p} canAttach={canEditPayments} />
            <div className="min-w-40 text-right whitespace-nowrap">
              <div className="font-semibold tabular-nums">{money(p.amount)}</div>
              <div className="text-sm text-muted-foreground">
                {t(paymentMethodLabels[p.method])}
                {p.discount > 0 && (
                  <span className="ml-1 text-amber-600 dark:text-warning">
                    · {t('discount')} {money(p.discount)}
                  </span>
                )}
              </div>
            </div>
            {canEditPayments && (
              <Button size="icon-sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(p)}>
                <Pencil />
              </Button>
            )}
            {canEditInvoices && (
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t('Delete')}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setRemoving(p)}
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <dl className="ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 border-t px-6 py-4 text-sm">
        <dt className="text-muted-foreground">{t('Total')}</dt>
        <dd className="text-right font-medium tabular-nums">{money(total)}</dd>
        <dt className="text-muted-foreground">{t('Payment made')}</dt>
        <dd className="text-right text-destructive tabular-nums">(−) {money(invoice.paid)}</dd>
        <dt className="text-muted-foreground">{t('Payment discount')}</dt>
        <dd className="text-right text-destructive tabular-nums">(−) {money(invoice.discount)}</dd>
        <dt className="font-semibold">{t('Balance due')}</dt>
        <dd className="text-right font-semibold tabular-nums">
          {money(Math.max(0, invoiceTotals(invoice).balanceDue))}
        </dd>
      </dl>
      <ConfirmDelete
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(undefined)}
        title={t('Delete payment {ref}?', { ref: removing?.number ?? '' })}
        description="The balance due will go back up by this amount."
        onConfirm={() => removing && removePayment(invoice.id, removing.id)}
      />
      <RecordPaymentDialog
        invoice={editing ? invoice : undefined}
        payment={editing}
        onOpenChange={(open) => !open && setEditing(undefined)}
      />
    </>
  )
}

// Чек к оплате: открыть, если есть; приложить, если нет (бухгалтер тоже может)
function ReceiptCell({ invoiceId, payment, canAttach }: { invoiceId: string; payment: Payment; canAttach: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const [warning, setWarning] = useState(false)
  const receipt = payment.receipt

  if (receipt) {
    const content = (
      <>
        <FileText className="size-4 shrink-0 text-primary" />
        <span className="max-w-40 truncate">{receipt.name}</span>
        <span className="text-xs text-muted-foreground">{formatSize(receipt.size)}</span>
        {receipt.dataUrl && <Download className="size-3.5 text-muted-foreground" />}
      </>
    )
    const cls = cn(
      'inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm',
      receipt.dataUrl && 'hover:bg-muted',
    )
    return receipt.dataUrl ? (
      <a href={receipt.dataUrl} download={receipt.name} className={cls} title={t('Receipt')}>
        {content}
      </a>
    ) : (
      <span className={cls} title={t('Large files are saved as a record only until we have a server.')}>
        {content}
      </span>
    )
  }

  if (!canAttach) return <span className="text-xs text-muted-foreground">{t('No receipt')}</span>
  return (
    <>
      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => ref.current?.click()}>
        <Paperclip />
        {t('Attach receipt')}
      </Button>
      <input
        ref={ref}
        type="file"
        hidden
        accept="image/*,application/pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const ok = updatePayment(invoiceId, payment.id, { receipt: await readReceipt(file) })
          setWarning(!ok)
        }}
      />
      {warning && (
        <span className="text-xs text-amber-600">
          {t('Browser storage is full: the file was saved as a record only.')}
        </span>
      )}
    </>
  )
}
