import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Mail, MapPin, Phone, User } from 'lucide-react'
import { Link } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { PageHeader } from '@/components/page-header'
import { SectionCard } from '@/components/section-card'
import { QuotationStatusBadge } from '@/components/status-badge'
import { useCustomers, useQuotations } from '@/data/store'
import { formatDate } from '@/lib/format'
import type { Customer } from '@/types/directory'
import type { Quotation } from '@/types/quotation'

// Клиент + статистика по его котировкам (как «Number of quotations / Conversion rate» в Scope)
type CustomerRow = Customer & {
  quotations: Quotation[]
  accepted: number
  conversion: number
  lastQuotation?: string
}

const ACCEPTED: Quotation['status'][] = ['shipment_created', 'completed']

const columns: ColumnDef<CustomerRow, unknown>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    meta: { label: 'Code' },
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>,
  },
  {
    accessorKey: 'name',
    header: 'Customer',
    meta: { label: 'Customer' },
    enableHiding: false,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  { accessorKey: 'country', header: 'Country', meta: { label: 'Country' }, filterFn: 'arrIncludesSome' },
  { accessorKey: 'city', header: 'City', meta: { label: 'City' } },
  { accessorKey: 'contactPerson', header: 'Contact', meta: { label: 'Contact' } },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { label: 'Email' },
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  {
    id: 'quotationCount',
    accessorFn: (row) => row.quotations.length,
    header: 'Quotations',
    meta: { label: 'Quotations' },
    cell: ({ getValue }) => <span className="tabular-nums">{getValue() as number}</span>,
  },
  {
    accessorKey: 'conversion',
    header: 'Conversion',
    meta: { label: 'Conversion' },
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.quotations.length ? `${row.original.accepted} of ${row.original.quotations.length}` : '—'}
        {row.original.quotations.length > 0 && (
          <span className="ml-1.5 text-muted-foreground">({Math.round(row.original.conversion)}%)</span>
        )}
      </span>
    ),
  },
  {
    accessorKey: 'lastQuotation',
    header: 'Last quotation',
    meta: { label: 'Last quotation' },
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">{formatDate(row.original.lastQuotation)}</span>
    ),
  },
]

export function CustomersPage() {
  const customers = useCustomers()
  const quotations = useQuotations()
  const [selectedId, setSelectedId] = useState<string>()

  // Пересчитываем статистику, только когда меняются клиенты или котировки
  const rows = useMemo<CustomerRow[]>(
    () =>
      customers.map((customer) => {
        const own = quotations.filter((q) => q.customer === customer.name)
        const accepted = own.filter((q) => ACCEPTED.includes(q.status)).length
        return {
          ...customer,
          quotations: own,
          accepted,
          conversion: own.length ? (accepted / own.length) * 100 : 0,
          lastQuotation: own
            .map((q) => q.createdAt)
            .sort()
            .at(-1),
        }
      }),
    [customers, quotations],
  )

  const countries = [...new Set(customers.map((c) => c.country))].sort().map((value) => ({ value, label: value }))
  const selected = rows.find((row) => row.id === selectedId)

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-6">
      <PageHeader title="Customers" description="Companies you quote and ship for, with contacts and conversion." />

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        selectedId={selected?.id}
        onSelect={(row) => setSelectedId(row?.id)}
        searchPlaceholder="Search customer, city, contact..."
        facetFilters={[{ columnId: 'country', title: 'Country', options: countries }]}
        initialSorting={[{ id: 'quotationCount', desc: true }]}
      />

      {selected ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title={selected.name}>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {selected.address}, {selected.city}, {selected.country}
              </li>
              <li className="flex gap-2.5">
                <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {selected.contactPerson}
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {selected.email}
              </li>
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {selected.phone}
              </li>
            </ul>
          </SectionCard>
          <SectionCard title="Quotations" className="lg:col-span-2 [&>div:last-child]:p-0">
            {selected.quotations.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No quotations for this customer yet.</p>
            ) : (
              <ul className="divide-y">
                {selected.quotations.map((q) => (
                  <li key={q.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <Link to={`/quotations/${q.id}`} className="font-medium text-primary hover:underline">
                      {q.reference}
                    </Link>
                    <span className="flex-1 truncate text-muted-foreground">
                      {q.collectionAddress} → {q.deliveryAddress}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{formatDate(q.createdAt)}</span>
                    <QuotationStatusBadge status={q.status} />
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">Click a customer to see contacts and quotations.</p>
      )}
    </div>
  )
}
