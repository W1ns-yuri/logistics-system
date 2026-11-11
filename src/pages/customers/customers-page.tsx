import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { DataTable } from '@/components/data-table/data-table'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/data/auth'
import { useCustomers, useQuotations } from '@/data/store'
import { useFormMode } from '@/hooks/use-form-mode'
import { t } from '@/i18n'
import { countryLabel } from '@/lib/countries'
import { formatDate } from '@/lib/format'
import type { Customer } from '@/types/directory'
import type { Quotation } from '@/types/quotation'
import { CustomerFormDialog } from './customer-form-dialog'

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
    cell: ({ row }) => (
      <Link to={`/customers/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: 'country',
    header: 'Country',
    meta: { label: 'Country' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => countryLabel(row.original.country),
  },
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
    meta: { label: 'Conversion', exportValue: (c) => (c.quotations.length ? `${Math.round(c.conversion)}%` : '') },
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.quotations.length
          ? t('{a} of {b}', { a: row.original.accepted, b: row.original.quotations.length })
          : '—'}
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
  const navigate = useNavigate()
  const { canEditOrders } = usePermissions()
  const { mode, setMode, close } = useFormMode()

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

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Customers"
        description="Companies you quote and ship for, with contacts and conversion."
        actions={
          canEditOrders && (
            <Button size="sm" onClick={() => setMode('new')}>
              <Plus />
              {t('New')}
            </Button>
          )
        }
      />

      <DataTable
        exportName="Customers"
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        // Клик по клиенту открывает его карточку на отдельной странице
        onSelect={(row) => row && navigate(`/customers/${row.id}`)}
        onOpen={(row) => navigate(`/customers/${row.id}`)}
        searchPlaceholder="Search customer, city, contact..."
        facetFilters={[{ columnId: 'country', title: 'Country', options: countries }]}
        initialSorting={[{ id: 'quotationCount', desc: true }]}
      />
      <p className="px-1 text-xs text-muted-foreground">{t('Click a customer to open the card.')}</p>

      <CustomerFormDialog
        open={!!mode}
        onOpenChange={(value) => !value && close()}
        onSaved={(c) => navigate(`/customers/${c.id}`)}
      />
    </div>
  )
}
