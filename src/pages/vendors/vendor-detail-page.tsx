import { FileText, Mail, MapPin, Pencil, Phone, Trash2, Truck, User, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ConfirmDelete } from '@/components/confirm-delete'
import { RecordHeader, RecordList, StatTile } from '@/components/record-page'
import { SectionCard } from '@/components/section-card'
import { QuotationStatusBadge, ShipmentStatusBadge } from '@/components/status-badge'
import { TransportModeIcon } from '@/components/transport-mode'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/data/auth'
import { deleteVendor, useQuotations, useShipments, useVendors } from '@/data/store'
import { t } from '@/i18n'
import { chargeTotals } from '@/lib/calculation'
import { countryLabel } from '@/lib/countries'
import { toUSD } from '@/lib/currency'
import { formatDate, formatMoney } from '@/lib/format'
import { NotFoundPage } from '@/pages/not-found'
import { Contact } from '@/pages/customers/customer-detail-page'
import { transportModeLabels } from '@/types/logistics'
import { vendorTypeLabels } from '@/types/directory'
import { VendorFormDialog } from './vendor-form-dialog'

// Подрядчик на отдельной странице: контакты, сколько мы ему должны и заплатили, все перевозки и оплаты
export function VendorDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const vendor = useVendors().find((v) => v.id === id)
  const quotations = useQuotations()
  const shipments = useShipments()
  const { canEditOrders, canSeePayments } = usePermissions()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!vendor) return <NotFoundPage />

  // Котировки, где подрядчик стоит хотя бы в одной строке расчёта
  const ownQuotations = quotations
    .filter((q) => q.charges.some((c) => c.vendorId === vendor.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const quotationById = new Map(quotations.map((q) => [q.id, q]))
  const ownShipments = shipments
    .filter(
      (s) =>
        s.vendorId === vendor.id ||
        (s.quotationId && quotationById.get(s.quotationId)?.charges.some((c) => c.vendorId === vendor.id)) ||
        (s.vendorPayments ?? []).some((p) => p.vendorId === vendor.id),
    )
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
  const live = ownShipments.filter((s) => s.status !== 'cancelled')

  // Должны по расчёту + доплаты, заплатили — всё в USD по демо-курсу, без отменённых перевозок
  let owed = 0
  let paid = 0
  for (const s of live) {
    const q = s.quotationId ? quotationById.get(s.quotationId) : undefined
    for (const c of q?.charges ?? []) if (c.vendorId === vendor.id) owed += toUSD(chargeTotals(c).cost, q!.currency)
    for (const c of s.extraCharges ?? []) if (c.vendorId === vendor.id) owed += toUSD(c.amount, c.currency)
    for (const p of s.vendorPayments ?? []) if (p.vendorId === vendor.id) paid += toUSD(p.amount, p.currency)
  }
  const payments = ownShipments
    .flatMap((s) =>
      (s.vendorPayments ?? []).filter((p) => p.vendorId === vendor.id).map((p) => ({ ...p, shipment: s })),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
  const left = owed - paid

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
      <RecordHeader
        back="/vendors"
        title={vendor.name}
        badge={<Badge variant="secondary">{t(vendorTypeLabels[vendor.type])}</Badge>}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{vendor.code}</span>
            <span>·</span>
            {countryLabel(vendor.country)}
            <span>·</span>
            {vendor.modes.map((mode) => (
              <span key={mode} className="inline-flex items-center gap-1">
                <TransportModeIcon mode={mode} />
                {t(transportModeLabels[mode])}
              </span>
            ))}
          </span>
        }
        actions={
          canEditOrders && (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil />
                {t('Edit')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
                {t('Delete')}
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Shipments"
          value={ownShipments.length}
          hint={t('{n} in quotations', { n: ownQuotations.length })}
        />
        {canSeePayments && (
          <>
            <StatTile
              label="Owed by calculation"
              value={formatMoney(owed, 'USD')}
              hint={t('Including extra charges')}
            />
            <StatTile label="Paid" value={formatMoney(paid, 'USD')} hint={t('{n} payments', { n: payments.length })} />
            <StatTile
              label={left < -0.5 ? 'Overpaid' : 'Left to pay'}
              value={formatMoney(Math.abs(left), 'USD')}
              tone={left < -0.5 ? 'bad' : left > 0.5 ? 'warn' : 'good'}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Contacts">
          <ul className="space-y-3 text-sm">
            <Contact icon={MapPin}>{countryLabel(vendor.country)}</Contact>
            <Contact icon={User}>{vendor.contactPerson}</Contact>
            <Contact icon={Mail}>
              {vendor.email && (
                <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                  {vendor.email}
                </a>
              )}
            </Contact>
            <Contact icon={Phone}>{vendor.phone}</Contact>
          </ul>
        </SectionCard>

        <Tabs defaultValue="shipments" className="gap-3 lg:col-span-2">
          <TabsList>
            <TabsTrigger value="shipments">
              <Truck />
              {t('Shipments')} ({ownShipments.length})
            </TabsTrigger>
            {canSeePayments && (
              <TabsTrigger value="payments">
                <Wallet />
                {t('Payments')} ({payments.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="quotations">
              <FileText />
              {t('Quotations')} ({ownQuotations.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="shipments" className="rounded-xl border bg-card shadow-xs">
            <RecordList
              empty="This vendor has no shipments yet."
              rows={ownShipments.map((s) => ({
                key: s.id,
                to: `/shipments/${s.id}`,
                title: s.number,
                meta: `${s.customer} · ${s.collectionAddress} → ${s.deliveryAddress} · ${formatDate(s.orderDate)}`,
                right: <ShipmentStatusBadge status={s.status} />,
              }))}
            />
          </TabsContent>
          {canSeePayments && (
            <TabsContent value="payments" className="rounded-xl border bg-card shadow-xs">
              <RecordList
                empty="No payments to vendors yet."
                rows={payments.map((p) => ({
                  key: p.id,
                  to: `/shipments/${p.shipment.id}`,
                  title: p.number,
                  meta: `${formatDate(p.date)} · ${p.shipment.number}`,
                  right: <span className="font-semibold tabular-nums">{formatMoney(p.amount, p.currency)}</span>,
                }))}
              />
            </TabsContent>
          )}
          <TabsContent value="quotations" className="rounded-xl border bg-card shadow-xs">
            <RecordList
              empty="This vendor is not in any quotation yet."
              rows={ownQuotations.map((q) => ({
                key: q.id,
                to: `/quotations/${q.id}`,
                title: q.reference,
                meta: `${q.customer} · ${q.collectionAddress} → ${q.deliveryAddress}`,
                right: <QuotationStatusBadge status={q.status} />,
              }))}
            />
          </TabsContent>
        </Tabs>
      </div>

      <VendorFormDialog open={editOpen} onOpenChange={setEditOpen} vendor={vendor} />
      <ConfirmDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('Delete vendor {name}?', { name: vendor.name })}
        description="The vendor card will be removed. Shipments keep their data."
        onConfirm={() => {
          deleteVendor(vendor.id)
          navigate('/vendors')
        }}
      />
    </div>
  )
}
