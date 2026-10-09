import { useState } from 'react'
import { useNavigate } from 'react-router'

import { ConfirmDelete } from '@/components/confirm-delete'
import { DataTable } from '@/components/data-table/data-table'
import { DocumentToolbar } from '@/components/document-toolbar'
import { PageHeader } from '@/components/page-header'
import { shipmentStatuses } from '@/components/status-badge'
import { copyShipment, deleteShipment, useShipments } from '@/data/store'
import { TRANSPORT_MODES, transportModeLabels } from '@/types/logistics'
import { SHIPMENT_STATUSES, type Shipment } from '@/types/shipment'
import { shipmentColumns } from './shipment-columns'

const statusOptions = [...SHIPMENT_STATUSES, 'cancelled' as const].map((value) => ({
  value,
  label: shipmentStatuses[value].label,
}))
const modeOptions = TRANSPORT_MODES.map((value) => ({ value, label: transportModeLabels[value] }))

export function ShipmentsPage() {
  const navigate = useNavigate()
  const shipments = useShipments()
  const [selectedId, setSelectedId] = useState<string>()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const selected = shipments.find((s) => s.id === selectedId)
  const open = (shipment: Shipment) => navigate(`/shipments/${shipment.id}`)

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-6">
      <PageHeader
        title="Shipments"
        description="Active and completed shipments with ETD, ETA and status tracking."
        actions={
          <DocumentToolbar
            hasSelection={!!selected}
            onOpen={() => selected && open(selected)}
            onCopy={() => {
              const copy = selected && copyShipment(selected.id)
              if (copy) setSelectedId(copy.id)
            }}
            onDelete={() => setConfirmOpen(true)}
          />
        }
      />

      <DataTable
        columns={shipmentColumns}
        data={shipments}
        getRowId={(s) => s.id}
        selectedId={selected?.id}
        onSelect={(s) => setSelectedId(s?.id)}
        onOpen={open}
        searchPlaceholder="Search number, customer, city..."
        facetFilters={[
          { columnId: 'status', title: 'Status', options: statusOptions },
          { columnId: 'mode', title: 'Mode', options: modeOptions },
        ]}
        initialSorting={[{ id: 'orderDate', desc: true }]}
        // Отменённые зачёркнуты, как в Scope
        rowClassName={(s) => (s.status === 'cancelled' ? 'text-muted-foreground line-through' : undefined)}
      />

      <p className="px-1 text-xs text-muted-foreground">Click a row to select it, double-click to open the shipment.</p>

      <ConfirmDelete
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete shipment ${selected?.number ?? ''}?`}
        description="The shipment and its status history will be removed. This cannot be undone."
        onConfirm={() => {
          if (selected) deleteShipment(selected.id)
          setSelectedId(undefined)
        }}
      />
    </div>
  )
}
