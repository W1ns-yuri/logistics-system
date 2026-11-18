import { useState } from 'react'
import { CheckCircle2, Mail, Minus, Plus } from 'lucide-react'

import { PeriodToggle, PlanCards, type Period } from '@/components/plan-cards'
import { Button } from '@/components/ui/button'
import {
  paymentAmount,
  planLabels,
  planSeats,
  promoDiscount,
  RECOMMENDED_PLAN,
  requestPlan,
  seatPrice,
  SOLD_PLANS,
  useCurrentCompany,
  type Plan,
} from '@/data/platform'
import { useSettings } from '@/data/settings'
import { useTeam } from '@/data/store'
import { t } from '@/i18n'
import { apiErrorText } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

export const SUPPORT_EMAIL = 'support@omniroute.app'

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`

/*
 * «Оплатить или сменить тариф». Онлайн-оплаты пока нет: компания выбирает тариф, срок и места,
 * заявка уходит владельцу платформы, он присылает счёт (перевод или наличные) и после оплаты продлевает лицензию.
 * Экран продаёт: сравнение тарифов с галочками, выгода года, итог и понятное «что будет дальше».
 */
export function PlanPurchase() {
  const company = useCurrentCompany()
  const team = useTeam()
  const settings = useSettings()
  const request = company?.planRequest
  const wanted = request?.plan ?? (company?.plan !== 'trial' ? company?.plan : undefined) ?? company?.profile?.plannedPlan
  const [plan, setPlan] = useState<Plan>(wanted && SOLD_PLANS.includes(wanted) ? wanted : RECOMMENDED_PLAN)
  const [period, setPeriod] = useState<Period>(request?.months === 12 ? 12 : 1)
  // Сколько человек будет работать: из заявки, из оплаченных мест, из регистрации или по команде — что больше
  const [people, setPeople] = useState(() => {
    const requested = request ? (planSeats[request.plan] ?? 0) + (request.extraSeats ?? 0) : 0
    const paidFor = company && company.plan !== 'trial' ? (planSeats[company.plan] ?? 0) + (company.extraSeats ?? 0) : 0
    return Math.max(1, team.length, requested, paidFor, company?.profile?.teamCount ?? 0)
  })
  // Места сверх тарифа считаются для каждого тарифа свои: в Basic 3 места, в Lite 5
  const extraFor = (p: Plan) => Math.max(0, people - (planSeats[p] ?? people))
  const extra = extraFor(plan)
  const [editing, setEditing] = useState(!request)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!company) return null
  // Приглашённая компания (бесплатный доступ) ещё ни разу не платила: −30% на первый месяц
  const discount = company.promoUntil && !company.payments.length ? promoDiscount(plan) : 0
  const total = paymentAmount(plan, period, extra) - discount
  const current = company.plan !== 'trial' ? company.plan : undefined

  const send = () => {
    if (busy) return
    setBusy(true)
    setError('')
    requestPlan(plan, period, extra)
      .then(() => setEditing(false))
      .catch((e: unknown) => setError(t(apiErrorText(e))))
      .finally(() => setBusy(false))
  }

  // Заявка отправлена: что заказано и что будет дальше
  if (request && !editing)
    return (
      <div className="space-y-4 rounded-xl border border-success/30 bg-success/5 p-5" data-testid="plan-request-sent">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <div className="min-w-0">
            <div className="font-semibold">
              {t('Request sent: {plan}, {period}', {
                plan: t(planLabels[request.plan]),
                period: request.months === 12 ? t('1 year') : t('1 month'),
              })}
              {!!request.extraSeats && `, +${t('{n} extra users', { n: request.extraSeats })}`}
            </div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {t('{date} · amount {amount}', {
                date: formatDateTime(request.at),
                amount: money(paymentAmount(request.plan, request.months, request.extraSeats ?? 0) - discount),
              })}
            </div>
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            t('We send an invoice to {email} within one working day.', { email: settings.companyEmail || company.adminEmail }),
            t('You pay it by bank transfer or in cash.'),
            t('The license is extended as soon as the payment arrives. Work continues without a pause.'),
          ].map((text, index) => (
            <li key={index} className="flex gap-2 rounded-lg bg-background p-3 text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-[11px] font-semibold text-white">
                {index + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {t('Change the request')}
          </Button>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Mail className="size-4" />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    )

  return (
    <div className="space-y-4" data-testid="plan-purchase">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('Pick a plan. A yearly payment costs 10 months.')}</p>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      <PlanCards
        plans={SOLD_PLANS}
        value={plan}
        onChange={(p) => p !== 'trial' && setPlan(p)}
        period={period}
        extraSeats={extraFor}
        current={current}
      />

      {/* Команда больше, чем в тарифе: места докупаются по цене места внутри тарифа */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
        <div className="min-w-0 text-sm">
          <div className="font-medium">{t('People in the system')}</div>
          <div className="text-muted-foreground">
            {t('{plan} includes {n}. Each extra user is {price} / mo.', {
              plan: t(planLabels[plan]),
              n: planSeats[plan] ?? 0,
              price: money(seatPrice(plan)),
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={t('Fewer')}
            disabled={people <= 1}
            onClick={() => setPeople((n) => Math.max(1, n - 1))}
          >
            <Minus />
          </Button>
          <span className="w-8 text-center font-semibold tabular-nums" data-testid="people">
            {people}
          </span>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={t('More')}
            disabled={people >= 100}
            onClick={() => setPeople((n) => Math.min(100, n + 1))}
          >
            <Plus />
          </Button>
        </div>
      </div>

      {discount > 0 && (
        <p className="text-sm text-success" data-testid="promo-discount">
          {t('You were with us from the start: {percent}% off the first month.', { percent: 30 })}
        </p>
      )}

      {/* Итог и одна главная кнопка */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/60 px-4 py-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">
            {t(planLabels[plan])} · {period === 12 ? t('1 year') : t('1 month')} · {t('{n} users', { n: Math.max(people, planSeats[plan] ?? 0) })}
          </div>
          <div className="text-2xl font-semibold tabular-nums" data-testid="plan-total">
            {discount > 0 && (
              <span className="mr-2 text-base font-normal text-muted-foreground line-through">
                {money(paymentAmount(plan, period, extra))}
              </span>
            )}
            {money(total)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {request && (
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              {t('Cancel')}
            </Button>
          )}
          <Button type="button" size="lg" onClick={send} disabled={busy} data-testid="plan-send">
            {request ? t('Update the request') : t('Get an invoice for {amount}', { amount: money(total) })}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t('Payment is by bank transfer or in cash against our invoice. The license is extended as soon as we receive it.')}
      </p>
    </div>
  )
}
