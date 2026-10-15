import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Wallet } from 'lucide-react'
import { Link } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { PageHeader } from '@/components/page-header'
import { RecordPaymentDialog } from '@/components/record-payment-dialog'
import { InvoiceStatusBadge, invoiceStatuses } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/data/auth'
import { useInvoices } from '@/data/store'
import { t } from '@/i18n'
import { invoiceTotals } from '@/lib/calculation'
import { toUSD } from '@/lib/currency'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { INVOICE_STATUSES, type Invoice } from '@/types/invoice'
import { InvoicePreview } from './invoice-preview'

type InvoiceRow = Invoice & { total: number; balanceDue: number }

const columns: ColumnDef<InvoiceRow, unknown>[] = [
  {
    accessorKey: 'number',
    header: 'Invoice #',
    meta: { label: 'Invoice #' },
    enableHiding: false,
    cell: ({ row }) => <span className="font-medium text-primary">{row.original.number}</span>,
  },
  {
    accessorKey: 'billTo',
    header: 'Bill to',
    meta: { label: 'Bill to' },
    cell: ({ row }) => <span className="font-medium">{row.original.billTo}</span>,
  },
  {
    accessorKey: 'projectName',
    header: 'Project',
    meta: { label: 'Project' },
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.projectName}</span>,
  },
  {
    accessorKey: 'invoiceDate',
    header: 'Invoice date',
    meta: { label: 'Invoice date' },
    cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.invoiceDate)}</span>,
  },
  {
    accessorKey: 'dueDate',
    header: 'Due date',
    meta: { label: 'Due date' },
    cell: ({ row }) => (
      <span className={cn('tabular-nums', row.original.status === 'overdue' && 'font-medium text-destructive')}>
        {formatDate(row.original.dueDate)}
      </span>
    ),
  },
  {
    accessorKey: 'total',
    header: 'Total',
    meta: { label: 'Total' },
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.total, row.original.currency)}</span>,
  },
  {
    accessorKey: 'balanceDue',
    header: 'Balance due',
    meta: { label: 'Balance due' },
    cell: ({ row }) => (
      <span className={cn('tabular-nums', row.original.balanceDue > 0 ? 'font-medium' : 'text-muted-foreground')}>
        {formatMoney(row.original.balanceDue, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  },
]

const statusOptions = INVOICE_STATUSES.map((value) => ({ value, label: invoiceStatuses[value].label }))

export function PaymentsPage() {
  const invoices = useInvoices()
  const { canEditPayments } = usePermissions()
  const [selectedId, setSelectedId] = useState<string>()
  const [paying, setPaying] = useState(false)

  const rows = useMemo<InvoiceRow[]>(() => invoices.map((inv) => ({ ...inv, ...invoiceTotals(inv) })), [invoices])
  const selected = rows.find((row) => row.id === selectedId)

  // Итоги для плиток сверху: инвойсы бывают в USD, TMT и EUR — сводим в доллары по демо-курсу
  const usd = (row: InvoiceRow, key: 'total' | 'balanceDue' | 'paid') => toUSD(row[key], row.currency)
  const sum = (list: InvoiceRow[], key: 'total' | 'balanceDue' | 'paid') =>
    list.reduce((acc, row) => acc + usd(row, key), 0)
  const overdue = rows.filter((row) => row.status === 'overdue')
  const kpis = [
    {
      label: 'Total invoiced',
      value: formatMoney(sum(rows, 'total'), 'USD'),
      hint: t('{n} invoices', { n: rows.length }),
    },
    {
      label: 'Received',
      value: formatMoney(sum(rows, 'paid'), 'USD'),
      hint: t('{n} paid in full', { n: rows.filter((r) => r.status === 'paid').length }),
      tone: 'text-success',
    },
    {
      label: 'Outstanding',
      value: formatMoney(sum(rows, 'balanceDue'), 'USD'),
      hint: t('Balance due on all invoices'),
    },
    {
      label: 'Overdue',
      value: formatMoney(sum(overdue, 'balanceDue'), 'USD'),
      hint: t('{n} invoices past due date', { n: overdue.length }),
      tone: 'text-destructive',
    },
  ]

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-6">
      <PageHeader
        title="Payments"
        description="Customer invoices, payments received and balance due."
        actions={
          canEditPayments && (
            <Button size="sm" disabled={!selected || selected.status === 'paid'} onClick={() => setPaying(true)}>
              <Wallet />
              {t('Record payment')}
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="text-xs text-muted-foreground">{t(kpi.label)}</div>
            <div className={cn('mt-1 text-xl font-semibold tabular-nums', kpi.tone)}>{kpi.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{kpi.hint}</div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        selectedId={selected?.id}
        onSelect={(row) => setSelectedId(row?.id)}
        searchPlaceholder="Search invoice, customer, project..."
        facetFilters={[{ columnId: 'status', title: 'Status', options: statusOptions }]}
        initialSorting={[{ id: 'invoiceDate', desc: true }]}
        rowClassName={(row) => (row.status === 'overdue' ? 'bg-destructive/[0.03]' : undefined)}
      />

      {selected ? (
        <InvoicePreview invoice={selected} />
      ) : (
        <p className="px-1 text-xs text-muted-foreground">
          {t('Click an invoice to preview it.')}{' '}
          <Link to="/shipments" className="text-primary hover:underline">
            {t('Invoices are created from a shipment')}
          </Link>
        </p>
      )}
      <p className="px-1 text-xs text-muted-foreground">{t('Totals are converted to USD at demo rates.')}</p>

      <RecordPaymentDialog invoice={paying ? selected : undefined} onOpenChange={(open) => !open && setPaying(false)} />
    </div>
  )
}
