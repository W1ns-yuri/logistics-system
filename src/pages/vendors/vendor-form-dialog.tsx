import { useState, type FormEvent } from 'react'

import { FormField } from '@/components/form-field'
import { TransportModeIcon } from '@/components/transport-mode'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { createVendor, updateVendor } from '@/data/store'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'
import { VENDOR_TYPES, vendorTypeLabels, type Vendor } from '@/types/directory'
import { TRANSPORT_MODES, transportModeLabels, type TransportMode } from '@/types/logistics'

type FormState = Omit<Vendor, 'id' | 'code'>
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
  const toggleMode = (mode: TransportMode) =>
    set('modes', form.modes.includes(mode) ? form.modes.filter((m) => m !== mode) : [...form.modes, mode])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (!form.name.trim()) next.name = t('Required field')
    if (!form.country.trim()) next.country = t('Required field')
    if (!form.modes.length) next.modes = t('Pick at least one mode')
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
        <FormField label="Type" htmlFor="vendor-type" required>
          <NativeSelect
            id="vendor-type"
            value={form.type}
            onChange={(e) => set('type', e.target.value as FormState['type'])}
          >
            {VENDOR_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(vendorTypeLabels[value])}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Country" htmlFor="vendor-country" required error={errors.country}>
          <Input {...text('country')} />
        </FormField>
        <FormField label="Modes" required error={errors.modes} className="sm:col-span-2">
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
        <FormField label="Contact person" htmlFor="vendor-contactPerson" optional>
          <Input {...text('contactPerson')} />
        </FormField>
        <FormField label="Phone" htmlFor="vendor-phone" optional>
          <Input {...text('phone')} />
        </FormField>
        <FormField label="Email" htmlFor="vendor-email" optional className="sm:col-span-2">
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
