import { useState } from 'react'

import { Combobox, ComboboxAction } from '@/components/combobox'
import { useVendors } from '@/data/store'
import { t } from '@/i18n'
import { VendorFormDialog } from '@/pages/vendors/vendor-form-dialog'
import { transportModeLabels, type TransportMode } from '@/types/logistics'

// Выбор подрядчика с поиском; если его нет — «Новый подрядчик» прямо из списка.
// Подрядчики под нужный вид транспорта идут первыми.
export function VendorPicker({
  id,
  value,
  onChange,
  mode,
}: {
  id?: string
  value: string // id подрядчика или '' — не выбран
  onChange: (vendorId: string) => void
  mode?: TransportMode
}) {
  const vendors = useVendors()
  const [creating, setCreating] = useState(false)

  const sorted = mode
    ? [...vendors].sort((a, b) => Number(b.modes.includes(mode)) - Number(a.modes.includes(mode)))
    : vendors
  const options = [
    { value: '', label: '—' },
    ...sorted.map((v) => ({
      value: v.id,
      label: v.name,
      hint: v.modes.map((m) => t(transportModeLabels[m])).join(', '),
    })),
  ]

  return (
    <>
      <Combobox
        id={id}
        value={value}
        options={options}
        placeholder="Select vendor"
        onChange={onChange}
        footer={(close) => (
          <ComboboxAction
            onClick={() => {
              close()
              setCreating(true)
            }}
          >
            {t('New vendor')}
          </ComboboxAction>
        )}
      />
      <VendorFormDialog open={creating} onOpenChange={setCreating} onSaved={(v) => onChange(v.id)} />
    </>
  )
}
