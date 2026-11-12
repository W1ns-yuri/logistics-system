import { useRef, useState, type FormEvent } from 'react'

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
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import {
  addDays,
  daysLeft,
  extendLicense,
  paymentAmount,
  periodEnd,
  planLabels,
  renewalPlan,
  todayIso,
  type Company,
  type Plan,
} from '@/data/platform'
import { t } from '@/i18n'
import { apiErrorText } from '@/lib/api'
import { formatDate } from '@/lib/format'

const PAID_PLANS: Plan[] = ['lite', 'lite_plus', 'standard']
const PERIODS = [1, 2, 3, 6, 12]

/*
 * Принять оплату лицензии. Раньше это были две кнопки «+1 месяц» и «+1 год», и лишний клик
 * записывал лишнюю оплату. Теперь окно: видно, за что и до какого числа платят, сумму можно поменять,
 * а перед записью — второй шаг «Проверьте»: случайный клик ничего не продлит.
 */
export function RecordPaymentDialog({
  company,
  open,
  onOpenChange,
}: {
  company: Company
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // Компания оставила заявку «Хочу оплатить» — подставляем её тариф и срок
  const startPlan = company.planRequest?.plan ?? renewalPlan(company)
  const startMonths = company.planRequest?.months ?? 1
  const [months, setMonths] = useState(startMonths)
  const [plan, setPlan] = useState<Plan>(startPlan)
  const [amount, setAmount] = useState(String(paymentAmount(startPlan, startMonths)))
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  // Двойной клик: второй клик приходит раньше, чем React успевает выключить кнопку
  const sending = useRef(false)
  const shownAt = useRef(0)
  const [error, setError] = useState('')

  const from = daysLeft(company) < 0 ? todayIso() : addDays(company.paidUntil, 1)
  const until = periodEnd(from, months)
  const value = Number(amount)
  const valid = amount.trim() !== '' && Number.isFinite(value) && value >= 0 && value <= 1_000_000

  // Поменяли период или тариф — подставляем цену по прайсу заново
  const pick = (nextMonths: number, nextPlan: Plan) => {
    setMonths(nextMonths)
    setPlan(nextPlan)
    setAmount(String(paymentAmount(nextPlan, nextMonths)))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    // Первый шаг — только показать, что будет записано
    if (!confirming) {
      shownAt.current = Date.now()
      return setConfirming(true)
    }
    // Двойной клик по «Продолжить» не должен сразу нажать «Подтвердить» на том же месте
    if (sending.current || Date.now() - shownAt.current < 700) return
    sending.current = true
    setBusy(true)
    setError('')
    extendLicense(company.id, months, { plan, amount: Math.round(value * 100) / 100 })
      // После успеха окно закрывается. Флаг не сбрасываем: каждое открытие — новое окно (key у родителя)
      .then(() => onOpenChange(false))
      .catch((e: unknown) => {
        sending.current = false
        setError(t(apiErrorText(e)))
      })
      .finally(() => setBusy(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{t('Record payment')}</DialogTitle>
            <DialogDescription>{company.name}</DialogDescription>
          </DialogHeader>
          {confirming ? (
            <div className="space-y-2 rounded-md border bg-muted/50 p-4 text-sm" data-testid="pay-confirm">
              <div className="font-medium">{t('Check before recording')}</div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">{t('Company')}</dt>
                <dd>
                  {company.name} · {company.adminEmail}
                </dd>
                <dt className="text-muted-foreground">{t('Plan')}</dt>
                <dd>{t(planLabels[plan])}</dd>
                <dt className="text-muted-foreground">{t('Period')}</dt>
                <dd>{t('{n} mo.', { n: months })}</dd>
                <dt className="text-muted-foreground">{t('Amount')}</dt>
                <dd className="font-semibold tabular-nums">${Math.round(value * 100) / 100}</dd>
                <dt className="text-muted-foreground">{t('License')}</dt>
                <dd>
                  {formatDate(from)} → <span className="font-semibold">{formatDate(until)}</span>
                </dd>
              </dl>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pay-period">{t('Period')}</Label>
                <NativeSelect id="pay-period" value={months} onChange={(e) => pick(Number(e.target.value), plan)}>
                  {PERIODS.map((n) => (
                    <option key={n} value={n}>
                      {n === 12 ? t('1 year (10 months price)') : t('{n} mo.', { n })}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-plan">{t('Plan')}</Label>
                <NativeSelect id="pay-plan" value={plan} onChange={(e) => pick(months, e.target.value as Plan)}>
                  {PAID_PLANS.map((p) => (
                    <option key={p} value={p}>
                      {t(planLabels[p])}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pay-amount">{t('Amount received, USD')}</Label>
                <Input
                  id="pay-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(',', '.'))}
                  aria-invalid={!valid}
                />
                <p className="text-xs text-muted-foreground">
                  {t('By the price list: {price}. Change it if you agreed on a different price.', {
                    price: `$${paymentAmount(plan, months)}`,
                  })}
                </p>
              </div>
            </div>
          )}
          {!confirming && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              {t('License from {from} to {until}', { from: formatDate(from), until: formatDate(until) })}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            {confirming ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirming(false)}>
                {t('Back')}
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('Cancel')}
              </Button>
            )}
            <Button type="submit" disabled={!valid || busy}>
              {confirming ? t('Confirm payment') : t('Continue')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
