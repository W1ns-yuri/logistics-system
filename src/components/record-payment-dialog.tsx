import { Paperclip, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'

import { FormField } from '@/components/form-field'
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
import { addPayment } from '@/data/store'
import { t } from '@/i18n'
import { invoiceTotals } from '@/lib/calculation'
import { readReceipt } from '@/lib/files'
import { formatMoney } from '@/lib/format'
import {
  PAYMENT_METHODS,
  paymentMethodLabels,
  type Invoice,
  type PaymentMethod,
  type PaymentReceipt,
} from '@/types/invoice'

// Окно «Внести оплату»: сумма, дата, способ, скидка и чек (по желанию)
export function RecordPaymentDialog({
  invoice,
  onOpenChange,
}: {
  invoice?: Invoice
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {invoice && <PaymentForm invoice={invoice} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PaymentForm({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const { total, balanceDue } = invoiceTotals(invoice)
  const balance = Math.max(0, balanceDue)
  const fileRef = useRef<HTMLInputElement>(null)
  const [amount, setAmount] = useState(balance ? String(Math.round(balance * 100) / 100) : '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer')
  const [discount, setDiscount] = useState('')
  const [reference, setReference] = useState('')
  const [receipt, setReceipt] = useState<PaymentReceipt>()
  const [error, setError] = useState<string>()
  const [warning, setWarning] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    const off = Number(discount) || 0
    if (!(value > 0) && !(off > 0)) return setError(t('Enter an amount greater than 0'))
    const ok = addPayment(invoice.id, {
      date,
      amount: value > 0 ? value : 0,
      discount: off,
      method,
      reference: reference.trim() || undefined,
      receipt,
    })
    if (!ok) setWarning(t('Browser storage is full: the file was saved as a record only.'))
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{t('Record payment')}</DialogTitle>
        <DialogDescription>
          {invoice.number} · {invoice.billTo}
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/50 p-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">{t('Total')}</div>
          <div className="font-medium tabular-nums">{formatMoney(total, invoice.currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('Paid')}</div>
          <div className="font-medium tabular-nums">{formatMoney(invoice.paid, invoice.currency)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{t('Balance due')}</div>
          <div className="font-medium tabular-nums">{formatMoney(balance, invoice.currency)}</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t('Amount, {currency}', { currency: invoice.currency })}
          htmlFor="payment-amount"
          required
          error={error}
        >
          <Input
            id="payment-amount"
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
        </FormField>
        <FormField label="Payment date" htmlFor="payment-date" required>
          <Input id="payment-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Payment method" htmlFor="payment-method" required>
          <NativeSelect id="payment-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(paymentMethodLabels[m])}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label={t('Discount, {currency}', { currency: invoice.currency })} htmlFor="payment-discount">
          <Input
            id="payment-discount"
            type="number"
            min={0}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </FormField>
        <FormField label="Reference" htmlFor="payment-reference" className="sm:col-span-2">
          <Input
            id="payment-reference"
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
