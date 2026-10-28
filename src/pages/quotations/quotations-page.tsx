import { useState } from 'react'
import { useNavigate } from 'react-router'

import { ConfirmDelete } from '@/components/confirm-delete'
import { DataTable } from '@/components/data-table/data-table'
import { DocumentToolbar } from '@/components/document-toolbar'
import { PageHeader } from '@/components/page-header'
import { quotationStatuses } from '@/components/status-badge'
import { useCanModify } from '@/data/auth'
import { copyQuotation, createShipmentFromQuotation, deleteQuotation, useMemberName, useQuotations } from '@/data/store'
import { TRANSPORT_MODES, transportModeLabels } from '@/types/logistics'
import { QUOTATION_STATUSES, type Quotation } from '@/types/quotation'
import { quotationColumns } from './quotation-columns'
import { QuotationPreview } from './quotation-preview'
import { t } from '@/i18n'

const statusOptions = QUOTATION_STATUSES.map((value) => ({ value, label: quotationStatuses[value].label }))
const modeOptions = TRANSPORT_MODES.map((value) => ({ value, label: transportModeLabels[value] }))

export function QuotationsPage() {
  const navigate = useNavigate()
  const quotations = useQuotations()
  const [selectedId, setSelectedId] = useState<string>()
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Если выбранную котировку удалили, selected станет undefined — кнопки сами выключатся
  const selected = quotations.find((q) => q.id === selectedId)
  const canModify = useCanModify(selected)
  const ownerName = useMemberName(selected?.createdBy)

  const open = (quotation: Quotation) => navigate(`/quotations/${quotation.id}`)

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-6">
      <PageHeader
        title="Quotations"
        description="Price offers for customers: route, cargo, calculation and margin."
        actions={
          <DocumentToolbar
            hasSelection={!!selected}
            canModify={canModify}
            ownerName={ownerName}
            onNew={() => navigate('/quotations/new')}
            onEdit={() => selected && navigate(`/quotations/${selected.id}/edit`)}
            onOpen={() => selected && open(selected)}
            onCopy={() => {
              const copy = selected && copyQuotation(selected.id)
              if (copy) setSelectedId(copy.id)
            }}
            onCreateShipment={() => {
              const shipment = selected && createShipmentFromQuotation(selected.id)
              if (shipment) navigate(`/shipments/${shipment.id}`)
            }}
            createShipmentDisabled={selected?.status === 'shipment_created' || selected?.status === 'cancelled'}
            onDelete={() => setConfirmOpen(true)}
          />
        }
      />

      <DataTable
        columns={quotationColumns}
        data={quotations}
        getRowId={(q) => q.id}
        selectedId={selected?.id}
        onSelect={(q) => setSelectedId(q?.id)}
        onOpen={open}
        searchPlaceholder="Search reference, customer, city..."
        facetFilters={[
          { columnId: 'status', title: 'Status', options: statusOptions },
          { columnId: 'mode', title: 'Mode', options: modeOptions },
        ]}
        initialSorting={[{ id: 'reference', desc: true }]}
      />

      {selected ? (
        <QuotationPreview quotation={selected} />
      ) : (
        <p className="px-1 text-xs text-muted-foreground">
          {t('Click a row to select it, double-click to open the quotation.')}
        </p>
      )}

      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('Delete quotation {ref}?', { ref: selected?.reference ?? '' })}
        description="The quotation and its calculation will be removed. This cannot be undone."
        onConfirm={() => {
          if (selected) deleteQuotation(selected.id)
          setSelectedId(undefined)
        }}
      />
    </div>
  )
}
