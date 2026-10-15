import { FileText, Receipt, Truck } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { PageHeader } from '@/components/page-header'
import { InvoiceStatusBadge, QuotationStatusBadge, ShipmentStatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { usePermissions } from '@/data/auth'
import { useInvoices, useQuotations, useShipments } from '@/data/store'
import { t } from '@/i18n'
import { invoiceTotals, quotationTotals } from '@/lib/calculation'
import { toUSD } from '@/lib/currency'
import { formatDateTime, formatMoney, formatPercent } from '@/lib/format'

type RecentDocument = {
  key: string
  reference: string
  type: 'Quotation' | 'Shipment' | 'Invoice'
  customer: string
  route: string
  status: ReactNode
  updatedAt: string
  link: string
}

const typeIcon = { Quotation: FileText, Shipment: Truck, Invoice: Receipt }

// Главная: цифры и последние документы считаются из текущих данных
export function HomePage() {
  const navigate = useNavigate()
  const quotations = useQuotations()
  const shipments = useShipments()
  const invoices = useInvoices()
  const { canSeePayments } = usePermissions()

  const kpis = useMemo(() => {
    const open = quotations.filter((q) => q.status === 'in_progress')
    const moving = shipments.filter((s) => ['loaded', 'in_transit', 'at_border'].includes(s.status))
    const atBorder = shipments.filter((s) => s.status === 'at_border').length
    const unpaid = invoices.filter((inv) => inv.status !== 'paid')
    const unpaidSum = unpaid.reduce((acc, inv) => acc + toUSD(invoiceTotals(inv).balanceDue, inv.currency), 0)
    const overdue = invoices.filter((inv) => inv.status === 'overdue').length
    const won = quotations.filter((q) => q.status === 'shipment_created' || q.status === 'completed')
    const income = won.reduce((acc, q) => acc + toUSD(quotationTotals(q).income, q.currency), 0)
    const profit = won.reduce((acc, q) => acc + toUSD(quotationTotals(q).profit, q.currency), 0)
    const delivered = shipments.filter((s) => s.status === 'delivered' || s.status === 'completed').length

    const list = [
      { label: 'Open quotations', value: String(open.length), hint: t('{n} in total', { n: quotations.length }) },
      { label: 'Shipments on the way', value: String(moving.length), hint: t('{n} at the border', { n: atBorder }) },
    ]
    if (canSeePayments) {
      list.push(
        { label: 'Unpaid invoices', value: formatMoney(unpaidSum, 'USD'), hint: t('{n} overdue', { n: overdue }) },
        {
          label: 'Avg. margin',
          value: formatPercent(income ? (profit / income) * 100 : 0),
          hint: t('on won quotations'),
        },
      )
    } else {
      // Сотрудник не видит деньги — показываем только операционные цифры
      list.push(
        { label: 'Delivered', value: String(delivered), hint: t('shipments delivered or completed') },
        {
          label: 'Shipments total',
          value: String(shipments.length),
          hint: t('{n} cancelled', { n: shipments.filter((s) => s.status === 'cancelled').length }),
        },
      )
    }
    return list
  }, [quotations, shipments, invoices, canSeePayments])

  const recent = useMemo<RecentDocument[]>(() => {
    const docs: RecentDocument[] = [
      ...quotations.map((q) => ({
        key: `q-${q.id}`,
        reference: q.reference,
        type: 'Quotation' as const,
        customer: q.customer,
        route: `${q.collectionAddress} → ${q.deliveryAddress}`,
        status: <QuotationStatusBadge status={q.status} />,
        updatedAt: q.createdAt,
        link: `/quotations/${q.id}`,
      })),
      ...shipments.map((s) => ({
        key: `s-${s.id}`,
        reference: s.number,
        type: 'Shipment' as const,
        customer: s.customer,
        route: `${s.collectionAddress} → ${s.deliveryAddress}`,
        status: <ShipmentStatusBadge status={s.status} />,
        updatedAt: s.history.at(-1)?.at ?? s.orderDate,
        link: `/shipments/${s.id}`,
      })),
      ...(canSeePayments
        ? invoices.map((inv) => ({
            key: `i-${inv.id}`,
            reference: inv.number,
            type: 'Invoice' as const,
            customer: inv.billTo,
            route: '—',
            status: <InvoiceStatusBadge status={inv.status} />,
            updatedAt: inv.invoiceDate,
            link: '/payments',
          }))
        : []),
    ]
    return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)
  }, [quotations, shipments, invoices, canSeePayments])

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader title="Home" description="Overview of quotations, shipments and payments." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="gap-2">
            <CardHeader>
              <CardDescription>{t(kpi.label)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{kpi.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{kpi.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <div>
            <CardTitle>{t('Recently used documents')}</CardTitle>
            <CardDescription className="mt-1">{t('Last documents created or changed')}</CardDescription>
          </div>
          <Badge variant="secondary">{recent.length}</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">{t('Reference')}</th>
                <th className="px-5 py-2.5 font-medium">{t('Type')}</th>
                <th className="px-5 py-2.5 font-medium">{t('Customer')}</th>
                <th className="px-5 py-2.5 font-medium">{t('Route')}</th>
                <th className="px-5 py-2.5 font-medium">{t('Status')}</th>
                <th className="px-5 py-2.5 text-right font-medium">{t('Updated')}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((doc) => {
                const Icon = typeIcon[doc.type]
                return (
                  <tr
                    key={doc.key}
                    onClick={() => navigate(doc.link)}
                    className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-3 font-medium text-primary">{doc.reference}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Icon className="size-4" />
                        {t(doc.type)}
                      </span>
                    </td>
                    <td className="px-5 py-3">{doc.customer}</td>
                    <td className="px-5 py-3 text-muted-foreground">{doc.route}</td>
                    <td className="px-5 py-3">{doc.status}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground tabular-nums">
                      {formatDateTime(doc.updatedAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
