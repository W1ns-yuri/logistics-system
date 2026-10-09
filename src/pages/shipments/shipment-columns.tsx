import type { ColumnDef } from '@tanstack/react-table'

import { ShipmentStatusBadge } from '@/components/status-badge'
import { TransportModeIcon } from '@/components/transport-mode'
import { formatDate } from '@/lib/format'
import { transportModeLabels } from '@/types/logistics'
import type { Shipment } from '@/types/shipment'

// Колонки таблицы шипментов — как на слайде 5 презентации
export const shipmentColumns: ColumnDef<Shipment, unknown>[] = [
  {
    accessorKey: 'mode',
    header: 'Sign',
    meta: { label: 'Sign' },
    size: 56,
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => (
      <span title={transportModeLabels[row.original.mode]}>
        <TransportModeIcon mode={row.original.mode} />
      </span>
    ),
  },
  {
    accessorKey: 'number',
    header: 'Shipment No.',
    meta: { label: 'Shipment No.' },
    enableHiding: false,
    cell: ({ row }) => <span className="font-medium text-primary">{row.original.number}</span>,
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
    accessorKey: 'orderDate',
    header: 'Order date',
    meta: { label: 'Order date' },
    cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.orderDate)}</span>,
  },
  {
    accessorKey: 'etd',
    header: 'ETD',
    meta: { label: 'ETD' },
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDate(row.original.etd)}</span>,
  },
  {
    accessorKey: 'eta',
    header: 'ETA',
    meta: { label: 'ETA' },
    cell: ({ row }) => <span className="text-muted-foreground tabular-nums">{formatDate(row.original.eta)}</span>,
  },
  {
    accessorKey: 'equipment',
    header: 'Equipment',
    meta: { label: 'Equipment' },
    cell: ({ row }) => (
      <span>
        {row.original.transportQuantity > 1 && `${row.original.transportQuantity} × `}
        {row.original.equipment}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => <ShipmentStatusBadge status={row.original.status} />,
  },
]
