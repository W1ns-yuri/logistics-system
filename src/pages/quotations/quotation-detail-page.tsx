import { useState } from 'react'
import { ArrowLeft, Calculator, Copy, FileText, Info, Pencil, Trash2, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { ConfirmDelete } from '@/components/confirm-delete'
import { TransportModeIcon } from '@/components/transport-mode'
import { PrintMenu } from '@/components/print-menu'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  copyQuotation,
  createShipmentFromQuotation,
  deleteQuotation,
  updateQuotation,
  useMemberName,
  useQuotation,
  useLinkedShipment,
} from '@/data/store'
import { useCanModify, usePermissions } from '@/data/auth'
import { t, type Language } from '@/i18n'
import { formatDate } from '@/lib/format'
import { NotFoundPage } from '@/pages/not-found'
import { QuotationCalculationTab } from './quotation-calculation-tab'
import { QuotationGeneralTab } from './quotation-general-tab'
import { QuotationPreview } from './quotation-preview'
import { printQuotation } from './quotation-print-page'
import { QuotationStatusMenu } from './quotation-status-menu'

// Карточка котировки: вкладки General / Calculation / PDF (слайды 3–4 презентации)
export function QuotationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quotation = useQuotation(id)
  const linked = useLinkedShipment(id)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [tab, setTab] = useState('general')
  const { canEditOrders } = usePermissions()
  const canModify = useCanModify(quotation)
  const ownerName = useMemberName(quotation?.createdBy)

  if (!quotation) return <NotFoundPage />

  // Печать или «Сохранить как PDF» на отдельной странице, как у инвойса. Котировку в работе после этого
  // считаем отправленной клиенту → «Завершена» (так попросил заказчик).
  const print = (language: Language) => {
    if (canModify && quotation.status === 'in_progress') updateQuotation(quotation.id, { status: 'completed' })
    printQuotation(quotation.id, language)
  }

  const canCreateShipment = quotation.status !== 'cancelled'

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="icon-sm" aria-label={t('Back to quotations')}>
            <Link to="/quotations">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{quotation.reference}</h1>
              <QuotationStatusMenu quotation={quotation} editable={canModify} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <TransportModeIcon mode={quotation.mode} />
              <span>{quotation.customer}</span>
              <span>·</span>
              <span>
                {quotation.collectionAddress} → {quotation.deliveryAddress}
              </span>
              <span>·</span>
              <span>
                {ownerName
                  ? t('Created {date} by {name}', { date: formatDate(quotation.createdAt), name: ownerName })
                  : t('Created {date}', { date: formatDate(quotation.createdAt) })}
              </span>
              {quotation.validTo && (
                <>
                  <span>·</span>
                  <span>{t('Valid to {date}', { date: formatDate(quotation.validTo) })}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PrintMenu onPrint={print} />
          {canEditOrders && !canModify && (
            <span className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {t('View only: {name} owns this record', { name: ownerName })}
            </span>
          )}
          {canModify && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}>
              <Pencil />
              {t('Edit')}
            </Button>
          )}
          {canEditOrders && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const copy = copyQuotation(quotation.id)
                if (copy) navigate(`/quotations/${copy.id}`)
              }}
            >
              <Copy />
              {t('Copy')}
            </Button>
          )}
          {canModify && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 />
                {t('Delete')}
              </Button>
              {linked ? (
                <Button size="sm" asChild>
                  <Link to={`/shipments/${linked.id}`}>
                    <Truck />
                    {t('Open shipment {number}', { number: linked.number })}
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={!canCreateShipment}
                  onClick={() => {
                    const shipment = createShipmentFromQuotation(quotation.id)
                    if (shipment) navigate(`/shipments/${shipment.id}`)
                  }}
                >
                  <Truck />
                  {t('Create shipment')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="general">
            <Info />
            {t('General')}
          </TabsTrigger>
          <TabsTrigger value="calculation">
            <Calculator />
            {t('Calculation')}
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <FileText />
            PDF
          </TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <QuotationGeneralTab quotation={quotation} />
        </TabsContent>
        <TabsContent value="calculation">
          <QuotationCalculationTab quotation={quotation} canEdit={canModify} />
        </TabsContent>
        <TabsContent value="pdf">
          <QuotationPreview quotation={quotation} />
        </TabsContent>
      </Tabs>

      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('Delete quotation {ref}?', { ref: quotation.reference })}
        description="The quotation and its calculation will be removed. This cannot be undone."
        onConfirm={() => {
          deleteQuotation(quotation.id)
          navigate('/quotations')
        }}
      />
    </div>
  )
}
