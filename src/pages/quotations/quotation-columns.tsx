import type { ColumnDef } from '@tanstack/react-table'

import { QuotationStatusBadge } from '@/components/status-badge'
import { TransportModeLabel } from '@/components/transport-mode'
import { formatDate, formatWeight } from '@/lib/format'
import type { Quotation } from '@/types/quotation'

// Колонки таблицы котировок — ровно как на слайде 2 презентации.
// meta.label — название колонки в меню «Columns».
export const quotationColumns: ColumnDef<Quotation, unknown>[] = [
  {
    accessorKey: 'reference',
    header: 'Reference No.',
    meta: { label: 'Reference No.' },
    enableHiding: false,
    cell: ({ row }) => <span className="font-medium text-primary">{row.original.reference}</span>,
  },
  {
    accessorKey: 'mode',
    header: 'Mode',
    meta: { label: 'Mode of transport' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => <TransportModeLabel mode={row.original.mode} />,
  },
  {
    accessorKey: 'customer',
    header: 'Customer',
    meta: { label: 'Customer' },
    cell: ({ row }) => <span className="font-medium">{row.original.customer}</span>,
  },
  { accessorKey: 'collectionAddress', header: 'Collection', meta: { label: 'Collection address' } },
  { accessorKey: 'deliveryAddress', header: 'Delivery', meta: { label: 'Delivery address' } },
  {
    accessorKey: 'weightKg',
    header: 'Weight',
    meta: { label: 'Weight' },
    cell: ({ row }) => <span className="tabular-nums">{formatWeight(row.original.weightKg)}</span>,
  },
  {
    accessorKey: 'transportQuantity',
    header: 'Qty',
    meta: { label: 'Quantity of transport' },
    cell: ({ row }) => <span className="tabular-nums">{row.original.transportQuantity}</span>,
  },
  { accessorKey: 'equipment', header: 'Equipment', meta: { label: 'Equipment' } },
  {
    accessorKey: 'createdAt',
    header: 'Creation date',
    meta: { label: 'Creation date' },
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDate(row.original.createdAt)}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => <QuotationStatusBadge status={row.original.status} />,
  },
]
