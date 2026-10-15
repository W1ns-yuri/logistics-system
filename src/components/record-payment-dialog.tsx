import { useState, type FormEvent } from 'react'

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
import { recordPayment } from '@/data/store'
import { t } from '@/i18n'
import { invoiceTotals } from '@/lib/calculation'
import { formatMoney } from '@/lib/format'
import type { Invoice } from '@/types/invoice'

// Окно «Внести оплату»: бухгалтер вводит сумму, которую клиент перевёл
export function RecordPaymentDialog({
  invoice,
  onOpenChange,
}: {
  invoice?: Invoice
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {invoice && <PaymentForm invoice={invoice} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PaymentForm({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const { total } = invoiceTotals(invoice)
  const balance = Math.max(0, total - invoice.paid)
  const [amount, setAmount] = useState(balance ? String(balance) : '')
  const [error, setError] = useState<string>()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) return setError(t('Enter an amount greater than 0'))
    recordPayment(invoice.id, value)
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
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button type="submit">{t('Save payment')}</Button>
      </DialogFooter>
    </form>
  )
}
