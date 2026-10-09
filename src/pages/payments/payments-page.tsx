import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { PageHeader } from '@/components/page-header'
import { InvoiceStatusBadge, invoiceStatuses } from '@/components/status-badge'
import { useInvoices } from '@/data/store'
import { invoiceTotals } from '@/lib/calculation'
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
  const [selectedId, setSelectedId] = useState<string>()

  const rows = useMemo<InvoiceRow[]>(() => invoices.map((inv) => ({ ...inv, ...invoiceTotals(inv) })), [invoices])
  const selected = rows.find((row) => row.id === selectedId)

  // Итоги для плиток сверху (все инвойсы в USD)
  const sum = (list: InvoiceRow[], key: 'total' | 'balanceDue') => list.reduce((acc, row) => acc + row[key], 0)
  const overdue = rows.filter((row) => row.status === 'overdue')
  const kpis = [
    { label: 'Total invoiced', value: formatMoney(sum(rows, 'total'), 'USD'), hint: `${rows.length} invoices` },
    {
      label: 'Received',
      value: formatMoney(
        rows.reduce((acc, row) => acc + row.paid, 0),
        'USD',
      ),
      hint: `${rows.filter((r) => r.status === 'paid').length} paid in full`,
      tone: 'text-success',
    },
    { label: 'Outstanding', value: formatMoney(sum(rows, 'balanceDue'), 'USD'), hint: 'Balance due on all invoices' },
    {
      label: 'Overdue',
      value: formatMoney(sum(overdue, 'balanceDue'), 'USD'),
      hint: `${overdue.length} invoices past due date`,
      tone: 'text-destructive',
    },
  ]

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-6">
      <PageHeader title="Payments" description="Customer invoices, payments received and balance due." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border bg-card p-4 shadow-xs">
            <div className="text-xs text-muted-foreground">{kpi.label}</div>
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
          Click an invoice to preview it.{' '}
          <Link to="/shipments" className="text-primary hover:underline">
            Invoices are linked to shipments
          </Link>
          .
        </p>
      )}
    </div>
  )
}
