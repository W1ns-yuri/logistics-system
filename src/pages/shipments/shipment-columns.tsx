import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router'

import { LateBadge } from '@/components/late-badge'
import { ShipmentStatusBadge, shipmentStatuses } from '@/components/status-badge'
import { TransportModeIcon } from '@/components/transport-mode'
import { shipmentPayment } from '@/data/store'
import { t } from '@/i18n'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { transportModeLabels } from '@/types/logistics'
import type { Invoice } from '@/types/invoice'
import { daysLate, type Shipment } from '@/types/shipment'

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
      meta: { label: 'Mode of transport', exportValue: (s) => t(transportModeLabels[s.mode]) },
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
      cell: ({ row }) => (
        <Link
          to={`/shipments/${row.original.id}`}
          onClick={(event) => event.stopPropagation()}
          className="font-medium text-primary hover:underline"
        >
          {row.original.number}
        </Link>
      ),
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
      meta: { label: 'ETD / ETA', exportValue: (s) => [s.etd, s.eta].map((d) => d ?? '—').join(' / ') },
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
      meta: {
        label: 'Equipment',
        exportValue: (s) => (s.transportQuantity > 1 ? `${s.transportQuantity} × ` : '') + s.equipment,
      },
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
      meta: {
        label: 'Payment',
        exportValue: (s) => {
          const p = shipmentPayment(s.id, invoices)
          return p.total ? `${p.paid} / ${p.total} ${p.currency}` : ''
        },
      },
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
    meta: {
      label: 'Status',
      exportValue: (s) => {
        const late = daysLate(s)
        return t(shipmentStatuses[s.status].label) + (late ? ` · ${t('Late by {n} d.', { n: late })}` : '')
      },
    },
    filterFn: 'arrIncludesSome',
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <ShipmentStatusBadge status={row.original.status} />
        <LateBadge shipment={row.original} />
      </div>
    ),
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
