import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/data-table/data-table'
import { PageHeader } from '@/components/page-header'
import { TransportModeIcon } from '@/components/transport-mode'
import { Badge } from '@/components/ui/badge'
import { useQuotations, useVendors } from '@/data/store'
import { VENDOR_TYPES, vendorTypeLabels, type Vendor } from '@/types/directory'
import { transportModeLabels } from '@/types/logistics'

type VendorRow = Vendor & { quotationCount: number }

const columns: ColumnDef<VendorRow, unknown>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    meta: { label: 'Code' },
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span>,
  },
  {
    accessorKey: 'name',
    header: 'Vendor',
    meta: { label: 'Vendor' },
    enableHiding: false,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    meta: { label: 'Type' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => <Badge variant="secondary">{vendorTypeLabels[row.original.type]}</Badge>,
  },
  {
    accessorKey: 'modes',
    header: 'Modes',
    meta: { label: 'Modes' },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        {row.original.modes.map((mode) => (
          <span key={mode} title={transportModeLabels[mode]}>
            <TransportModeIcon mode={mode} />
          </span>
        ))}
      </span>
    ),
  },
  { accessorKey: 'country', header: 'Country', meta: { label: 'Country' } },
  { accessorKey: 'contactPerson', header: 'Contact', meta: { label: 'Contact' } },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { label: 'Email' },
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  { accessorKey: 'phone', header: 'Phone', meta: { label: 'Phone' } },
  {
    accessorKey: 'quotationCount',
    header: 'Used in quotations',
    meta: { label: 'Used in quotations' },
    cell: ({ row }) => <span className="tabular-nums">{row.original.quotationCount}</span>,
  },
]

const typeOptions = VENDOR_TYPES.map((value) => ({ value, label: vendorTypeLabels[value] }))

export function VendorsPage() {
  const vendors = useVendors()
  const quotations = useQuotations()

  // Сколько раз вендор стоит перевозчиком в котировках (поле Carrier во вкладке Calculation)
  const rows = useMemo<VendorRow[]>(
    () => vendors.map((v) => ({ ...v, quotationCount: quotations.filter((q) => q.carrier === v.name).length })),
    [vendors, quotations],
  )

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-6">
      <PageHeader
        title="Vendors"
        description="Airlines, shipping lines, trucking and rail operators you buy services from."
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        searchPlaceholder="Search vendor, country, contact..."
        facetFilters={[{ columnId: 'type', title: 'Type', options: typeOptions }]}
        initialSorting={[{ id: 'quotationCount', desc: true }]}
      />
    </div>
  )
}
