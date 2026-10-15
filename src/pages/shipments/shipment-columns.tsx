import type { ColumnDef } from '@tanstack/react-table'

import { ShipmentStatusBadge } from '@/components/status-badge'
import { TransportModeIcon } from '@/components/transport-mode'
import { shipmentPayment } from '@/data/store'
import { t } from '@/i18n'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { transportModeLabels } from '@/types/logistics'
import type { Invoice } from '@/types/invoice'
import type { Shipment } from '@/types/shipment'

// Колонки таблицы шипментов — как на слайде 5 презентации.
// Колонку Payment видят только роли с доступом к оплатам (сотрудник её не видит).
export function getShipmentColumns({
  invoices,
  showPayment,
}: {
  invoices: Invoice[]
  showPayment: boolean
}): ColumnDef<Shipment, unknown>[] {
  const columns: ColumnDef<Shipment, unknown>[] = [
    {
      accessorKey: 'mode',
      header: '',
      meta: { label: 'Sign' },
      size: 40,
      enableSorting: false,
      filterFn: 'arrIncludesSome',
      cell: ({ row }) => (
        <span title={t(transportModeLabels[row.original.mode])}>
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
    { accessorKey: 'collectionAddress', header: 'Pick up', meta: { label: 'Pick up location' } },
    { accessorKey: 'deliveryAddress', header: 'Delivery', meta: { label: 'Delivery location' } },
    {
      accessorKey: 'orderDate',
      header: 'Order date',
      meta: { label: 'Order date' },
      cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.orderDate)}</span>,
    },
    {
      // ETD и ETA в одной колонке, чтобы таблица влезала в экран
      accessorKey: 'etd',
      header: 'ETD / ETA',
      meta: { label: 'ETD / ETA' },
      cell: ({ row }) => (
        <div className="text-xs leading-tight whitespace-nowrap tabular-nums">
          <div>{formatDate(row.original.etd)}</div>
          <div className="text-muted-foreground">{formatDate(row.original.eta)}</div>
        </div>
      ),
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
  ]

  if (showPayment) {
    columns.push({
      id: 'payment',
      header: 'Payment',
      meta: { label: 'Payment' },
      // Сортируем по доле оплаченного
      accessorFn: (s) => {
        const p = shipmentPayment(s.id, invoices)
        return p.total ? p.paid / p.total : -1
      },
      cell: ({ row }) => <PaymentCell shipmentId={row.original.id} invoices={invoices} />,
    })
  }

  columns.push({
    accessorKey: 'status',
    header: 'Status',
    meta: { label: 'Status' },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => <ShipmentStatusBadge status={row.original.status} />,
  })

  return columns
}

// «Сколько клиент уже заплатил»: сумма + полоска прогресса
function PaymentCell({ shipmentId, invoices }: { shipmentId: string; invoices: Invoice[] }) {
  const { paid, total, currency } = shipmentPayment(shipmentId, invoices)
  if (!total) return <span className="text-xs whitespace-nowrap text-muted-foreground">{t('No invoice')}</span>
  const share = Math.min(1, paid / total)
  const amount = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
  return (
    <div className="w-28 space-y-1" title={`${formatMoney(paid, currency)} / ${formatMoney(total, currency)}`}>
      <div className="text-xs whitespace-nowrap tabular-nums">
        <span className="font-medium">{amount(paid)}</span>
        <span className="text-muted-foreground">
          {' '}
          / {amount(total)} {currency}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', share >= 1 ? 'bg-emerald-500' : share > 0 ? 'bg-amber-500' : 'bg-muted')}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  )
}
