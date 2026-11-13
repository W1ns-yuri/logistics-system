import { Clock, Kanban, Table2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { daysLate, SHIPMENT_STATUSES, type Shipment } from '@/types/shipment'
import { ShipmentBoard } from './shipment-board'
import { getShipmentColumns } from './shipment-columns'
import { ShipmentFormDialog } from './shipment-form-dialog'

const statusOptions = [...SHIPMENT_STATUSES, 'cancelled' as const].map((value) => ({
  value,
  label: shipmentStatuses[value].label,
}))
const modeOptions = TRANSPORT_MODES.map((value) => ({ value, label: transportModeLabels[value] }))

// Вид страницы: таблица (по умолчанию) или доска по статусам. Выбор запоминаем в браузере
type View = 'table' | 'board'
const VIEW_KEY = 'shipments-view'
const VIEWS: { value: View; label: string; icon: typeof Table2 }[] = [
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'board', label: 'Board', icon: Kanban },
]
function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'table'
  } catch {
    return 'table'
  }
}

export function ShipmentsPage() {
  const navigate = useNavigate()
  const shipments = useShipments()
  const invoices = useInvoices()
  const { canSeePayments } = usePermissions()
  const [selectedId, setSelectedId] = useState<string>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { mode: formMode, setMode: setFormMode, close: closeForm } = useFormMode()
  const [view, setView] = useState<View>(readView)
  const [onlyLate, setOnlyLate] = useState(false)
  const changeView = (value: View) => {
    setView(value)
    try {
      localStorage.setItem(VIEW_KEY, value)
    } catch {
      // приватный режим — просто не запоминаем
    }
  }
  const lateCount = shipments.filter((s) => daysLate(s) > 0).length
  const visible = onlyLate ? shipments.filter((s) => daysLate(s) > 0) : shipments

  const selected = shipments.find((s) => s.id === selectedId)
  const canModify = useCanModify(selected)
  const ownerName = useMemberName(selected?.createdBy)
  const open = (shipment: Shipment) => navigate(`/shipments/${shipment.id}`)
  const columns = useMemo(
    () => getShipmentColumns({ invoices, showPayment: canSeePayments }),
    [invoices, canSeePayments],
  )

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Shipments"
        description="Active and completed shipments with ETD, ETA and status tracking."
        stacked
        actions={
          <>
            <DocumentToolbar
              hasSelection={!!selected}
              canModify={canModify}
              ownerName={ownerName}
              editDisabled={selected?.status === 'cancelled'}
              onNew={() => setFormMode('new')}
              onOpen={() => selected && open(selected)}
              onEdit={() => setFormMode('edit')}
              onCopy={() => {
                const copy = selected && copyShipment(selected.id)
                if (copy) setSelectedId(copy.id)
              }}
              onDelete={() => setConfirmOpen(true)}
            />
            {/* Таблица или доска и фильтр «Опаздывают» — в той же строке, что и кнопки */}
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <div className="inline-flex rounded-lg border bg-muted/50 p-0.5" role="radiogroup" aria-label={t('View')}>
                {VIEWS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    role="radio"
                    aria-checked={view === v.value}
                    onClick={() => changeView(v.value)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors',
                      view === v.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <v.icon className="size-4" />
                    {t(v.label)}
                  </button>
                ))}
              </div>
              {(lateCount > 0 || onlyLate) && (
                <button
                  type="button"
                  aria-pressed={onlyLate}
                  onClick={() => setOnlyLate((v) => !v)}
                  data-testid="late-filter"
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition-colors',
                    onlyLate
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'text-muted-foreground hover:border-destructive/50 hover:text-destructive',
                  )}
                >
                  <Clock className="size-4" />
                  {t('Late')}
                  <span className="font-medium tabular-nums">{lateCount}</span>
                </button>
              )}
            </div>
          </>
        }
      />

      {view === 'board' ? (
        <ShipmentBoard shipments={visible} />
      ) : (
        <DataTable
          exportName="Shipments"
          columns={columns}
          data={visible}
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
      )}

      {view === 'table' && (
        <p className="px-1 text-xs text-muted-foreground">
          {t('Click the number to open a shipment. Click a row to select it for the buttons above.')}
        </p>
      )}

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
