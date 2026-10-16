import { useState } from 'react'

import { Combobox, ComboboxAction } from '@/components/combobox'
import { useCustomers } from '@/data/store'
import { t } from '@/i18n'
import { countryLabel } from '@/lib/countries'
import { CustomerFormDialog } from '@/pages/customers/customer-form-dialog'
import type { Customer } from '@/types/directory'

// Выбор клиента с поиском; если клиента нет — «Новый клиент» прямо из списка
export function CustomerPicker({
  id,
  value,
  onChange,
  invalid,
}: {
  id?: string
  value: string
  onChange: (name: string, customer?: Customer) => void
  invalid?: boolean
}) {
  const customers = useCustomers()
  const [creating, setCreating] = useState(false)

  const options = customers.map((c) => ({
    value: c.name,
    label: c.name,
    hint: [c.city, countryLabel(c.country)].filter(Boolean).join(', '),
  }))

  return (
    <>
      <Combobox
        id={id}
        value={value}
        invalid={invalid}
        options={options}
        placeholder="Select customer"
        onChange={(name) =>
          onChange(
            name,
            customers.find((c) => c.name === name),
          )
        }
        footer={(close) => (
          <ComboboxAction
            onClick={() => {
              close()
              setCreating(true)
            }}
          >
            {t('New customer')}
          </ComboboxAction>
        )}
      />
      <CustomerFormDialog open={creating} onOpenChange={setCreating} onSaved={(c) => onChange(c.name, c)} />
    </>
  )
}
