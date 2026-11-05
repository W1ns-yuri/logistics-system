import { AlertTriangle } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { cancelShipment, useInvoices } from '@/data/store'
import { t } from '@/i18n'
import { formatMoney } from '@/lib/format'
import type { Shipment } from '@/types/shipment'

// Суммы по валютам: { USD: 1200, TMT: 500 } → «1,200.00 USD + 500.00 TMT»
function byCurrency(list: { amount: number; currency: string }[]) {
  const sums = new Map<string, number>()
  for (const { amount, currency } of list) sums.set(currency, (sums.get(currency) ?? 0) + amount)
  return [...sums].filter(([, v]) => v > 0).map(([currency, v]) => formatMoney(v, currency))
}

/*
 * Отмена перевозки. Если деньги уже ходили (клиент платил, мы платили подрядчику),
 * отменить всё равно можно, но сначала показываем суммы и просим написать причину.
 * Возвраты денег отменой не делаются — их записывают отдельно.
 */
export function CancelShipmentDialog({
  shipment,
  open,
  onOpenChange,
}: {
  shipment: Shipment
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const invoices = useInvoices().filter((inv) => inv.shipmentId === shipment.id)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()

  const received = byCurrency(invoices.map((inv) => ({ amount: inv.paid, currency: inv.currency })))
  const paidOut = byCurrency(shipment.vendorPayments ?? [])
  const moneyMoved = received.length > 0 || paidOut.length > 0

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (reason.trim().length < 3) return setError(t('Write why the shipment is cancelled'))
    cancelShipment(shipment.id, reason.trim())
    setReason('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('Cancel shipment {number}?', { number: shipment.number })}</DialogTitle>
            <DialogDescription>
              {t(
                'After cancelling, the shipment is closed: no edits, payments or invoices. It disappears from Payments.',
              )}
            </DialogDescription>
          </DialogHeader>

          {moneyMoved && (
            <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm" role="alert">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4 text-warning-text" />
                {t('Money has already moved on this shipment')}
              </div>
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                {received.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">{t('Received from the customer')}</dt>
                    <dd className="text-right font-medium tabular-nums">{received.join(' + ')}</dd>
                  </>
                )}
                {paidOut.length > 0 && (
                  <>
                    <dt className="text-muted-foreground">{t('Paid to vendors')}</dt>
                    <dd className="text-right font-medium tabular-nums">{paidOut.join(' + ')}</dd>
                  </>
                )}
              </dl>
              <p className="text-xs text-muted-foreground">
                {t('Cancelling does not return this money. Agree refunds with the customer and vendors separately.')}
              </p>
            </div>
          )}

          <FormField label="Reason for cancelling" htmlFor="cancel-reason" required error={error}>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={reason}
              aria-invalid={!!error}
              placeholder={t('e.g. The customer cancelled the order, the cargo was not ready')}
              onChange={(e) => {
                setReason(e.target.value)
                setError(undefined)
              }}
              autoFocus
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Back')}
            </Button>
            <Button type="submit" variant="destructive">
              {t('Cancel shipment')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
