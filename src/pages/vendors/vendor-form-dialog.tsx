import { useMemo, useState, type FormEvent } from 'react'

import { FormField } from '@/components/form-field'
import { Combobox } from '@/components/combobox'
import { TransportModeIcon } from '@/components/transport-mode'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { createVendor, updateVendor, useVendors } from '@/data/store'
import { t } from '@/i18n'
import { countryOptions } from '@/lib/countries'
import { isValidEmail, isValidPhone } from '@/lib/input-rules'
import { cn } from '@/lib/utils'
import { VENDOR_TYPES, vendorTypeLabels, type Vendor, type VendorType } from '@/types/directory'
import { TRANSPORT_MODES, transportModeLabels, type TransportMode } from '@/types/logistics'

type FormState = Omit<Vendor, 'id' | 'code'>

const modeByType: Record<Exclude<VendorType, 'agent'>, TransportMode> = {
  airline: 'air',
  shipping_line: 'sea',
  trucking: 'road',
  rail: 'rail',
}
const empty: FormState = {
  name: '',
  type: 'trucking',
  modes: ['road'],
  country: '',
  contactPerson: '',
  email: '',
  phone: '',
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendor,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  vendor?: Vendor
  onSaved?: (vendor: Vendor) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{vendor ? t('Edit vendor') : t('New vendor')}</DialogTitle>
        </DialogHeader>
        {open && <VendorForm vendor={vendor} onDone={() => onOpenChange(false)} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  )
}

function VendorForm({
  vendor,
  onDone,
  onSaved,
}: {
  vendor?: Vendor
  onDone: () => void
  onSaved?: (vendor: Vendor) => void
}) {
  const [form, setForm] = useState<FormState>(() => (vendor ? { ...vendor } : empty))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const allVendors = useVendors()

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }
  const text = (key: 'name' | 'country' | 'contactPerson' | 'email' | 'phone') => ({
    id: `vendor-${key}`,
    value: form[key],
    'aria-invalid': !!errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value),
  })
  // Тип — кто это за компания, виды транспорта — что она реально возит. У авиакомпании это всегда
  // авиа, у линии — море и т.д., поэтому подставляем сами. Агент может делать что угодно — отмечают вручную.
  const pickType = (type: VendorType) =>
    setForm((prev) => ({ ...prev, type, modes: type === 'agent' ? prev.modes : [modeByType[type]] }))

  const countries = useMemo(() => countryOptions(), [])

  const toggleMode = (mode: TransportMode) =>
    set('modes', form.modes.includes(mode) ? form.modes.filter((m) => m !== mode) : [...form.modes, mode])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // Форма может открываться поверх другой формы (выбор клиента в перевозке): React передаёт
    // submit наверх даже через портал, поэтому не даём ему дойти до внешней формы
    event.stopPropagation()
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = t('Required field')
    const sameName = allVendors.find(
      (v) => v.id !== vendor?.id && v.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
    )
    if (form.name.trim() && sameName) next.name = t('{name} already exists in Vendors', { name: sameName.name })
    if (!form.country.trim()) next.country = t('Required field')
    if (!form.modes.length) next.modes = t('Pick at least one mode')
    if (form.phone.trim() && !isValidPhone(form.phone)) next.phone = t('Enter a valid phone number')
    if (form.email.trim() && !isValidEmail(form.email)) next.email = t('Enter a valid email')
    setErrors(next)
    if (Object.keys(next).length) return
    const data: FormState = {
      ...form,
      name: form.name.trim(),
      country: form.country.trim(),
      contactPerson: form.contactPerson.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    }
    if (vendor) {
      updateVendor(vendor.id, data)
      onSaved?.({ ...vendor, ...data })
    } else {
      onSaved?.(createVendor(data))
    }
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Company name" htmlFor="vendor-name" required error={errors.name} className="sm:col-span-2">
          <Input {...text('name')} autoFocus />
        </FormField>
        <FormField label="Company type" htmlFor="vendor-type" required>
          <NativeSelect id="vendor-type" value={form.type} onChange={(e) => pickType(e.target.value as VendorType)}>
            {VENDOR_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(vendorTypeLabels[value])}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Country" htmlFor="vendor-country" required error={errors.country}>
          <Combobox
            id="vendor-country"
            value={form.country}
            invalid={!!errors.country}
            options={countries}
            placeholder="Select country"
            onChange={(country) => {
              set('country', country)
              setErrors((prev) => ({ ...prev, country: undefined }))
            }}
          />
        </FormField>
        <FormField label="Transport they handle" required error={errors.modes} className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {TRANSPORT_MODES.map((mode) => {
              const active = form.modes.includes(mode)
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleMode(mode)}
                  className={cn(
                    'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors',
                    active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                  )}
                >
                  <TransportModeIcon mode={mode} className={active ? 'text-primary' : undefined} />
                  {t(transportModeLabels[mode])}
                </button>
              )
            })}
          </div>
        </FormField>
        <FormField label="Contact person" htmlFor="vendor-contactPerson">
          <Input {...text('contactPerson')} />
        </FormField>
        <FormField label="Phone" htmlFor="vendor-phone" error={errors.phone}>
          <Input {...text('phone')} type="tel" placeholder="+993 12 345678" />
        </FormField>
        <FormField label="Email" htmlFor="vendor-email" className="sm:col-span-2" error={errors.email}>
          <Input {...text('email')} type="email" />
        </FormField>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button type="submit">{vendor ? t('Save changes') : t('Create vendor')}</Button>
      </DialogFooter>
    </form>
  )
}
