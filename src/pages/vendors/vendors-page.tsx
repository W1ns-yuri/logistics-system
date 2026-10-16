import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'

import { ConfirmDelete } from '@/components/confirm-delete'
import { DataTable } from '@/components/data-table/data-table'
import { DirectoryActions } from '@/components/directory-actions'
import { PageHeader } from '@/components/page-header'
import { TransportModeIcon } from '@/components/transport-mode'
import { Badge } from '@/components/ui/badge'
import { deleteVendor, useShipments, useVendors } from '@/data/store'
import { useFormMode } from '@/hooks/use-form-mode'
import { t } from '@/i18n'
import { countryLabel } from '@/lib/countries'
import { VENDOR_TYPES, vendorTypeLabels, type Vendor } from '@/types/directory'
import { transportModeLabels } from '@/types/logistics'
import { VendorFormDialog } from './vendor-form-dialog'

type VendorRow = Vendor & { shipmentCount: number }

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
    cell: ({ row }) => <Badge variant="secondary">{t(vendorTypeLabels[row.original.type])}</Badge>,
  },
  {
    accessorKey: 'modes',
    header: 'Modes',
    meta: { label: 'Modes' },
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        {row.original.modes.map((mode) => (
          <span key={mode} title={t(transportModeLabels[mode])}>
            <TransportModeIcon mode={mode} />
          </span>
        ))}
      </span>
    ),
  },
  {
    accessorKey: 'country',
    header: 'Country',
    meta: { label: 'Country' },
    cell: ({ row }) => countryLabel(row.original.country),
  },
  { accessorKey: 'contactPerson', header: 'Contact', meta: { label: 'Contact' } },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: { label: 'Email' },
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
  },
  { accessorKey: 'phone', header: 'Phone', meta: { label: 'Phone' } },
  {
    accessorKey: 'shipmentCount',
    header: 'Used in shipments',
    meta: { label: 'Used in shipments' },
    cell: ({ row }) => <span className="tabular-nums">{row.original.shipmentCount}</span>,
  },
]

const typeOptions = VENDOR_TYPES.map((value) => ({ value, label: vendorTypeLabels[value] }))

export function VendorsPage() {
  const vendors = useVendors()
  const shipments = useShipments()
  const [selectedId, setSelectedId] = useState<string>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { mode, setMode, close } = useFormMode()

  // Сколько шипментов реально вёз этот вендор (поле Vendor у шипмента)
  const rows = useMemo<VendorRow[]>(
    () => vendors.map((v) => ({ ...v, shipmentCount: shipments.filter((s) => s.vendorId === v.id).length })),
    [vendors, shipments],
  )
  const selected = rows.find((row) => row.id === selectedId)

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-6">
      <PageHeader
        title="Vendors"
        description="Airlines, shipping lines, trucking and rail operators you buy services from."
        actions={
          <DirectoryActions
            hasSelection={!!selected}
            onNew={() => setMode('new')}
            onEdit={() => setMode('edit')}
            onDelete={() => setConfirmOpen(true)}
          />
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        selectedId={selected?.id}
        onSelect={(row) => setSelectedId(row?.id)}
        searchPlaceholder="Search vendor, country, contact..."
        facetFilters={[{ columnId: 'type', title: 'Type', options: typeOptions }]}
        initialSorting={[{ id: 'shipmentCount', desc: true }]}
      />
      <p className="px-1 text-xs text-muted-foreground">{t('Click a row to select it.')}</p>

      <VendorFormDialog
        open={!!mode}
        onOpenChange={(value) => !value && close()}
        vendor={mode === 'edit' ? selected : undefined}
        onSaved={(v) => setSelectedId(v.id)}
      />
      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('Delete vendor {name}?', { name: selected?.name ?? '' })}
        description="The vendor card will be removed. Shipments keep their data."
        onConfirm={() => {
          if (selected) deleteVendor(selected.id)
          setSelectedId(undefined)
        }}
      />
    </div>
  )
}
