import { Check } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import {
  licenseStatus,
  planLabels,
  planPrice,
  planSeats,
  TRIAL_DAYS,
  useCompanies,
  YEAR_PRICE_MONTHS,
  type Plan,
} from '@/data/platform'
import { t } from '@/i18n'
import { usd } from '@/pages/analytics/format'

// Тарифы: цена, места, сколько компаний на каждом. Цены примерные — обсудим с клиентом
export function PlansPage() {
  const companies = useCompanies()
  const count = (plan: Plan) =>
    companies.filter((c) => {
      const status = licenseStatus(c)
      return c.plan === plan && status !== 'expired' && status !== 'blocked'
    }).length

  const cards: { plan: Plan; features: string[] }[] = [
    { plan: 'trial', features: ['All features', '{n}-day free period'] },
    { plan: 'start', features: ['All features', 'Email support'] },
    { plan: 'business', features: ['All features', 'Priority support', 'Help with data import'] },
    { plan: 'enterprise', features: ['All features', 'Unlimited users', 'Personal manager'] },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <PageHeader
        title="Plans"
        description="Prices are examples for the prototype. A yearly payment costs 10 months."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ plan, features }) => {
          const seats = planSeats[plan]
          return (
            <section key={plan} className="flex flex-col rounded-xl border bg-card p-5 shadow-xs">
              <h2 className="text-sm font-semibold">{t(planLabels[plan])}</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{usd(planPrice[plan])}</span>
                <span className="text-sm text-muted-foreground">/ {t('mo')}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan === 'trial'
                  ? t('{n} days', { n: TRIAL_DAYS })
                  : t('{price} per year', { price: usd(planPrice[plan] * YEAR_PRICE_MONTHS) })}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {seats === null ? t('Unlimited users') : t('Up to {n} users', { n: seats })}
                </li>
                {features
                  .filter((f) => f !== 'Unlimited users')
                  .map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {t(f, { n: TRIAL_DAYS })}
                    </li>
                  ))}
              </ul>
              <div className="mt-5 border-t pt-3 text-sm text-muted-foreground">
                {t('{n} companies now', { n: count(plan) })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
