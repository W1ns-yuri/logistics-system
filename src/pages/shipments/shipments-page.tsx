import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { ConfirmDelete } from '@/components/confirm-delete'
import { DataTable } from '@/components/data-table/data-table'
import { DocumentToolbar } from '@/components/document-toolbar'
import { PageHeader } from '@/components/page-header'
import { shipmentStatuses } from '@/components/status-badge'
import { useCanModify, usePermissions } from '@/data/auth'
import { useFormMode } from '@/hooks/use-form-mode'
import { copyShipment, deleteShipment, useInvoices, useMemberName, useShipments } from '@/data/store'
import { t } from '@/i18n'
import { TRANSPORT_MODES, transportModeLabels } from '@/types/logistics'
import { SHIPMENT_STATUSES, type Shipment } from '@/types/shipment'
import { getShipmentColumns } from './shipment-columns'
import { ShipmentFormDialog } from './shipment-form-dialog'

const statusOptions = [...SHIPMENT_STATUSES, 'cancelled' as const].map((value) => ({
  value,
  label: shipmentStatuses[value].label,
}))
const modeOptions = TRANSPORT_MODES.map((value) => ({ value, label: transportModeLabels[value] }))

export function ShipmentsPage() {
  const navigate = useNavigate()
  const shipments = useShipments()
  const invoices = useInvoices()
  const { canSeePayments } = usePermissions()
  const [selectedId, setSelectedId] = useState<string>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { mode: formMode, setMode: setFormMode, close: closeForm } = useFormMode()

  const selected = shipments.find((s) => s.id === selectedId)
  const canModify = useCanModify(selected)
  const ownerName = useMemberName(selected?.createdBy)
  const open = (shipment: Shipment) => navigate(`/shipments/${shipment.id}`)
  const columns = useMemo(
    () => getShipmentColumns({ invoices, showPayment: canSeePayments }),
    [invoices, canSeePayments],
  )

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-6">
      <PageHeader
        title="Shipments"
        description="Active and completed shipments with ETD, ETA and status tracking."
        actions={
          <DocumentToolbar
            hasSelection={!!selected}
            canModify={canModify}
            ownerName={ownerName}
            onNew={() => setFormMode('new')}
            onOpen={() => selected && open(selected)}
            onEdit={() => setFormMode('edit')}
            onCopy={() => {
              const copy = selected && copyShipment(selected.id)
              if (copy) setSelectedId(copy.id)
            }}
            onDelete={() => setConfirmOpen(true)}
          />
        }
      />

      <DataTable
        columns={columns}
        data={shipments}
        getRowId={(s) => s.id}
        selectedId={selected?.id}
        onSelect={(s) => setSelectedId(s?.id)}
        onOpen={open}
        searchPlaceholder={t('Search number, customer, city...')}
        facetFilters={[
          { columnId: 'status', title: 'Status', options: statusOptions },
          { columnId: 'mode', title: 'Mode', options: modeOptions },
        ]}
        initialSorting={[{ id: 'orderDate', desc: true }]}
        // Отменённые зачёркнуты, как в Scope
        rowClassName={(s) => (s.status === 'cancelled' ? 'text-muted-foreground line-through' : undefined)}
      />

      <p className="px-1 text-xs text-muted-foreground">
        {t('Click a row to select it, double-click to open the shipment.')}
      </p>

      <ShipmentFormDialog
        open={!!formMode}
        onOpenChange={(value) => !value && closeForm()}
        shipment={formMode === 'edit' ? selected : undefined}
        onSaved={(s) => setSelectedId(s.id)}
      />

      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('Delete shipment {ref}?', { ref: selected?.number ?? '' })}
        description={t('The shipment, its documents and status history will be removed. This cannot be undone.')}
        onConfirm={() => {
          if (selected) deleteShipment(selected.id)
          setSelectedId(undefined)
        }}
      />
    </div>
  )
}
