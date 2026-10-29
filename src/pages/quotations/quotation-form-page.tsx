import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Link, Navigate, useBlocker, useNavigate, useParams } from 'react-router'

import { CityPicker } from '@/components/city-picker'
import { Combobox } from '@/components/combobox'
import { ConfirmDelete } from '@/components/confirm-delete'
import { CustomerPicker } from '@/components/customer-picker'
import { FieldHint, FormField } from '@/components/form-field'
import { VendorPicker } from '@/components/vendor-picker'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { quotationStatuses } from '@/components/status-badge'
import { useCanModify } from '@/data/auth'
import { useSettings } from '@/data/settings'
import { createQuotation, updateQuotation, useQuotation, useQuotations, useVendors } from '@/data/store'
import type { Customer } from '@/types/directory'
import { t } from '@/i18n'
import { chargeTotals, quotationTotals } from '@/lib/calculation'
import { formatMoney, formatPercent } from '@/lib/format'
import { terminalLabels, terminalSuggestions } from '@/lib/terminals'
import {
  CURRENCIES,
  equipmentByMode,
  INCOTERMS,
  MOVEMENTS,
  needsPorts,
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
    // В форме — только число дней (или диапазон 15-20), слово «days» добавляем при сохранении
    transitTime: (q?.transitTime ?? '').match(/\d+(\s*-\s*\d+)?/)?.[0].replace(/\s/g, '') ?? '',
    paymentTerms: q?.paymentTerms ?? '',
    validTo: q?.validTo ?? validTo.toISOString().slice(0, 10),
    charges: q?.charges.length ? q.charges : [emptyCharge()],
    termsAndConditions: q?.termsAndConditions ?? '',
    notes: q?.notes ?? '',
  }
}

// Строка расчёта, в которую хоть что-то вписали (пустые не сохраняем и не проверяем)
const isFilled = (c: Charge) => !!(c.chargeType.trim() || c.vendorId || c.rateIncome || c.rateCost)

// Ставки и количество: не меньше нуля и без опечаток на лишние нули
const amount = (value: string) => Math.min(Math.max(Number(value) || 0, 0), 1e9)

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
  const canModify = useCanModify(existing)

  // Если в адресе id несуществующей котировки — показываем 404
  if (isEdit && !existing) return <NotFoundPage />
  // Чужую котировку открыли по ссылке на редактирование — показываем её только для просмотра
  if (isEdit && !canModify) return <Navigate to={`/quotations/${id}`} replace />
  // key сбрасывает форму, если перешли с одной котировки на другую
  return <QuotationForm key={id ?? 'new'} existing={existing} />
}

function QuotationForm({ existing }: { existing?: Quotation }) {
  const navigate = useNavigate()
  const settings = useSettings()
  const vendors = useVendors()
  const quotations = useQuotations()
  const [form, setForm] = useState(() =>
    toForm(existing, { currency: settings.defaultCurrency, validDays: settings.quotationValidityDays }),
  )
  const [errors, setErrors] = useState<Errors>({})
  const saving = useRef(false)

  // Ушли с недозаполненной формы — спрашиваем, чтобы случайный клик по меню не стёр работу
  const [initial] = useState(() => JSON.stringify(form))
  const dirty = JSON.stringify(form) !== initial
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !saving.current && currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

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
      // Пустой контакт или телефон не оставляет лишнюю запятую: «, +993…»
      contactPerson: customer
        ? [customer.contactPerson, customer.phone].filter((v) => v?.trim()).join(', ') || prev.contactPerson
        : prev.contactPerson,
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

  // Сменили вид транспорта — тип подбираем под него (у авиа это всегда Air)
  const pickMode = (mode: TransportMode) =>
    setForm((prev) => ({
      ...prev,
      mode,
      equipment: equipmentByMode[mode].includes(prev.equipment) ? prev.equipment : equipmentByMode[mode][0]!,
    }))
  // Старая котировка с неподходящим типом: оставляем его в списке, чтобы не потерять
  const equipmentOptions = [...new Set([...equipmentByMode[form.mode], form.equipment])]
  const showPorts = needsPorts(form.mode, form.movement)
  const terminals = terminalLabels(form.mode)
  // Подсказки портов/аэропортов/станций + те, что уже вписывали в других котировках
  const terminalOptions = [
    ...new Set([
      ...terminalSuggestions(form.mode),
      ...quotations
        .filter((q) => q.mode === form.mode)
        .flatMap((q) => [q.portOfDeparture, q.portOfDelivery])
        .filter((v): v is string => !!v),
    ]),
  ].map((value) => ({ value, label: value }))
  // Оплачиваемый вес в авиа: больше из фактического и объёмного (1 м³ = 167 кг)
  const suggestedCwt = Math.ceil(
    Math.max((Number(form.weight) || 0) * (form.weightUnit === 't' ? 1000 : 1), (Number(form.volumeM3) || 0) * 167),
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
    if (
      form.transportQuantity &&
      !(Number.isInteger(Number(form.transportQuantity)) && Number(form.transportQuantity) > 0)
    )
      nextErrors.transportQuantity = t('Whole number above 0')
    if (form.weight && !(Number(form.weight) > 0)) nextErrors.weight = t('Must be above 0')
    if (form.volumeM3 && Number(form.volumeM3) < 0) nextErrors.volumeM3 = t('Cannot be negative')
    if (form.chargeableWeightKg && Number(form.chargeableWeightKg) < 0)
      nextErrors.chargeableWeightKg = t('Cannot be negative')
    // Без ставки клиенту и себестоимости не посчитать прибыль — обе обязательны хотя бы в одной строке
    const filled = form.charges.filter(isFilled)
    if (!filled.length || filled.some((c) => !(c.rateIncome > 0) || !(c.rateCost > 0)))
      nextErrors.charges = t('Enter the rate to the customer and the cost in every line')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0]
      ;(document.getElementById(first) ?? document.querySelector<HTMLElement>('[aria-invalid="true"]'))?.focus()
      return
    }
    // Двойной клик по «Создать» не создаёт две котировки
    if (saving.current) return
    saving.current = true
    const ports = needsPorts(form.mode, form.movement)

    const data = {
      status: form.status,
      customer: form.customer.trim(),
      customerAddress: form.customerAddress.trim(),
      contactPerson: form.contactPerson.trim(),
      collectionAddress: form.collectionAddress.trim(),
      deliveryAddress: form.deliveryAddress.trim(),
      portOfDeparture: (ports && form.portOfDeparture.trim()) || undefined,
      portOfDelivery: (ports && form.portOfDelivery.trim()) || undefined,
      incoterm: form.incoterm,
      movement: form.movement,
      mode: form.mode,
      equipment: form.equipment,
      transportQuantity: Number(form.transportQuantity),
      weightKg,
      volumeM3: form.volumeM3 ? Number(form.volumeM3) : undefined,
      chargeableWeightKg:
        form.mode === 'air' ? Number(form.chargeableWeightKg) || suggestedCwt || undefined : undefined,
      natureOfGoods: form.natureOfGoods.trim(),
      cargo: form.cargo,
      // Для поиска и списка: все перевозчики из строк расчёта
      carrier: [
        ...new Set(form.charges.map((c) => vendors.find((v) => v.id === c.vendorId)?.name).filter(Boolean)),
      ].join(', '),
      currency: form.currency,
      transitTime: form.transitTime ? `${form.transitTime} days` : '',
      paymentTerms: form.paymentTerms.trim(),
      validTo: form.validTo || undefined,
      // Пустые строки калькуляции не сохраняем
      charges: form.charges.filter(isFilled),
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
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Customer">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Customer" htmlFor="customer" required error={errors.customer} className="sm:col-span-2">
              <CustomerPicker
                id="customer"
                value={form.customer}
                invalid={!!errors.customer}
                onChange={(name, customer) => pickCustomer(name, customer)}
              />
            </FormField>
            <FormField
              label="Contact person"
              htmlFor="contactPerson"
              required
              error={errors.contactPerson}
              hint="Who at the customer asked for the price. Filled in from the customer card."
            >
              <Input {...bind('contactPerson')} placeholder={t('Name and phone')} />
            </FormField>
            {existing ? (
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
            ) : (
              <FormField label="Valid to" htmlFor="validTo" hint="Until when the price holds. Printed on the PDF.">
                <Input {...bind('validTo')} type="date" />
              </FormField>
            )}
            <FormField label="Customer address" htmlFor="customerAddress" className="sm:col-span-2">
              <Input {...bind('customerAddress')} placeholder={t('Filled in from the customer card')} />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Route">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Pick up location" htmlFor="collectionAddress" required error={errors.collectionAddress}>
              <CityPicker
                id="collectionAddress"
                value={form.collectionAddress}
                invalid={!!errors.collectionAddress}
                onChange={(city) => set('collectionAddress', city)}
              />
            </FormField>
            <FormField label="Delivery location" htmlFor="deliveryAddress" required error={errors.deliveryAddress}>
              <CityPicker
                id="deliveryAddress"
                value={form.deliveryAddress}
                invalid={!!errors.deliveryAddress}
                onChange={(city) => set('deliveryAddress', city)}
              />
            </FormField>
            <FormField
              label="Incoterms"
              htmlFor="incoterm"
              required
              hint="Who pays for what along the way. EXW: the buyer takes the goods at the seller. DAP: the seller delivers to the named place."
            >
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
            <FormField
              label="Movement"
              htmlFor="movement"
              required
              hint="Where you take the cargo from and where you hand it over: from the door (address) or from the port."
            >
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
            {showPorts && (
              <>
                <FormField label={terminals.from} htmlFor="portOfDeparture">
                  <Combobox
                    id="portOfDeparture"
                    value={form.portOfDeparture}
                    options={terminalOptions}
                    allowCustom
                    placeholder="Select or type"
                    onChange={(value) => set('portOfDeparture', value)}
                  />
                </FormField>
                <FormField label={terminals.to} htmlFor="portOfDelivery">
                  <Combobox
                    id="portOfDelivery"
                    value={form.portOfDelivery}
                    options={terminalOptions}
                    allowCustom
                    placeholder="Select or type"
                    onChange={(value) => set('portOfDelivery', value)}
                  />
                </FormField>
              </>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Transport and cargo">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Mode" htmlFor="mode" required>
            <NativeSelect id="mode" value={form.mode} onChange={(e) => pickMode(e.target.value as TransportMode)}>
              {TRANSPORT_MODES.map((value) => (
                <option key={value} value={value}>
                  {t(transportModeLabels[value])}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          {/* В авиа выбирать нечего (всегда Air), поэтому поле прячем */}
          {form.mode !== 'air' && (
            <FormField label="Equipment" htmlFor="equipment" required hint={equipmentHints[form.mode]}>
              <NativeSelect
                id="equipment"
                value={form.equipment}
                onChange={(e) => set('equipment', e.target.value as EquipmentType)}
              >
                {equipmentOptions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </NativeSelect>
            </FormField>
          )}
          <FormField
            label="Quantity"
            htmlFor="transportQuantity"
            required
            error={errors.transportQuantity}
            hint="How many containers, trucks or wagons. For air and part loads put 1."
          >
            <Input {...bind('transportQuantity')} type="number" min={1} />
          </FormField>
          <FormField label="Weight" htmlFor="weight" required error={errors.weight}>
            <div className="flex gap-2">
              <Input {...bind('weight')} type="number" min={0} step="any" placeholder="0" />
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
          <FormField label="Volume, m³" htmlFor="volumeM3" error={errors.volumeM3}>
            <Input {...bind('volumeM3')} type="number" min={0} step="any" placeholder="0" />
          </FormField>
          {/* Оплачиваемый вес считают только в авиа */}
          {form.mode === 'air' && (
            <FormField
              label="Chargeable weight, kg"
              htmlFor="chargeableWeightKg"
              error={errors.chargeableWeightKg}
              hint="Airlines charge for the bigger of the real weight and the volume weight (1 m³ = 167 kg). Leave empty and we use the suggested value."
            >
              <Input
                {...bind('chargeableWeightKg')}
                type="number"
                min={0}
                step="any"
                placeholder={suggestedCwt ? String(suggestedCwt) : '0'}
              />
            </FormField>
          )}
          <FormField
            label="Nature of goods"
            htmlFor="natureOfGoods"
            required
            error={errors.natureOfGoods}
            className="sm:col-span-2 lg:col-span-3"
          >
            <Input {...bind('natureOfGoods')} placeholder={t('e.g. Cotton yarn')} />
          </FormField>
        </div>
      </SectionCard>

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
          <div className="-mx-1 space-y-2 overflow-x-auto px-1 py-1">
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
        <div className="-mx-1 space-y-2 overflow-x-auto px-1 py-1">
          <div className="grid min-w-[980px] grid-cols-[1.2fr_1.4fr_80px_120px_120px_minmax(240px,1fr)_36px] gap-2 text-xs text-muted-foreground">
            <HeaderHint label="Carrier" hint="Who does this part of the job: carrier, agent or customs broker." />
            <HeaderHint
              label="Service"
              hint="What you charge for: freight, pick-up, customs, insurance. One line per service."
            />
            <HeaderHint label="Qty" hint="How many times the rate applies, e.g. 2 containers × the rate." />
            <HeaderHint
              label={t('Rate income, {currency}', { currency: form.currency })}
              hint="Price for the customer for one unit."
              required
            />
            <HeaderHint
              label={t('Rate cost, {currency}', { currency: form.currency })}
              hint="What the carrier charges you for one unit."
              required
            />
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
                  aria-label={t('Service')}
                  placeholder={t('e.g. Ocean freight 40 HQ')}
                  value={charge.chargeType}
                  onChange={(e) => updateCharge(charge.id, { chargeType: e.target.value })}
                />
                <Input
                  type="number"
                  aria-label={t('Qty')}
                  value={charge.quantity}
                  min={0}
                  onChange={(e) => updateCharge(charge.id, { quantity: amount(e.target.value) })}
                />
                <Input
                  type="number"
                  step="any"
                  aria-label={t('Rate income')}
                  aria-invalid={!!errors.charges && isFilled(charge) && !(charge.rateIncome > 0)}
                  placeholder="0"
                  value={charge.rateIncome || ''}
                  min={0}
                  onChange={(e) => updateCharge(charge.id, { rateIncome: amount(e.target.value) })}
                />
                <Input
                  type="number"
                  step="any"
                  aria-label={t('Rate cost')}
                  aria-invalid={!!errors.charges && isFilled(charge) && !(charge.rateCost > 0)}
                  placeholder="0"
                  value={charge.rateCost || ''}
                  min={0}
                  onChange={(e) => updateCharge(charge.id, { rateCost: amount(e.target.value) })}
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

        {errors.charges && <p className="mt-2 text-sm text-destructive">{errors.charges}</p>}

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
          <FormField
            label="Transit time, days"
            htmlFor="transitTime"
            hint="Only the number of days, or a range like 15-20."
          >
            <Input
              {...bind('transitTime')}
              inputMode="numeric"
              maxLength={7}
              placeholder="15"
              onChange={(e) => set('transitTime', e.target.value.replace(/[^\d-]/g, '').replace(/-+/g, '-'))}
            />
          </FormField>
          <FormField
            label="Payment terms"
            htmlFor="paymentTerms"
            hint="How the customer pays, e.g. 30% before loading and 70% on delivery."
          >
            <Input {...bind('paymentTerms')} placeholder="30% / 70%" />
          </FormField>
          {existing && (
            <FormField label="Valid to" htmlFor="validTo">
              <Input {...bind('validTo')} type="date" />
            </FormField>
          )}
          <FormField
            label="Terms & conditions"
            htmlFor="termsAndConditions"
            className="self-start sm:col-span-2"
            hint="Printed on the quotation for the customer."
          >
            <Textarea
              {...bind('termsAndConditions')}
              rows={3}
              placeholder={t('e.g. Price excludes customs duties and storage.')}
            />
          </FormField>
          <FormField
            label="Notes"
            htmlFor="notes"
            className="self-start sm:col-span-2"
            hint="For your team only. The customer does not see notes."
          >
            <Textarea {...bind('notes')} rows={3} placeholder={t('Internal notes')} />
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
      <ConfirmDelete
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title={t('Leave without saving?')}
        description="Everything you entered in this quotation will be lost."
        confirmLabel="Leave"
        onConfirm={() => blocker.proceed?.()}
      />
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

// Пояснение к виду «тары»: что значат FCL, 40 HQ и т.п.
const equipmentHints: Record<TransportMode, string> = {
  sea: 'FCL: a whole container for this cargo. LCL: part of a shared container. 20 GP / 40 DV: 20 or 40-foot standard container, 40 HQ: high cube, 40 OT: open top, 40 RF: refrigerated.',
  road: 'FTL: a whole truck. LTL: part of a truck shared with other cargo. Lowbed and flatbed: open platforms for heavy or oversized cargo. 20 GP / 40 HQ: a container on a truck.',
  rail: 'FCL: a whole container. 20 GP / 40 DV / 40 HQ: container size in feet. 40 OT: open top, 40 RF: refrigerated.',
  air: '',
}

// Заголовок колонки таблицы со значком «?»
function HeaderHint({ label, hint, required }: { label: string; hint: string; required?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      {t(label)}
      {required && <span className="text-destructive">*</span>}
      <FieldHint text={hint} />
    </span>
  )
}
