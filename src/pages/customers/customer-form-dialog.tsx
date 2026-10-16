import { useState, type FormEvent } from 'react'

import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createCustomer, updateCustomer } from '@/data/store'
import { t } from '@/i18n'
import type { Customer } from '@/types/directory'

type FormState = Omit<Customer, 'id' | 'code'>
const empty: FormState = { name: '', country: '', city: '', address: '', contactPerson: '', email: '', phone: '' }
const required: (keyof FormState)[] = ['name', 'country', 'city']

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer
  onSaved?: (customer: Customer) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{customer ? t('Edit customer') : t('New customer')}</DialogTitle>
        </DialogHeader>
        {open && <CustomerForm customer={customer} onDone={() => onOpenChange(false)} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  )
}

function CustomerForm({
  customer,
  onDone,
  onSaved,
}: {
  customer?: Customer
  onDone: () => void
  onSaved?: (customer: Customer) => void
}) {
  const [form, setForm] = useState<FormState>(() => (customer ? { ...customer } : empty))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const bind = (key: keyof FormState) => ({
    id: `customer-${key}`,
    value: form[key],
    'aria-invalid': !!errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    for (const key of required) if (!form[key].trim()) next[key] = t('Required field')
    setErrors(next)
    if (Object.keys(next).length) return
    const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, String(v).trim()])) as FormState
    if (customer) {
      updateCustomer(customer.id, data)
      onSaved?.({ ...customer, ...data })
    } else {
      onSaved?.(createCustomer(data))
    }
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Company name" htmlFor="customer-name" required error={errors.name} className="sm:col-span-2">
          <Input {...bind('name')} autoFocus />
        </FormField>
        <FormField label="Country" htmlFor="customer-country" required error={errors.country}>
          <Input {...bind('country')} />
        </FormField>
        <FormField label="City" htmlFor="customer-city" required error={errors.city}>
          <Input {...bind('city')} />
        </FormField>
        <FormField label="Address" htmlFor="customer-address" className="sm:col-span-2">
          <Input {...bind('address')} />
        </FormField>
        <FormField label="Contact person" htmlFor="customer-contactPerson">
          <Input {...bind('contactPerson')} />
        </FormField>
        <FormField label="Phone" htmlFor="customer-phone">
          <Input {...bind('phone')} />
        </FormField>
        <FormField label="Email" htmlFor="customer-email" className="sm:col-span-2">
          <Input {...bind('email')} type="email" />
        </FormField>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button type="submit">{customer ? t('Save changes') : t('Create customer')}</Button>
      </DialogFooter>
    </form>
  )
}
