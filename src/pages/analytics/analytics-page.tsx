import { ArrowDownRight, ArrowUpRight, CircleDot, MapPin, PackageCheck, Ship, Truck } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { PageHeader } from '@/components/page-header'
import { TransportModeIcon } from '@/components/transport-mode'
import { useInvoices, useQuotations, useShipments, useVendors } from '@/data/store'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { transportModeLabels, type TransportMode } from '@/types/logistics'
import { buildAnalytics, PERIODS, type Period } from './analytics-data'
import { RevenueChart, BarList, Donut, LegendRow, Sparkline } from './charts'
import { monthLabel, usd, usdShort } from './format'

const modeColors: Record<TransportMode, string> = {
  road: 'var(--chart-3)',
  sea: 'var(--chart-1)',
  air: 'var(--chart-4)',
  rail: 'var(--chart-2)',
}

export function AnalyticsPage() {
  const quotations = useQuotations()
  const shipments = useShipments()
  const invoices = useInvoices()
  const vendors = useVendors()
  const [period, setPeriod] = useState<Period>(6)

  const data = useMemo(
    () => buildAnalytics({ period, quotations, shipments, invoices, vendors }),
    [period, quotations, shipments, invoices, vendors],
  )
  const trend = data.trend.map((p, i) => ({
    label: monthLabel(p.month),
    bar: p.revenue,
    line: p.profit,
    // Текущий месяц ещё идёт — рисуем его штриховкой
    partial: i === data.trend.length - 1,
  }))
  const modeTotal = data.modes.reduce((acc, m) => acc + m.count, 0)

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <PageHeader
        title="Analytics"
        description="Revenue, profit and operations at a glance. Amounts are in USD at demo rates."
        actions={
          <div className="inline-flex rounded-lg border bg-muted/50 p-0.5" role="tablist">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="tab"
                aria-selected={period === p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  period === p.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t(p.label)}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={usd(data.kpis.revenue.value)}
          delta={data.kpis.revenue.delta}
          spark={data.trend.map((p) => p.revenue)}
          color="var(--chart-1)"
        />
        <KpiCard
          label="Gross profit"
          value={usd(data.kpis.profit.value)}
          delta={data.kpis.profit.delta}
          spark={data.trend.map((p) => p.profit)}
          color="var(--chart-2)"
        />
        <KpiCard
          label="Avg. margin"
          value={`${data.kpis.margin.value.toFixed(1)}%`}
          delta={data.kpis.margin.delta}
          deltaUnit="pp"
          spark={data.trend.map((p) => (p.revenue ? p.profit / p.revenue : 0))}
          color="var(--chart-4)"
        />
        <KpiCard
          label="Shipments"
          value={String(data.kpis.shipments.value)}
          delta={data.kpis.shipments.delta}
          spark={data.trend.map((p) => p.shipments)}
          color="var(--chart-3)"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Revenue & profit by month"
          className="xl:col-span-2"
          action={
            <div className="flex items-center gap-4 text-xs">
              <LegendRow color="var(--chart-1)" label={t('Revenue')} />
              <LegendRow color="var(--chart-2)" label={t('Gross profit')} />
            </div>
          }
        >
          <RevenueChart
            data={trend}
            height={340}
            format={usdShort}
            barLabel={t('Revenue')}
            lineLabel={t('Gross profit')}
            partialLabel={t('month in progress')}
          />
        </Panel>

        <Panel title="Shipments by mode">
          <div className="flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row">
            <Donut
              centerLabel={t('shipments')}
              segments={data.modes.map((m) => ({
                key: m.mode,
                label: t(transportModeLabels[m.mode]),
                value: m.count,
                color: modeColors[m.mode],
              }))}
            />
            <ul className="w-full flex-1 space-y-2.5">
              {data.modes.map((m) => (
                <li key={m.mode} className="flex items-center gap-3 text-sm">
                  <span
                    className="flex size-8 items-center justify-center rounded-lg"
                    style={{ background: `color-mix(in oklch, ${modeColors[m.mode]} 16%, transparent)` }}
                  >
                    <TransportModeIcon mode={m.mode} className="text-foreground" />
                  </span>
                  <span className="flex-1">{t(transportModeLabels[m.mode])}</span>
                  <span className="font-medium tabular-nums">{m.count}</span>
                  <span className="w-11 text-right text-xs text-muted-foreground tabular-nums">
                    {modeTotal ? Math.round((m.count / modeTotal) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Top customers" description="By revenue in the period">
          {data.customers.length ? (
            <BarList
              format={usdShort}
              rows={data.customers.slice(0, 6).map((c) => ({
                key: c.name,
                label: c.name,
                value: c.revenue,
                hint: t('{n} shp.', { n: c.shipments }),
              }))}
            />
          ) : (
            <Empty />
          )}
        </Panel>

        <ConversionPanel funnel={data.funnel} />
        <ReceivablesPanel receivables={data.receivables} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Top routes" className="xl:col-span-2 [&>div:last-child]:px-0 [&>div:last-child]:pb-0">
          {data.routes.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2.5 font-medium">{t('Route')}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t('Shipments')}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t('Revenue')}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t('Gross profit')}</th>
                    <th className="px-5 py-2.5 text-right font-medium">{t('Margin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.routes.slice(0, 7).map((r) => {
                    const margin = r.revenue ? (r.profit / r.revenue) * 100 : 0
                    return (
                      <tr key={`${r.from}-${r.to}`} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-2.5">
                            <span
                              className="flex size-7 shrink-0 items-center justify-center rounded-md"
                              style={{ background: `color-mix(in oklch, ${modeColors[r.mode]} 16%, transparent)` }}
                            >
                              <TransportModeIcon mode={r.mode} className="size-3.5 text-foreground" />
                            </span>
                            <span className="font-medium">{r.from}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{r.to}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.shipments}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{usd(r.revenue)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{usd(r.profit)}</td>
                        <td className="px-5 py-3 text-right">
                          <MarginPill value={margin} />
                        </td>
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
          <Panel title="Right now" description="Shipments on the way">
            <div className="grid grid-cols-4 gap-2">
              {data.pipeline.map((p, i) => {
                const Icon = [PackageCheck, Truck, MapPin, CircleDot][i]!
                return (
                  <div key={p.status} className="rounded-lg border bg-muted/30 p-2.5 text-center">
                    <Icon
                      className={cn('mx-auto size-4', p.status === 'at_border' ? 'text-warning' : 'text-primary')}
                    />
                    <div className="mt-1.5 text-xl font-semibold tabular-nums">{p.count}</div>
                    <div className="text-[11px] leading-tight text-muted-foreground">{t(statusLabel[p.status])}</div>
                  </div>
                )
              })}
            </div>
          </Panel>
          <Panel title="Vendors" description="Shipments carried in the period">
            {data.vendors.length ? (
              <BarList
                color="var(--chart-2)"
                format={(v) => String(v)}
                rows={data.vendors.slice(0, 5).map((v) => ({ key: v.name, label: v.name, value: v.count }))}
              />
            ) : (
              <Empty />
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

const statusLabel: Record<string, string> = {
  loaded: 'Loaded',
  in_transit: 'In transit',
  at_border: 'At the border',
  delivered: 'Delivered',
}

export function Panel({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('flex flex-col rounded-xl border bg-card shadow-xs', className)}>
      <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div>
          <h2 className="text-sm font-semibold">{t(title)}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{t(description)}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 px-5 pb-5">{children}</div>
    </section>
  )
}

export function KpiCard({
  label,
  value,
  delta,
  deltaUnit = '%',
  spark,
  color,
}: {
  label: string
  value: string
  delta?: number
  deltaUnit?: '%' | 'pp'
  spark: number[]
  color: string
}) {
  const up = (delta ?? 0) >= 0
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-xs">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
      <div className="text-sm text-muted-foreground">{t(label)}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-[1.65rem] leading-none font-semibold tracking-tight tabular-nums">{value}</div>
        <Sparkline values={spark} color={color} />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs">
        {delta === undefined ? (
          <span className="text-muted-foreground">{t('No earlier data to compare with')}</span>
        ) : (
          <>
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums',
                up ? 'bg-success/12 text-success' : 'bg-destructive/10 text-destructive',
              )}
            >
              {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(delta).toFixed(1)}
              {deltaUnit === 'pp' ? ' pp' : '%'}
            </span>
            <span className="text-muted-foreground">{t('vs previous period')}</span>
          </>
        )}
      </div>
    </div>
  )
}

function MarginPill({ value }: { value: number }) {
  const tone =
    value >= 12
      ? 'bg-success/12 text-success'
      : value >= 8
        ? 'bg-primary/10 text-primary'
        : 'bg-warning/15 text-amber-700 dark:text-warning'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium tabular-nums', tone)}>{value.toFixed(1)}%</span>
  )
}

function ConversionPanel({ funnel }: { funnel: ReturnType<typeof buildAnalytics>['funnel'] }) {
  const parts = [
    { key: 'won', label: 'Won', value: funnel.won, color: 'var(--chart-2)' },
    { key: 'open', label: 'In progress', value: funnel.open, color: 'var(--chart-1)' },
    { key: 'lost', label: 'Lost', value: funnel.lost, color: 'var(--chart-5)' },
  ]
  return (
    <Panel title="Quotation conversion" description="Won out of decided quotations">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">{Math.round(funnel.conversion)}%</span>
        <span className="text-sm text-muted-foreground">{t('{n} quotations', { n: funnel.created })}</span>
      </div>
      <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted">
        {parts.map((p) =>
          p.value ? (
            <div
              key={p.key}
              className="h-full transition-[width] duration-700"
              style={{ width: `${(p.value / Math.max(funnel.created, 1)) * 100}%`, background: p.color }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {parts.map((p) => (
          <div key={p.key}>
            <LegendRow color={p.color} label={t(p.label)} />
            <div className="mt-1 pl-[18px] text-lg font-semibold tabular-nums">{p.value}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function ReceivablesPanel({ receivables }: { receivables: ReturnType<typeof buildAnalytics>['receivables'] }) {
  const colors = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-5)', 'oklch(0.5 0.2 25)']
  return (
    <Panel title="Receivables" description="What customers still owe, by due date">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">{usdShort(receivables.total)}</span>
        <span className="text-sm text-muted-foreground">{t('outstanding')}</span>
      </div>
      <div className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted">
        {receivables.buckets.map((b, i) =>
          b.amount ? (
            <div
              key={b.key}
              className="h-full"
              style={{ width: `${(b.amount / Math.max(receivables.total, 1)) * 100}%`, background: colors[i] }}
            />
          ) : null,
        )}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {receivables.buckets.map((b, i) => (
          <li key={b.key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-[3px]" style={{ background: colors[i] }} />
            <span className="flex-1 text-muted-foreground">{t(b.label)}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{t('{n} inv.', { n: b.count })}</span>
            <span className="w-20 text-right font-medium tabular-nums">{usdShort(b.amount)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function Empty() {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <Ship className="size-5" />
      {t('No shipments in this period')}
    </div>
  )
}
