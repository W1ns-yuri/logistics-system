import { useMemo, useState, type FormEvent } from 'react'

import { Combobox, ComboboxAction } from '@/components/combobox'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { addCity, useCustomCities, useCustomers } from '@/data/store'
import { t } from '@/i18n'
import { allCities, countryLabel, countryOptions } from '@/lib/countries'

/*
 * Выбор города из списка вместо ручного ввода: так не будет «Ашхабад», «Ashgabat» и «Ashgabad» в одной базе.
 * В списке встроенные города, города клиентов и те, что добавили сами. Нет нужного — «Добавить город».
 */
export function CityPicker({
  id,
  value,
  onChange,
  invalid,
  placeholder = 'City',
}: {
  id?: string
  value: string
  onChange: (city: string) => void
  invalid?: boolean
  placeholder?: string
}) {
  const custom = useCustomCities()
  const customers = useCustomers()
  const [adding, setAdding] = useState(false)

  const options = useMemo(() => {
    const seen = new Set<string>()
    const list = [
      ...allCities(),
      ...custom.map((c) => ({ city: c.name, country: c.country })),
      ...customers.filter((c) => c.city).map((c) => ({ city: c.city, country: c.country })),
    ].filter(({ city }) => {
      const key = city.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    return list
      .map(({ city, country }) => ({ value: city, label: city, hint: countryLabel(country), keywords: country }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [custom, customers])

  return (
    <>
      <Combobox
        id={id}
        value={value}
        invalid={invalid}
        options={options}
        placeholder={placeholder}
        onChange={onChange}
        footer={(close) => (
          <ComboboxAction
            onClick={() => {
              close()
              setAdding(true)
            }}
          >
            {t('Add city')}
          </ComboboxAction>
        )}
      />
      <AddCityDialog
        open={adding}
        onOpenChange={setAdding}
        onAdded={(city) => {
          onChange(city)
          setAdding(false)
        }}
      />
    </>
  )
}

function AddCityDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (city: string) => void
}) {
  const countries = useMemo(() => countryOptions(), [])
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [errors, setErrors] = useState<{ name?: string; country?: string }>({})

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // Диалог открыт поверх формы котировки: не даём submit дойти до неё
    event.stopPropagation()
    const next: typeof errors = {}
    if (!name.trim()) next.name = t('Required field')
    if (!country) next.country = t('Required field')
    setErrors(next)
    if (Object.keys(next).length) return
    // Первая буква заглавная: «ashgabat» → «Ashgabat»
    const city = name.trim().charAt(0).toUpperCase() + name.trim().slice(1)
    addCity({ name: city, country })
    onAdded(city)
    setName('')
    setCountry('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('Add city')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <FormField label="Country" htmlFor="city-country" required error={errors.country}>
            <Combobox
              id="city-country"
              value={country}
              invalid={!!errors.country}
              options={countries}
              placeholder="Select country"
              onChange={(value) => {
                setCountry(value)
                setErrors((prev) => ({ ...prev, country: undefined }))
              }}
            />
          </FormField>
          <FormField label="City" htmlFor="city-name" required error={errors.name}>
            <Input
              id="city-name"
              maxLength={60}
              value={name}
              aria-invalid={!!errors.name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((prev) => ({ ...prev, name: undefined }))
              }}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit">{t('Add')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
