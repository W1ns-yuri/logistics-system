import { FileText, Mail, MapPin, Pencil, Phone, Receipt, Trash2, Truck, User } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import { ConfirmDelete } from '@/components/confirm-delete'
import { RecordHeader, RecordList, StatTile } from '@/components/record-page'
import { SectionCard } from '@/components/section-card'
import { InvoiceStatusBadge, QuotationStatusBadge, ShipmentStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermissions } from '@/data/auth'
import { deleteCustomer, useCustomers, useInvoices, useQuotations, useShipments } from '@/data/store'
import { t } from '@/i18n'
import { invoiceTotals } from '@/lib/calculation'
import { countryLabel } from '@/lib/countries'
import { toUSD } from '@/lib/currency'
import { formatDate, formatMoney } from '@/lib/format'
import { NotFoundPage } from '@/pages/not-found'
import { quotationFunnel } from '@/pages/analytics/analytics-data'
import { CustomerFormDialog } from './customer-form-dialog'

// Карточка клиента на отдельной странице: контакты, цифры и все его котировки, перевозки и инвойсы
export function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const customer = useCustomers().find((c) => c.id === id)
  const quotations = useQuotations()
  const shipments = useShipments()
  const invoices = useInvoices()
  const { canEditOrders, canSeePayments } = usePermissions()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!customer) return <NotFoundPage />

  const own = quotations
    .filter((q) => q.customer === customer.name)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const ownShipments = shipments
    .filter((s) => s.customer === customer.name)
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
  const shipmentIds = new Set(ownShipments.map((s) => s.id))
  const ownInvoices = invoices
    .filter((inv) => inv.billTo === customer.name || (inv.shipmentId && shipmentIds.has(inv.shipmentId)))
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
  const funnel = quotationFunnel(own)
  // Деньги по инвойсам без отменённых перевозок, в USD по демо-курсу
  const cancelled = new Set(ownShipments.filter((s) => s.status === 'cancelled').map((s) => s.id))
  const live = ownInvoices.filter((inv) => !inv.shipmentId || !cancelled.has(inv.shipmentId))
  const usd = (pick: (inv: (typeof live)[number]) => number) =>
    live.reduce((acc, inv) => acc + toUSD(pick(inv), inv.currency), 0)
  const invoiced = usd((inv) => invoiceTotals(inv).total)
  const paid = usd((inv) => inv.paid)
  const due = usd((inv) => Math.max(0, invoiceTotals(inv).balanceDue))
  const overdue = live.filter((inv) => inv.status === 'overdue').length

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
      <RecordHeader
        back="/customers"
        title={customer.name}
        badge={<span className="font-mono text-xs text-muted-foreground">{customer.code}</span>}
        subtitle={[customer.city, countryLabel(customer.country)].filter(Boolean).join(', ')}
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
              <Button size="sm" onClick={() => navigate('/quotations/new')}>
                <FileText />
                {t('New quotation')}
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          label="Quotations"
          value={own.length}
          hint={t('{won} won, {failed} failed', { won: funnel.won, failed: funnel.failed })}
        />
        <StatTile label="Conversion" value={`${Math.round(funnel.conversion)}%`} hint={t('Won out of won + failed')} />
        <StatTile label="Shipments" value={ownShipments.length} />
        {canSeePayments ? (
          <StatTile
            label="Owes us"
            value={formatMoney(due, 'USD')}
            tone={overdue ? 'bad' : due > 0 ? 'warn' : 'good'}
            hint={
              overdue
                ? t('{n} invoices past due date', { n: overdue })
                : t('Invoiced {a}, paid {b}', { a: formatMoney(invoiced, 'USD'), b: formatMoney(paid, 'USD') })
            }
          />
        ) : (
          <StatTile label="Last quotation" value={formatDate(own[0]?.createdAt)} />
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
        <SectionCard title="Contacts">
          <ul className="space-y-3 text-sm">
            <Contact icon={MapPin}>
              {[customer.address, customer.city, countryLabel(customer.country)].filter(Boolean).join(', ')}
            </Contact>
            <Contact icon={User}>{customer.contactPerson}</Contact>
            <Contact icon={Mail}>
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                  {customer.email}
                </a>
              )}
            </Contact>
            <Contact icon={Phone}>
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {customer.phone}
                </a>
              )}
            </Contact>
          </ul>
        </SectionCard>

        <Tabs defaultValue="quotations" className="gap-3 lg:col-span-2">
          <TabsList>
            <TabsTrigger value="quotations">
              <FileText />
              {t('Quotations')} ({own.length})
            </TabsTrigger>
            <TabsTrigger value="shipments">
              <Truck />
              {t('Shipments')} ({ownShipments.length})
            </TabsTrigger>
            {canSeePayments && (
              <TabsTrigger value="invoices">
                <Receipt />
                {t('Invoices')} ({ownInvoices.length})
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="quotations" className="rounded-xl border bg-card shadow-xs">
            <RecordList
              empty="No quotations for this customer yet."
              rows={own.map((q) => ({
                key: q.id,
                to: `/quotations/${q.id}`,
                title: q.reference,
                meta: `${q.collectionAddress} → ${q.deliveryAddress} · ${formatDate(q.createdAt)}`,
                right: <QuotationStatusBadge status={q.status} />,
              }))}
            />
          </TabsContent>
          <TabsContent value="shipments" className="rounded-xl border bg-card shadow-xs">
            <RecordList
              empty="No shipments for this customer yet."
              rows={ownShipments.map((s) => ({
                key: s.id,
                to: `/shipments/${s.id}`,
                title: s.number,
                meta: `${s.collectionAddress} → ${s.deliveryAddress} · ${formatDate(s.orderDate)}`,
                right: <ShipmentStatusBadge status={s.status} />,
              }))}
            />
          </TabsContent>
          {canSeePayments && (
            <TabsContent value="invoices" className="rounded-xl border bg-card shadow-xs">
              <RecordList
                empty="No invoices for this customer yet."
                rows={ownInvoices.map((inv) => ({
                  key: inv.id,
                  to: `/payments/${inv.id}`,
                  title: inv.number,
                  meta: `${formatDate(inv.invoiceDate)} · ${t('Balance due')}: ${formatMoney(Math.max(0, invoiceTotals(inv).balanceDue), inv.currency)}`,
                  right: <InvoiceStatusBadge status={inv.status} />,
                }))}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <ConfirmDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('Delete customer {name}?', { name: customer.name })}
        description={
          ownShipments.length
            ? t('This customer has shipments. They stay, but the customer card will be removed.')
            : t('The customer card will be removed. This cannot be undone.')
        }
        onConfirm={() => {
          deleteCustomer(customer.id)
          navigate('/customers')
        }}
      />
    </div>
  )
}

export function Contact({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 break-words">{children || '—'}</span>
    </li>
  )
}
