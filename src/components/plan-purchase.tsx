import { useState } from 'react'
import { Check, Mail } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  paymentAmount,
  planLabels,
  planSeats,
  requestPlan,
  useCurrentCompany,
  type Plan,
} from '@/data/platform'
import { t } from '@/i18n'
import { apiErrorText } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export const SUPPORT_EMAIL = 'support@omniroute.app'
const PAID: Plan[] = ['lite', 'lite_plus', 'standard']

/*
 * «Хочу оплатить». Онлайн-оплаты пока нет: компания выбирает тариф и срок, заявка уходит владельцу платформы,
 * он связывается и присылает счёт (перевод или наличные). После оплаты владелец продлевает лицензию в админке.
 */
export function PlanPurchase() {
  const company = useCurrentCompany()
  const start = company?.planRequest?.plan ?? (company?.plan !== 'trial' ? company?.plan : undefined) ?? company?.profile?.plannedPlan ?? 'standard'
  const [plan, setPlan] = useState<Plan>(start)
  const [months, setMonths] = useState(company?.planRequest?.months === 12 ? 12 : 1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!company) return null
  const request = company.planRequest

  const send = () => {
    if (busy) return
    setBusy(true)
    setError('')
    requestPlan(plan, months)
      .catch((e: unknown) => setError(t(apiErrorText(e))))
      .finally(() => setBusy(false))
  }

  return (
    <div className="space-y-4" data-testid="plan-purchase">
      <div className="grid gap-2 sm:grid-cols-3">
        {PAID.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={plan === p}
            onClick={() => setPlan(p)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors hover:bg-accent',
              plan === p && 'border-primary bg-primary/5 ring-1 ring-primary',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{t(planLabels[p])}</span>
              {p === 'standard' && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                  {t('Recommended')}
                </span>
              )}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              ${paymentAmount(p, 1)} <span className="text-xs font-normal text-muted-foreground">/ {t('mo')}</span>
            </div>
            <div className="text-xs text-muted-foreground">{t('Up to {n} users', { n: planSeats[p] ?? 0 })}</div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {[1, 12].map((n) => (
          <Button key={n} type="button" size="sm" variant={months === n ? 'default' : 'outline'} onClick={() => setMonths(n)}>
            {n === 12 ? t('1 year (2 months free)') : t('1 month')}
          </Button>
        ))}
        <span className="ml-auto text-sm">
          {t('Total')}: <span className="font-semibold tabular-nums">${paymentAmount(plan, months)}</span>
        </span>
      </div>
      {request && (
        <p className="flex items-start gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success" role="status">
          <Check className="mt-0.5 size-4 shrink-0" />
          {t('Request sent {date}: {plan}, {n} mo. We will contact you with payment details. You can change it and send again.', {
            date: formatDateTime(request.at),
            plan: t(planLabels[request.plan]),
            n: request.months,
          })}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={send} disabled={busy}>
          {request ? t('Send again') : t('I want to pay')}
        </Button>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <Mail className="size-4" />
          {SUPPORT_EMAIL}
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        {t('Payment is by bank transfer or in cash against our invoice. The license is extended as soon as we receive it.')}
      </p>
    </div>
  )
}
