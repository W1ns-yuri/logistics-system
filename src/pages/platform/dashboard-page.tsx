import { useMemo } from 'react'
import { Link } from 'react-router'

import { DaysLeft, LicenseStatusBadge } from '@/components/license'
import { PageHeader } from '@/components/page-header'
import { planLabels, planPrice, useCompanies, type Plan } from '@/data/platform'
import { t } from '@/i18n'
import { countryLabel } from '@/lib/countries'
import { formatDate } from '@/lib/format'
import { Empty, KpiCard, Panel } from '@/pages/analytics/analytics-page'
import { BarList, Donut, LegendRow, RevenueChart } from '@/pages/analytics/charts'
import { monthLabel, usd, usdShort } from '@/pages/analytics/format'
import { buildPlatformAnalytics } from './platform-analytics'

const planColors: Record<Plan, string> = {
  trial: 'var(--chart-5)',
  start: 'var(--chart-1)',
  business: 'var(--chart-2)',
  enterprise: 'var(--chart-4)',
}

// Дашборд владельца платформы: деньги, новые клиенты, конверсия из пробного периода, продления
export function PlatformDashboardPage() {
  const companies = useCompanies()
  const data = useMemo(() => buildPlatformAnalytics(companies), [companies])
  const last = data.trend.length - 1
  const revenueTrend = data.trend.map((p, i) => ({
    label: monthLabel(p.month),
    bar: p.revenue,
    line: p.newRevenue,
    partial: i === last,
  }))
  const signupTrend = data.trend.map((p, i) => ({
    label: monthLabel(p.month),
    bar: p.signups,
    line: p.converted,
    partial: i === last,
  }))
  const donut = [
    ...data.planCounts.map((p) => ({
      key: p.plan,
      label: t(planLabels[p.plan]),
      value: p.count,
      color: planColors[p.plan],
    })),
    { key: 'trial', label: t('Trial'), value: data.onTrial, color: planColors.trial },
  ]

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <PageHeader
        title="Dashboard"
        description="How the platform earns: money from licenses, new companies and renewals. Last 12 months, USD."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="MRR"
          value={usd(data.kpis.mrr.value)}
          delta={data.kpis.mrr.delta}
          spark={data.trend.map((p) => p.mrr)}
          color="var(--chart-1)"
        />
        <KpiCard
          label="Revenue this month"
          value={usd(data.kpis.revenue.value)}
          delta={data.kpis.revenue.delta}
          spark={data.trend.map((p) => p.revenue)}
          color="var(--chart-2)"
        />
        <KpiCard
          label="New companies this month"
          value={String(data.kpis.signups.value)}
          delta={data.kpis.signups.delta}
          spark={data.trend.map((p) => p.signups)}
          color="var(--chart-3)"
        />
        <KpiCard
          label="Paying companies"
          value={String(data.kpis.paying.value)}
          delta={data.kpis.paying.delta}
          spark={data.trend.map((p) => p.paying)}
          color="var(--chart-4)"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Revenue by month"
          description="Inner bar: first payments of new companies"
          className="xl:col-span-2"
          action={
            <div className="flex items-center gap-4 text-xs">
              <LegendRow color="var(--chart-1)" label={t('All payments')} />
              <LegendRow color="var(--chart-2)" label={t('New companies')} />
            </div>
          }
        >
          <RevenueChart
            data={revenueTrend}
            height={320}
            format={usdShort}
            barLabel={t('All payments')}
            lineLabel={t('New companies')}
            partialLabel={t('month in progress')}
          />
        </Panel>

        <Panel title="Companies by plan" description="Paying now and on trial">
          <div className="flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
            <Donut centerLabel={t('companies')} segments={donut} />
            <ul className="w-full flex-1 space-y-2.5">
              {data.planCounts.map((p) => (
                <li key={p.plan} className="flex items-center gap-3 text-sm">
                  <span className="size-2.5 rounded-[3px]" style={{ background: planColors[p.plan] }} />
                  <span className="flex-1">
                    {t(planLabels[p.plan])}
                    <span className="ml-1.5 text-xs whitespace-nowrap text-muted-foreground">
                      ${planPrice[p.plan]}/{t('mo')}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{p.count}</span>
                </li>
              ))}
              <li className="flex items-center gap-3 text-sm">
                <span className="size-2.5 rounded-[3px]" style={{ background: planColors.trial }} />
                <span className="flex-1">{t('Trial')}</span>
                <span className="font-medium tabular-nums">{data.onTrial}</span>
              </li>
            </ul>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel
          title="New companies by month"
          description="Inner bar: of them started paying"
          className="xl:col-span-2"
          action={
            <div className="flex items-center gap-4 text-xs">
              <LegendRow color="var(--chart-1)" label={t('Registered')} />
              <LegendRow color="var(--chart-2)" label={t('Started paying')} />
            </div>
          }
        >
          <RevenueChart
            data={signupTrend}
            height={260}
            format={(v) => String(Math.round(v))}
            barLabel={t('Registered')}
            lineLabel={t('Started paying')}
            partialLabel={t('month in progress')}
          />
        </Panel>

        <Panel title="Trial conversion" description="Out of companies whose trial has ended">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">{Math.round(data.conversion)}%</span>
            <span className="text-sm text-muted-foreground">{t('started paying')}</span>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('Revenue in 12 months')}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{usd(data.totalRevenue)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('ARR')}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{usd(data.kpis.mrr.value * 12)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('Stopped paying')}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{data.churned}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('On trial now')}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{data.onTrial}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Renewals"
          description="License ends within 14 days or ended recently"
          className="xl:col-span-2 [&>div:last-child]:px-0 [&>div:last-child]:pb-0"
        >
          {data.renewals.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">{t('Company')}</th>
                    <th className="px-3 py-2.5 font-medium">{t('Plan')}</th>
                    <th className="px-3 py-2.5 font-medium">{t('Paid until')}</th>
                    <th className="px-3 py-2.5 font-medium">{t('Status')}</th>
                    <th className="px-5 py-2.5 text-right font-medium">{t('Next payment')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.renewals.map((r) => {
                    const lastPayment = r.company.payments.at(-1)
                    const next = lastPayment?.amount ?? planPrice.start
                    return (
                      <tr key={r.company.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-5 py-3">
                          <Link to={`/platform/companies/${r.company.id}`} className="font-medium hover:underline">
                            {r.company.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">{r.company.adminEmail}</div>
                        </td>
                        <td className="px-3 py-3">{t(planLabels[r.company.plan])}</td>
                        <td className="px-3 py-3 tabular-nums">
                          {formatDate(r.company.paidUntil)} <DaysLeft days={r.left} className="ml-1 text-xs" />
                        </td>
                        <td className="px-3 py-3">
                          <LicenseStatusBadge status={r.status} />
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">{usd(next)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 pb-5">
              <Empty />
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Top companies" description="By money paid in total">
            <BarList
              format={usdShort}
              rows={data.topCompanies.slice(0, 5).map((r) => ({
                key: r.company.id,
                label: r.company.name,
                value: r.revenue,
              }))}
            />
          </Panel>
          <Panel title="By country" description="Money paid in total">
            <BarList
              color="var(--chart-2)"
              format={usdShort}
              rows={data.countries.slice(0, 5).map((c) => ({
                key: c.country,
                label: countryLabel(c.country),
                value: c.revenue,
              }))}
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}
