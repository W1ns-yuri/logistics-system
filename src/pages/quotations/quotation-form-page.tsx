import { useState, type FormEvent } from 'react'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { CustomerPicker } from '@/components/customer-picker'
import { FormField } from '@/components/form-field'
import { VendorPicker } from '@/components/vendor-picker'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { quotationStatuses } from '@/components/status-badge'
import { useSettings } from '@/data/settings'
import { createQuotation, updateQuotation, useQuotation, useVendors } from '@/data/store'
import type { Customer } from '@/types/directory'
import { t } from '@/i18n'
import { chargeTotals, quotationTotals } from '@/lib/calculation'
import { formatMoney, formatPercent } from '@/lib/format'
import {
  CURRENCIES,
  EQUIPMENT_TYPES,
  INCOTERMS,
  MOVEMENTS,
  TRANSPORT_MODES,
  movementLabels,
  transportModeLabels,
  type Currency,
  type EquipmentType,
  type Incoterm,
  type Movement,
  type TransportMode,
} from '@/types/logistics'
import {
  QUOTATION_STATUSES,
  type CargoLine,
  type Charge,
  type Quotation,
  type QuotationStatus,
} from '@/types/quotation'
import { NotFoundPage } from '@/pages/not-found'

/*
 * Форма котировки: создание (/quotations/new) и редактирование (/quotations/:id/edit).
 * Поля — со слайдов 3–4 презентации. Что обязательно, а что нет — со встречи с заказчиком:
 * порты, объём и CWT необязательны, «Nature of goods» (последнее поле) — обязательно.
 */

// Всё, что заполняет человек. Числа держим строками, пока он печатает, и переводим при сохранении.
type FormState = {
  status: QuotationStatus
  customer: string
  customerAddress: string
  contactPerson: string
  collectionAddress: string
  deliveryAddress: string
  portOfDeparture: string
  portOfDelivery: string
  incoterm: Incoterm
  movement: Movement
  mode: TransportMode
  equipment: EquipmentType
  transportQuantity: string
  weight: string
  weightUnit: 'kg' | 't'
  volumeM3: string
  chargeableWeightKg: string
  natureOfGoods: string
  cargo: CargoLine[]
  carrier: string
  currency: Currency
  transitTime: string
  paymentTerms: string
  validTo: string
  charges: Charge[]
  termsAndConditions: string
  notes: string
}

type Errors = Partial<Record<keyof FormState, string>>

const emptyCharge = (): Charge => ({
  id: crypto.randomUUID(),
  vendorId: '', // '' — подрядчик не выбран (своя услуга)
  chargeType: '',
  quantity: 1,
  rateIncome: 0,
  rateCost: 0,
})

function toForm(q: Quotation | undefined, defaults: { currency: Currency; validDays: number }): FormState {
  const validTo = new Date()
  validTo.setDate(validTo.getDate() + defaults.validDays)
  return {
    status: q?.status ?? 'in_progress',
    customer: q?.customer ?? '',
    customerAddress: q?.customerAddress ?? '',
    contactPerson: q?.contactPerson ?? '',
    collectionAddress: q?.collectionAddress ?? '',
    deliveryAddress: q?.deliveryAddress ?? '',
    portOfDeparture: q?.portOfDeparture ?? '',
    portOfDelivery: q?.portOfDelivery ?? '',
    incoterm: q?.incoterm ?? 'EXW',
    movement: q?.movement ?? 'door_to_door',
    mode: q?.mode ?? 'road',
    equipment: q?.equipment ?? 'FTL',
    transportQuantity: String(q?.transportQuantity ?? 1),
    weight: q ? String(q.weightKg) : '',
    weightUnit: 'kg',
    volumeM3: q?.volumeM3 != null ? String(q.volumeM3) : '',
    chargeableWeightKg: q?.chargeableWeightKg != null ? String(q.chargeableWeightKg) : '',
    natureOfGoods: q?.natureOfGoods ?? '',
    cargo: q?.cargo ?? [],
    carrier: q?.carrier ?? '',
    currency: q?.currency ?? defaults.currency,
    transitTime: q?.transitTime ?? '',
    paymentTerms: q?.paymentTerms ?? '',
    validTo: q?.validTo ?? validTo.toISOString().slice(0, 10),
    charges: q?.charges.length ? q.charges : [emptyCharge()],
    termsAndConditions: q?.termsAndConditions ?? '',
    notes: q?.notes ?? '',
  }
}

const required: (keyof FormState)[] = [
  'customer',
  'contactPerson',
  'collectionAddress',
  'deliveryAddress',
  'transportQuantity',
  'weight',
  'natureOfGoods',
]

export function QuotationFormPage() {
  const { id } = useParams()
  const existing = useQuotation(id)
  const isEdit = !!id

  // Если в адресе id несуществующей котировки — показываем 404
  if (isEdit && !existing) return <NotFoundPage />
  // key сбрасывает форму, если перешли с одной котировки на другую
  return <QuotationForm key={id ?? 'new'} existing={existing} />
}

function QuotationForm({ existing }: { existing?: Quotation }) {
  const navigate = useNavigate()
  const settings = useSettings()
  const vendors = useVendors()
  const [form, setForm] = useState(() =>
    toForm(existing, { currency: settings.defaultCurrency, validDays: settings.quotationValidityDays }),
  )
  const [errors, setErrors] = useState<Errors>({})

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  // Поле ввода, привязанное к форме: <Input {...bind('customer')} />
  const bind = (key: keyof FormState) => ({
    id: key,
    value: form[key] as string,
    'aria-invalid': !!errors[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, event.target.value as never),
  })

  // Выбрали клиента из справочника — подставляем адрес и контакт
  const pickCustomer = (name: string, customer?: Customer) => {
    setForm((prev) => ({
      ...prev,
      customer: name,
      customerAddress: customer?.address ?? prev.customerAddress,
      contactPerson: customer ? `${customer.contactPerson}, ${customer.phone}` : prev.contactPerson,
    }))
    setErrors((prev) => ({ ...prev, customer: undefined, contactPerson: undefined }))
  }

  const updateCharge = (chargeId: string, patch: Partial<Charge>) =>
    set(
      'charges',
      form.charges.map((c) => (c.id === chargeId ? { ...c, ...patch } : c)),
    )

  const updateCargo = (index: number, patch: Partial<CargoLine>) =>
    set(
      'cargo',
      form.cargo.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    )

  const weightKg = (Number(form.weight) || 0) * (form.weightUnit === 't' ? 1000 : 1)
  const totals = quotationTotals({ charges: form.charges } as Quotation)
  const money = (value: number) => formatMoney(value, form.currency)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Errors = {}
    for (const key of required) {
      if (!String(form[key]).trim()) nextErrors[key] = t('Required field')
    }
    if (form.transportQuantity && Number(form.transportQuantity) <= 0)
      nextErrors.transportQuantity = t('Must be above 0')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus()
      return
    }

    const data = {
      status: form.status,
      customer: form.customer.trim(),
      customerAddress: form.customerAddress.trim(),
      contactPerson: form.contactPerson.trim(),
      collectionAddress: form.collectionAddress.trim(),
      deliveryAddress: form.deliveryAddress.trim(),
      portOfDeparture: form.portOfDeparture.trim() || undefined,
      portOfDelivery: form.portOfDelivery.trim() || undefined,
      incoterm: form.incoterm,
      movement: form.movement,
      mode: form.mode,
      equipment: form.equipment,
      transportQuantity: Number(form.transportQuantity),
      weightKg,
      volumeM3: form.volumeM3 ? Number(form.volumeM3) : undefined,
      chargeableWeightKg: form.chargeableWeightKg ? Number(form.chargeableWeightKg) : undefined,
      natureOfGoods: form.natureOfGoods.trim(),
      cargo: form.cargo,
      // Для поиска и списка: все перевозчики из строк расчёта
      carrier: [
        ...new Set(form.charges.map((c) => vendors.find((v) => v.id === c.vendorId)?.name).filter(Boolean)),
      ].join(', '),
      currency: form.currency,
      transitTime: form.transitTime.trim(),
      paymentTerms: form.paymentTerms.trim(),
      validTo: form.validTo || undefined,
      // Пустые строки калькуляции не сохраняем
      charges: form.charges.filter((c) => c.chargeType.trim() || c.rateIncome || c.rateCost),
      termsAndConditions: form.termsAndConditions.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    if (existing) {
      updateQuotation(existing.id, data)
      navigate(`/quotations/${existing.id}`)
    } else {
      const created = createQuotation(data)
      navigate(`/quotations/${created.id}`)
    }
  }

  const backTo = existing ? `/quotations/${existing.id}` : '/quotations'

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-[1400px] space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm" aria-label={t('Back')}>
            <Link to={backTo}>
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {existing ? t('Edit quotation {ref}', { ref: existing.reference }) : t('New quotation')}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('Fields marked * are required. The number is assigned automatically.')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(backTo)}>
            {t('Cancel')}
          </Button>
          <Button type="submit">
            <Save />
            {existing ? t('Save changes') : t('Create quotation')}
          </Button>
        </div>
      </div>

      {/* ---------- General ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Customer">
          <div className="space-y-4">
            <FormField label="Customer" htmlFor="customer" required error={errors.customer}>
              <CustomerPicker
                id="customer"
                value={form.customer}
                invalid={!!errors.customer}
                onChange={(name, customer) => pickCustomer(name, customer)}
              />
            </FormField>
            <FormField label="Customer address" htmlFor="customerAddress">
              <Input {...bind('customerAddress')} />
            </FormField>
            <FormField label="Contact person" htmlFor="contactPerson" required error={errors.contactPerson}>
              <Input {...bind('contactPerson')} placeholder="Ms. Lilia Cherry, +86 000 000 123" />
            </FormField>
            {existing && (
              <FormField label="Status" htmlFor="status">
                <NativeSelect
                  id="status"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as QuotationStatus)}
                >
                  {QUOTATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(quotationStatuses[status].label)}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Route">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Pick up location" htmlFor="collectionAddress" required error={errors.collectionAddress}>
              <Input {...bind('collectionAddress')} placeholder="Shanghai" />
            </FormField>
            <FormField label="Delivery location" htmlFor="deliveryAddress" required error={errors.deliveryAddress}>
              <Input {...bind('deliveryAddress')} placeholder="Ashgabat" />
            </FormField>
            <FormField label="Port of departure" htmlFor="portOfDeparture">
              <Input {...bind('portOfDeparture')} />
            </FormField>
            <FormField label="Port of delivery" htmlFor="portOfDelivery">
              <Input {...bind('portOfDelivery')} />
            </FormField>
            <FormField label="Incoterms" htmlFor="incoterm" required>
              <NativeSelect
                id="incoterm"
                value={form.incoterm}
                onChange={(e) => set('incoterm', e.target.value as Incoterm)}
              >
                {INCOTERMS.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Movement" htmlFor="movement" required>
              <NativeSelect
                id="movement"
                value={form.movement}
                onChange={(e) => set('movement', e.target.value as Movement)}
              >
                {MOVEMENTS.map((value) => (
                  <option key={value} value={value}>
                    {t(movementLabels[value])}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Transport">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Mode" htmlFor="mode" required>
              <NativeSelect id="mode" value={form.mode} onChange={(e) => set('mode', e.target.value as TransportMode)}>
                {TRANSPORT_MODES.map((value) => (
                  <option key={value} value={value}>
                    {t(transportModeLabels[value])}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Type" htmlFor="equipment" required>
              <NativeSelect
                id="equipment"
                value={form.equipment}
                onChange={(e) => set('equipment', e.target.value as EquipmentType)}
              >
                {EQUIPMENT_TYPES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField label="Quantity" htmlFor="transportQuantity" required error={errors.transportQuantity}>
              <Input {...bind('transportQuantity')} type="number" min={1} />
            </FormField>
            <FormField label="Weight" htmlFor="weight" required error={errors.weight}>
              <div className="flex gap-2">
                <Input {...bind('weight')} type="number" min={0} step="any" />
                <div className="w-20 shrink-0">
                  <NativeSelect
                    aria-label={t('Weight unit')}
                    value={form.weightUnit}
                    onChange={(e) => set('weightUnit', e.target.value as 'kg' | 't')}
                  >
                    <option value="kg">{t('kg')}</option>
                    <option value="t">{t('ton')}</option>
                  </NativeSelect>
                </div>
              </div>
            </FormField>
            <FormField label="Volume, m³" htmlFor="volumeM3">
              <Input {...bind('volumeM3')} type="number" min={0} step="any" />
            </FormField>
            <FormField label="CWT, kg" htmlFor="chargeableWeightKg">
              <Input {...bind('chargeableWeightKg')} type="number" min={0} step="any" />
            </FormField>
            <FormField
              label="Nature of goods"
              htmlFor="natureOfGoods"
              required
              error={errors.natureOfGoods}
              className="col-span-2"
            >
              <Input {...bind('natureOfGoods')} placeholder={t('e.g. Cotton yarn')} />
            </FormField>
          </div>
        </SectionCard>
      </div>

      {/* ---------- Cargo lines (необязательно) ---------- */}
      <SectionCard
        title="Cargo"
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              set('cargo', [
                ...form.cargo,
                {
                  pieces: 1,
                  packageType: 'Box',
                  natureOfGoods: form.natureOfGoods,
                  dimensions: '',
                  weightKg: 0,
                  volumeM3: 0,
                },
              ])
            }
          >
            <Plus />
            {t('Add line')}
          </Button>
        }
      >
        {form.cargo.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('Optional. Add lines if you know pieces, packages and dimensions.')}
          </p>
        ) : (
          <div className="space-y-2 overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-[80px_1fr_1.4fr_1.2fr_110px_100px_36px] gap-2 text-xs text-muted-foreground">
              <span>{t('Pieces')}</span>
              <span>{t('Package type')}</span>
              <span>{t('Nature of goods')}</span>
              <span>{t('Dimensions')}</span>
              <span>{t('Weight, kg')}</span>
              <span>{t('Volume, m³')}</span>
              <span />
            </div>
            {form.cargo.map((line, index) => (
              <div
                key={index}
                className="grid min-w-[720px] grid-cols-[80px_1fr_1.4fr_1.2fr_110px_100px_36px] items-center gap-2"
              >
                <Input
                  type="number"
                  aria-label={t('Pieces')}
                  value={line.pieces}
                  onChange={(e) => updateCargo(index, { pieces: Number(e.target.value) })}
                />
                <Input
                  aria-label={t('Package type')}
                  value={line.packageType}
                  onChange={(e) => updateCargo(index, { packageType: e.target.value })}
                />
                <Input
                  aria-label={t('Nature of goods')}
                  value={line.natureOfGoods}
                  onChange={(e) => updateCargo(index, { natureOfGoods: e.target.value })}
                />
                <Input
                  aria-label={t('Dimensions')}
                  placeholder="120 x 80 x 100 cm"
                  value={line.dimensions}
                  onChange={(e) => updateCargo(index, { dimensions: e.target.value })}
                />
                <Input
                  type="number"
                  aria-label={t('Weight, kg')}
                  value={line.weightKg}
                  onChange={(e) => updateCargo(index, { weightKg: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  step="any"
                  aria-label={t('Volume, m³')}
                  value={line.volumeM3}
                  onChange={(e) => updateCargo(index, { volumeM3: Number(e.target.value) })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('Remove line')}
                  onClick={() =>
                    set(
                      'cargo',
                      form.cargo.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ---------- Calculation ---------- */}
      <SectionCard
        title="Calculation"
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => set('charges', [...form.charges, emptyCharge()])}
          >
            <Plus />
            {t('Add charge')}
          </Button>
        }
      >
        <div className="space-y-2 overflow-x-auto">
          <div className="grid min-w-[980px] grid-cols-[1.2fr_1.4fr_80px_120px_120px_minmax(240px,1fr)_36px] gap-2 text-xs text-muted-foreground">
            <span>{t('Carrier')}</span>
            <span>{t('Charge type')}</span>
            <span>{t('Qty')}</span>
            <span>{t('Rate income')}</span>
            <span>{t('Rate cost')}</span>
            <span className="text-right">{t('Income / Profit / Margin')}</span>
            <span />
          </div>
          {form.charges.map((charge) => {
            const line = chargeTotals(charge)
            return (
              <div
                key={charge.id}
                className="grid min-w-[980px] grid-cols-[1.2fr_1.4fr_80px_120px_120px_minmax(240px,1fr)_36px] items-center gap-2"
              >
                <VendorPicker
                  value={charge.vendorId ?? ''}
                  mode={form.mode}
                  onChange={(vendorId) => updateCharge(charge.id, { vendorId })}
                />
                <Input
                  aria-label={t('Charge type')}
                  placeholder={t('e.g. Ocean freight 40 HQ')}
                  value={charge.chargeType}
                  onChange={(e) => updateCharge(charge.id, { chargeType: e.target.value })}
                />
                <Input
                  type="number"
                  aria-label={t('Qty')}
                  value={charge.quantity}
                  onChange={(e) => updateCharge(charge.id, { quantity: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  step="any"
                  aria-label={t('Rate income')}
                  value={charge.rateIncome}
                  onChange={(e) => updateCharge(charge.id, { rateIncome: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  step="any"
                  aria-label={t('Rate cost')}
                  value={charge.rateCost}
                  onChange={(e) => updateCharge(charge.id, { rateCost: Number(e.target.value) })}
                />
                <div className="text-right text-sm tabular-nums">
                  {money(line.income)}
                  <span className="text-muted-foreground">
                    {' '}
                    / {money(line.profit)} / {formatPercent(line.margin)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('Remove charge')}
                  onClick={() =>
                    set(
                      'charges',
                      form.charges.filter((c) => c.id !== charge.id),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            )
          })}
        </div>

        {/* Итоги считаются на лету, пока человек вводит ставки */}
        <div className="mt-4 grid gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-4">
          <Total label="Rate income" value={money(totals.income)} />
          <Total label="Rate cost" value={money(totals.cost)} />
          <Total label="Profit" value={money(totals.profit)} tone={totals.profit >= 0 ? 'good' : 'bad'} />
          <Total label="Margin" value={formatPercent(totals.margin)} tone={totals.margin >= 0 ? 'good' : 'bad'} />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Currency" htmlFor="currency" required>
            <NativeSelect
              id="currency"
              value={form.currency}
              onChange={(e) => set('currency', e.target.value as Currency)}
            >
              {CURRENCIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Transit time" htmlFor="transitTime">
            <Input {...bind('transitTime')} placeholder={t('e.g. 15 days')} />
          </FormField>
          <FormField label="Payment terms" htmlFor="paymentTerms">
            <Input {...bind('paymentTerms')} placeholder="30% / 70%" />
          </FormField>
          <FormField label="Valid to" htmlFor="validTo">
            <Input {...bind('validTo')} type="date" />
          </FormField>
          <FormField label="Terms & conditions" htmlFor="termsAndConditions" className="sm:col-span-2">
            <Textarea {...bind('termsAndConditions')} rows={3} />
          </FormField>
          <FormField label="Notes" htmlFor="notes" className="sm:col-span-2">
            <Textarea {...bind('notes')} rows={3} />
          </FormField>
        </div>
      </SectionCard>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate(backTo)}>
          {t('Cancel')}
        </Button>
        <Button type="submit">
          <Save />
          {existing ? t('Save changes') : t('Create quotation')}
        </Button>
      </div>
    </form>
  )
}

function Total({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{t(label)}</div>
      <div
        className={
          tone === 'good'
            ? 'font-semibold text-success tabular-nums'
            : tone === 'bad'
              ? 'font-semibold text-destructive tabular-nums'
              : 'font-semibold tabular-nums'
        }
      >
        {value}
      </div>
    </div>
  )
}
