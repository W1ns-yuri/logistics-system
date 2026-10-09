import { useState } from 'react'
import { ArrowLeft, Calculator, Copy, FileText, Info, Printer, Trash2, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { ComingSoon } from '@/components/coming-soon'
import { ConfirmDelete } from '@/components/confirm-delete'
import { QuotationStatusBadge } from '@/components/status-badge'
import { TransportModeIcon } from '@/components/transport-mode'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { copyQuotation, createShipmentFromQuotation, deleteQuotation, useQuotation } from '@/data/store'
import { formatDate } from '@/lib/format'
import { NotFoundPage } from '@/pages/not-found'
import { QuotationCalculationTab } from './quotation-calculation-tab'
import { QuotationGeneralTab } from './quotation-general-tab'

// Карточка котировки: вкладки General / Calculation / PDF (слайды 3–4 презентации)
export function QuotationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const quotation = useQuotation(id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!quotation) return <NotFoundPage />

  const canCreateShipment = quotation.status !== 'shipment_created' && quotation.status !== 'cancelled'

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="icon-sm" aria-label="Back to quotations">
            <Link to="/quotations">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{quotation.reference}</h1>
              <QuotationStatusBadge status={quotation.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <TransportModeIcon mode={quotation.mode} />
              <span>{quotation.customer}</span>
              <span>·</span>
              <span>
                {quotation.collectionAddress} → {quotation.deliveryAddress}
              </span>
              <span>·</span>
              <span>Created {formatDate(quotation.createdAt)}</span>
              {quotation.validTo && (
                <>
                  <span>·</span>
                  <span>Valid to {formatDate(quotation.validTo)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled title="PDF comes in a later step">
            <Printer />
            Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const copy = copyQuotation(quotation.id)
              if (copy) navigate(`/quotations/${copy.id}`)
            }}
          >
            <Copy />
            Copy
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
            Delete
          </Button>
          <Button
            size="sm"
            disabled={!canCreateShipment}
            onClick={() => {
              const shipment = createShipmentFromQuotation(quotation.id)
              if (shipment) navigate(`/shipments/${shipment.id}`)
            }}
          >
            <Truck />
            Create shipment
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Info />
            General
          </TabsTrigger>
          <TabsTrigger value="calculation">
            <Calculator />
            Calculation
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
          <QuotationCalculationTab quotation={quotation} />
        </TabsContent>
        <TabsContent value="pdf">
          <ComingSoon
            icon={FileText}
            title="PDF preview is on the way"
            description="The quotation will be rendered as a PDF in the same layout as the Kras Logistics example."
          />
        </TabsContent>
      </Tabs>

      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete quotation ${quotation.reference}?`}
        description="The quotation and its calculation will be removed. This cannot be undone."
        onConfirm={() => {
          deleteQuotation(quotation.id)
          navigate('/quotations')
        }}
      />
    </div>
  )
}
