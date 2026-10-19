import { useState, type FormEvent } from 'react'

import { CustomerPicker } from '@/components/customer-picker'
import { FormField } from '@/components/form-field'
import { VendorPicker } from '@/components/vendor-picker'
import { shipmentStatuses } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { createShipment, updateShipment } from '@/data/store'
import { t } from '@/i18n'
import {
  EQUIPMENT_TYPES,
  TRANSPORT_MODES,
  transportModeLabels,
  type EquipmentType,
  type TransportMode,
} from '@/types/logistics'
import { SHIPMENT_STATUSES, type Shipment, type ShipmentStatus } from '@/types/shipment'

type FormState = {
  customer: string
  vendorId: string
  mode: TransportMode
  collectionAddress: string
  deliveryAddress: string
  orderDate: string
  etd: string
  eta: string
  equipment: EquipmentType
  transportQuantity: string
  cargoDescription: string
  weightKg: string
  status: ShipmentStatus
  notes: string
}

const requiredFields: (keyof FormState)[] = [
  'customer',
  'collectionAddress',
  'deliveryAddress',
  'orderDate',
  'transportQuantity',
  'weightKg',
]

function toForm(s?: Shipment): FormState {
  return {
    customer: s?.customer ?? '',
    vendorId: s?.vendorId ?? '',
    mode: s?.mode ?? 'road',
    collectionAddress: s?.collectionAddress ?? '',
    deliveryAddress: s?.deliveryAddress ?? '',
    orderDate: s?.orderDate ?? new Date().toISOString().slice(0, 10),
    etd: s?.etd ?? '',
    eta: s?.eta ?? '',
    equipment: s?.equipment ?? 'FTL',
    transportQuantity: String(s?.transportQuantity ?? 1),
    cargoDescription: s?.cargoDescription ?? '',
    weightKg: s ? String(s.weightKg) : '',
    status: s?.status ?? 'pending',
    notes: s?.notes ?? '',
  }
}

// Создание и редактирование шипмента в одном окне. Менеджер может поменять любое поле.
export function ShipmentFormDialog({
  open,
  onOpenChange,
  shipment,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment?: Shipment
  onSaved?: (shipment: Shipment) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{shipment ? t('Edit shipment {ref}', { ref: shipment.number }) : t('New shipment')}</DialogTitle>
        </DialogHeader>
        {/* Форма монтируется заново при каждом открытии, поэтому поля всегда свежие */}
        {open && <ShipmentForm shipment={shipment} onDone={() => onOpenChange(false)} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  )
}

function ShipmentForm({
  shipment,
  onDone,
  onSaved,
}: {
  shipment?: Shipment
  onDone: () => void
  onSaved?: (shipment: Shipment) => void
}) {
  const [form, setForm] = useState(() => toForm(shipment))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const bind = (key: keyof FormState) => ({
    id: `shipment-${key}`,
    value: form[key],
    'aria-invalid': !!errors[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    for (const key of requiredFields) if (!form[key].trim()) nextErrors[key] = t('Required field')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const data = {
      customer: form.customer.trim(),
      vendorId: form.vendorId || undefined,
      mode: form.mode,
      collectionAddress: form.collectionAddress.trim(),
      deliveryAddress: form.deliveryAddress.trim(),
      orderDate: form.orderDate,
      etd: form.etd || undefined,
      eta: form.eta || undefined,
      equipment: form.equipment,
      transportQuantity: Number(form.transportQuantity) || 1,
      cargoDescription: form.cargoDescription.trim(),
      weightKg: Number(form.weightKg) || 0,
      status: form.status,
      notes: form.notes.trim() || undefined,
    }

    if (shipment) {
      // Если статус поменяли в форме — добавляем запись в историю
      const history =
        form.status !== shipment.status
          ? [...shipment.history, { status: form.status, at: new Date().toISOString() }]
          : shipment.history
      updateShipment(shipment.id, { ...data, history })
      onSaved?.({ ...shipment, ...data, history })
    } else {
      onSaved?.(createShipment(data))
    }
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Customer" htmlFor="shipment-customer" required error={errors.customer}>
          <CustomerPicker
            id="shipment-customer"
            value={form.customer}
            invalid={!!errors.customer}
            onChange={(name) => {
              setForm((prev) => ({ ...prev, customer: name }))
              setErrors((prev) => ({ ...prev, customer: undefined }))
            }}
          />
        </FormField>
        <FormField label="Vendor (carrier)" htmlFor="shipment-vendorId">
          <VendorPicker
            id="shipment-vendorId"
            value={form.vendorId}
            mode={form.mode}
            onChange={(vendorId) => setForm((prev) => ({ ...prev, vendorId }))}
          />
        </FormField>
        <FormField
          label="Pick up location"
          htmlFor="shipment-collectionAddress"
          required
          error={errors.collectionAddress}
        >
          <Input {...bind('collectionAddress')} />
        </FormField>
        <FormField label="Delivery location" htmlFor="shipment-deliveryAddress" required error={errors.deliveryAddress}>
          <Input {...bind('deliveryAddress')} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Order date" htmlFor="shipment-orderDate" required error={errors.orderDate}>
          <Input {...bind('orderDate')} type="date" />
        </FormField>
        <FormField label="ETD" htmlFor="shipment-etd">
          <Input {...bind('etd')} type="date" />
        </FormField>
        <FormField label="ETA" htmlFor="shipment-eta">
          <Input {...bind('eta')} type="date" />
        </FormField>
        <FormField label="Mode" htmlFor="shipment-mode" required>
          <NativeSelect {...bind('mode')}>
            {TRANSPORT_MODES.map((value) => (
              <option key={value} value={value}>
                {t(transportModeLabels[value])}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Type" htmlFor="shipment-equipment" required>
          <NativeSelect {...bind('equipment')}>
            {EQUIPMENT_TYPES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Quantity" htmlFor="shipment-transportQuantity" required error={errors.transportQuantity}>
          <Input {...bind('transportQuantity')} type="number" min={1} />
        </FormField>
        <FormField label="Weight, kg" htmlFor="shipment-weightKg" required error={errors.weightKg}>
          <Input {...bind('weightKg')} type="number" min={0} />
        </FormField>
        <FormField label="Packages" htmlFor="shipment-cargoDescription">
          <Input {...bind('cargoDescription')} placeholder={t('e.g. 24 Box')} />
        </FormField>
        <FormField label="Status" htmlFor="shipment-status">
          <NativeSelect {...bind('status')}>
            {[...SHIPMENT_STATUSES, 'cancelled' as const].map((status) => (
              <option key={status} value={status}>
                {t(shipmentStatuses[status].label)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Notes" htmlFor="shipment-notes" className="sm:col-span-3">
          <Textarea {...bind('notes')} rows={2} />
        </FormField>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button type="submit">{shipment ? t('Save changes') : t('Create shipment')}</Button>
      </DialogFooter>
    </form>
  )
}
