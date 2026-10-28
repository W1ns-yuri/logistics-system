import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { periodEnd, planLabels, PLANS, todayIso, useCompanies, type LicensePayment } from '@/data/platform'
import { t } from '@/i18n'
import { formatDate } from '@/lib/format'
import { usd } from '@/pages/analytics/format'

type Row = LicensePayment & { companyId: string; company: string; until: string }

const columns: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    meta: { label: 'Date' },
    cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.date)}</span>,
  },
  {
    accessorKey: 'company',
    header: 'Company',
    meta: { label: 'Company' },
    enableHiding: false,
    cell: ({ row }) => <span className="font-medium">{row.original.company}</span>,
  },
  {
    accessorKey: 'plan',
    header: 'Plan',
    meta: { label: 'Plan' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => t(planLabels[row.original.plan]),
  },
  {
    accessorKey: 'months',
    header: 'Period',
    meta: { label: 'Period' },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.months === 12 ? t('1 year') : t('1 month')} ·{' '}
        {t('until {date}', { date: formatDate(row.original.until) })}
      </span>
    ),
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    meta: { label: 'Amount' },
    cell: ({ row }) => <span className="font-medium tabular-nums">{usd(row.original.amount)}</span>,
  },
]

// Все оплаты лицензий от всех компаний
export function LicensePaymentsPage() {
  const companies = useCompanies()
  const navigate = useNavigate()
  const rows = useMemo<Row[]>(
    () =>
      companies.flatMap((c) =>
        c.payments.map((p) => ({ ...p, companyId: c.id, company: c.name, until: periodEnd(p.from, p.months) })),
      ),
    [companies],
  )
  const month = todayIso().slice(0, 7)
  const sum = (list: Row[]) => list.reduce((acc, r) => acc + r.amount, 0)
  const thisMonth = rows.filter((r) => r.date.startsWith(month))
  const kpis = [
    { label: 'This month', value: usd(sum(thisMonth)), hint: t('{n} payments', { n: thisMonth.length }) },
    { label: 'All time', value: usd(sum(rows)), hint: t('{n} payments', { n: rows.length }) },
    { label: 'Average payment', value: usd(rows.length ? sum(rows) / rows.length : 0), hint: t('per payment') },
    {
      label: 'Paid for a year',
      value: String(rows.filter((r) => r.months === 12).length),
      hint: t('yearly payments'),
    },
  ]

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <PageHeader title="License payments" description="Every payment for a license, newest first. Amounts in USD." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="gap-2">
            <CardHeader>
              <CardDescription>{t(kpi.label)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{kpi.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{kpi.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        onSelect={(row) => row && navigate(`/platform/companies/${row.companyId}`)}
        searchPlaceholder="Search company..."
        facetFilters={[
          {
            columnId: 'plan',
            title: 'Plan',
            options: PLANS.filter((p) => p !== 'trial').map((p) => ({ value: p, label: planLabels[p] })),
          },
        ]}
        initialSorting={[{ id: 'date', desc: true }]}
      />
    </div>
  )
}
