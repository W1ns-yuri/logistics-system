import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { DaysLeft, LicenseStatusBadge } from '@/components/license'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { EXPIRING_DAYS, planLabels, PLANS, type LicenseStatus } from '@/data/platform'
import { t } from '@/i18n'
import { countryLabel } from '@/lib/countries'
import { formatDate } from '@/lib/format'
import { useCompanyRows, type CompanyRow } from './company-rows'

const STATUS_OPTIONS: { value: LicenseStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'blocked', label: 'Blocked' },
]

const columns: ColumnDef<CompanyRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Company',
    meta: { label: 'Company' },
    enableHiding: false,
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">{row.original.adminEmail}</div>
      </div>
    ),
  },
  {
    accessorKey: 'country',
    header: 'Country',
    meta: { label: 'Country' },
    cell: ({ row }) => countryLabel(row.original.country),
  },
  {
    accessorKey: 'plan',
    header: 'Plan',
    meta: { label: 'Plan' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => t(planLabels[row.original.plan]),
  },
  {
    accessorKey: 'seatsUsed',
    header: 'Seats',
    meta: { label: 'Seats' },
    cell: ({ row }) => {
      const { seatsUsed, seats } = row.original
      return (
        <span className={seats !== null && seatsUsed >= seats ? 'text-warning tabular-nums' : 'tabular-nums'}>
          {seatsUsed} / {seats ?? '∞'}
        </span>
      )
    },
  },
  {
    accessorKey: 'paidUntil',
    header: 'Paid until',
    meta: { label: 'Paid until' },
    cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.paidUntil)}</span>,
  },
  {
    accessorKey: 'left',
    header: 'Days left',
    meta: { label: 'Days left' },
    cell: ({ row }) => <DaysLeft days={row.original.left} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => <LicenseStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Registered',
    meta: { label: 'Registered' },
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDate(row.original.createdAt)}</span>,
  },
  {
    accessorKey: 'lastActiveAt',
    header: 'Last active',
    meta: { label: 'Last active' },
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{formatDate(row.original.lastActiveAt)}</span>
    ),
  },
]

export function CompaniesPage() {
  const rows = useCompanyRows()
  const navigate = useNavigate()

  const count = (test: (row: CompanyRow) => boolean) => rows.filter(test).length
  const kpis = [
    {
      label: 'Companies',
      value: rows.length,
      hint: t('{n} new in 30 days', { n: count((r) => daysSince(r.createdAt) <= 30) }),
    },
    {
      label: 'Paying',
      value: count((r) => r.status === 'active' || r.status === 'expiring'),
      hint: t('Active license'),
    },
    { label: 'On trial', value: count((r) => r.status === 'trial'), hint: t('Free trial period') },
    {
      label: 'Need attention',
      value: count(
        (r) => r.status === 'expiring' || r.status === 'expired' || (r.status === 'trial' && r.left <= EXPIRING_DAYS),
      ),
      hint: t('Ending in {n} days or expired', { n: EXPIRING_DAYS }),
    },
  ]

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <PageHeader title="Companies" description="Everyone who registered, their plan and how long the license lasts." />

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
        onSelect={(row) => row && navigate(`/platform/companies/${row.id}`)}
        searchPlaceholder="Search company, email, country..."
        facetFilters={[
          { columnId: 'status', title: 'Status', options: STATUS_OPTIONS },
          { columnId: 'plan', title: 'Plan', options: PLANS.map((p) => ({ value: p, label: planLabels[p] })) },
        ]}
        initialSorting={[{ id: 'left', desc: false }]}
      />
      <p className="px-1 text-xs text-muted-foreground">{t('Click a company to open it.')}</p>
    </div>
  )
}

const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000)
