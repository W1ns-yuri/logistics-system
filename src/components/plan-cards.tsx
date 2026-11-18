import type { ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'

import {
  monthlyPrice,
  paymentAmount,
  planFeatures,
  planLabels,
  planLimits,
  planSeats,
  RECOMMENDED_PLAN,
  seatPrice,
  TRIAL_DAYS,
  YEAR_PRICE_MONTHS,
  type Plan,
} from '@/data/plans'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

/*
 * Карточки тарифов: одни и те же на регистрации и в Настройках → Подписка.
 * В карточке — цена за выбранный срок, что входит (галочки) и чего нет (прочерк), чтобы разница была видна сразу.
 * Команда больше, чем мест в тарифе, — в цене сразу видны дополнительные места.
 */

export type Period = 1 | 12

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`

// Что входит в тариф: строки для карточки
function featureRows(plan: Plan, compact: boolean): { text: string; on: boolean }[] {
  const limits = planLimits[plan]
  const f = planFeatures[plan]
  // Узкая карточка на регистрации: короткие строки, чтобы не переносились в столбик
  if (compact)
    return [
      { text: t('Up to {n} users', { n: planSeats[plan] ?? 0 }), on: true },
      { text: limits ? t('{n} shipments / mo', { n: limits.shipments }) : t('No limits'), on: true },
      { text: t('Analytics'), on: f.analytics },
      { text: t('Logo on documents'), on: f.logo },
    ]
  const rows = [
    { text: t('Up to {n} users', { n: planSeats[plan] ?? 0 }), on: true },
    {
      text: limits
        ? t('{q} quotations and {s} shipments a month', { q: limits.quotations, s: limits.shipments })
        : t('Unlimited quotations and shipments'),
      on: true,
    },
    { text: t('Analytics: profit, margin, customers'), on: f.analytics },
    { text: t('Your logo on PDF documents'), on: f.logo },
  ]
  return [
    ...rows,
    { text: t('Results of each employee'), on: f.memberResults },
    { text: t('Export to Excel'), on: f.export },
  ]
}

// Переключатель «помесячно / на год»
export function PeriodToggle({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  return (
    <div className="inline-flex h-9 rounded-lg border bg-muted/50 p-0.5" role="radiogroup" aria-label={t('Billing period')}>
      {([1, 12] as const).map((period) => (
        <button
          key={period}
          type="button"
          role="radio"
          aria-checked={value === period}
          data-period={period}
          onClick={() => onChange(period)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 text-sm transition-colors',
            value === period ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {period === 1 ? t('Monthly') : t('Yearly')}
          {period === 12 && (
            <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
              {t('2 months free')}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// Цена за срок: $20 / мес или $200 / год ($16.67 в месяц)
function Price({ plan, period, extraSeats, compact }: { plan: Plan; period: Period; extraSeats: number; compact: boolean }) {
  const total = paymentAmount(plan, period, extraSeats)
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{money(total)}</span>
        <span className="text-sm text-muted-foreground">/ {period === 12 ? t('year') : t('mo')}</span>
      </div>
      <div className="mt-0.5 min-h-4 text-xs text-muted-foreground tabular-nums">
        {period === 12 && (
          <>
            {t('{price} a month', { price: money((monthlyPrice(plan, extraSeats) * YEAR_PRICE_MONTHS) / 12) })}
            {!compact && (
              <span className="text-success">
                {' '}
                · {t('you save {amount}', { amount: money(monthlyPrice(plan, extraSeats) * (12 - YEAR_PRICE_MONTHS)) })}
              </span>
            )}
          </>
        )}
      </div>
      {extraSeats > 0 && (
        <div className="mt-1 text-xs text-muted-foreground tabular-nums" data-testid="extra-seats-line">
          {compact
            ? t('incl. +{n} users', { n: extraSeats })
            : t('Includes {n} extra users × {price} / mo', { n: extraSeats, price: money(seatPrice(plan)) })}
        </div>
      )}
    </div>
  )
}

function CardShell({
  selected,
  recommended,
  onClick,
  testId,
  children,
}: {
  selected: boolean
  recommended?: boolean
  onClick: () => void
  testId: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'relative flex w-full flex-col rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/50',
        recommended && 'border-primary/40',
        selected && 'border-primary bg-primary/[0.03] ring-2 ring-primary',
      )}
    >
      {children}
    </button>
  )
}

function Features({ rows }: { rows: { text: string; on: boolean }[] }) {
  return (
    <ul className="mt-4 space-y-2 border-t pt-4 text-sm">
      {rows.map((row) => (
        <li key={row.text} className={cn('flex items-start gap-2', !row.on && 'text-muted-foreground/70')}>
          {row.on ? (
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <Minus className="mt-0.5 size-4 shrink-0" />
          )}
          <span className={cn(!row.on && 'line-through decoration-muted-foreground/40')}>{row.text}</span>
        </li>
      ))}
    </ul>
  )
}

/*
 * plans — какие тарифы показать; 'trial' — карточка «Пробный период» (на регистрации).
 * extraSeats(plan) — сколько мест сверх тарифа нужно этой команде.
 * current — тариф, который уже оплачен: на нём пометка «Ваш тариф».
 */
export function PlanCards({
  plans,
  value,
  onChange,
  period,
  extraSeats = () => 0,
  current,
  compact = false,
}: {
  plans: (Plan | 'trial')[]
  value: Plan | 'trial'
  onChange: (plan: Plan | 'trial') => void
  period: Period
  extraSeats?: (plan: Plan) => number
  current?: Plan
  compact?: boolean
}) {
  return (
    <div className={cn('grid gap-3', plans.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
      {plans.map((plan) => {
        if (plan === 'trial')
          return (
            <CardShell key="trial" selected={value === 'trial'} onClick={() => onChange('trial')} testId="plan-card-trial">
              <div className="flex min-h-6 items-center text-sm font-semibold">{t(planLabels.trial)}</div>
              <div className="mt-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums">$0</span>
                  <span className="text-sm text-muted-foreground">/ {t('{n} days', { n: TRIAL_DAYS })}</span>
                </div>
                <div className="mt-0.5 min-h-4 text-xs text-muted-foreground">{t('Choose a plan later')}</div>
              </div>
              <Features
                rows={[
                  { text: t('Up to {n} users', { n: planSeats.trial ?? 5 }), on: true },
                  { text: t('All features'), on: true },
                  { text: t('No payment now'), on: true },
                ]}
              />
            </CardShell>
          )
        const recommended = plan === RECOMMENDED_PLAN
        return (
          <CardShell
            key={plan}
            selected={value === plan}
            recommended={recommended}
            onClick={() => onChange(plan)}
            testId={`plan-card-${plan}`}
          >
            <div className="flex min-h-6 items-center justify-between gap-2">
              <span className="text-sm font-semibold">{t(planLabels[plan])}</span>
              {current === plan ? (
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t('Your plan')}
                </span>
              ) : (
                recommended && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                    {t('Recommended')}
                  </span>
                )
              )}
            </div>
            <div className="mt-3">
              <Price plan={plan} period={period} extraSeats={extraSeats(plan)} compact={compact} />
            </div>
            <Features rows={featureRows(plan, compact)} />
          </CardShell>
        )
      })}
    </div>
  )
}
