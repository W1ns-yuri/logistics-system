import { useMemo, useState, type FormEvent } from 'react'
import { EyeOff, Pencil, Plus, RotateCcw, Trash2, Eye } from 'lucide-react'

import { Combobox } from '@/components/combobox'
import { FormField } from '@/components/form-field'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BUILT_IN,
  CATALOG_KINDS,
  catalogKindLabels,
  equipmentModes,
  removeCatalogItem,
  saveCatalogItem,
  useCatalog,
  type CatalogItem,
  type CatalogKind,
} from '@/data/catalog'
import { t, translateTo } from '@/i18n'
import { apiErrorText } from '@/lib/api'
import { countryLabel, countryOptions } from '@/lib/countries'
import { cn } from '@/lib/utils'
import { TRANSPORT_MODES, transportModeLabels, type TransportMode } from '@/types/logistics'

type ListKind = Exclude<CatalogKind, 'city'>

// Подсказка под заголовком вкладки: что это за список и где его видят компании
const kindHints: Record<CatalogKind, string> = {
  city: 'The built-in list has about 8,400 cities in English and Russian. Add a missing city, or fix the Russian name of an existing one by entering its English name exactly.',
  equipment: 'Shown in quotations and shipments. Pick which transport modes each type fits.',
  document: 'Types of files attached to a shipment.',
  vendor_type: 'What kind of company a vendor is.',
  lost_reason: 'Reasons offered when a quotation is lost. People can still write their own.',
  payment_method: 'How a customer paid or how a vendor was paid.',
  incoterm: 'Delivery terms in quotations.',
}

/*
 * Справочники платформы: владелец сам добавляет города, типы транспорта, документы и т. п.
 * Встроенное значение можно переименовать или скрыть (старые записи компаний его сохранят), своё — удалить.
 */
export function CatalogPage() {
  const [tab, setTab] = useState<CatalogKind>('city')
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <PageHeader
        title="Reference data"
        description="Lists that companies pick from. Changes reach every company at once, no programmer needed."
      />
      <Tabs value={tab} onValueChange={(value) => setTab(value as CatalogKind)}>
        <TabsList className="h-auto flex-wrap">
          {CATALOG_KINDS.map((kind) => (
            <TabsTrigger key={kind} value={kind}>
              {t(catalogKindLabels[kind])}
            </TabsTrigger>
          ))}
        </TabsList>
        {CATALOG_KINDS.map((kind) => (
          <TabsContent key={kind} value={kind} className="mt-4">
            <p className="mb-4 max-w-3xl text-sm text-muted-foreground">{t(kindHints[kind])}</p>
            {kind === 'city' ? <CityList /> : <OptionList kind={kind} />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

type Row = { key: string; builtIn: boolean; item?: CatalogItem; en: string; ru: string }

function OptionList({ kind }: { kind: ListKind }) {
  const items = useCatalog()
  const [editing, setEditing] = useState<Row | 'new'>()
  const [error, setError] = useState('')

  const rows = useMemo<Row[]>(() => {
    const own = items.filter((i) => i.kind === kind)
    const builtIn = Object.entries(BUILT_IN[kind]).map(([key, label]) => {
      const item = own.find((i) => i.key === key)
      return { key, builtIn: true, item, en: item?.labelEn ?? label, ru: item ? item.labelRu : translateTo('ru', label) }
    })
    const custom = own
      .filter((i) => !(i.key in BUILT_IN[kind]))
      .map((item) => ({ key: item.key, builtIn: false, item, en: item.labelEn, ru: item.labelRu }))
    return [...builtIn, ...custom]
  }, [items, kind])

  const run = (action: Promise<unknown>) => {
    setError('')
    action.catch((e: unknown) => setError(t(apiErrorText(e))))
  }
  const toggleHidden = (row: Row) =>
    run(
      saveCatalogItem({
        kind,
        key: row.key,
        labelEn: row.en,
        labelRu: row.ru,
        extra: row.item?.extra ?? '',
        hidden: !row.item?.hidden,
      }),
    )

  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="text-sm text-muted-foreground tabular-nums">{t('{n} values', { n: rows.length })}</span>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus />
          {t('Add value')}
        </Button>
      </div>
      {error && (
        <p className="px-4 pt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <ul className="divide-y" data-testid={`catalog-${kind}`}>
        {rows.map((row) => {
          const hidden = !!row.item?.hidden
          return (
            <li key={row.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className={cn('min-w-0 basis-full sm:flex-1 sm:basis-0', hidden && 'opacity-50')}>
                <div className="text-sm font-medium break-words">{row.en}</div>
                {/* Коды вроде FTL на обоих языках одинаковые: второй раз не пишем */}
                {row.ru !== row.en && (
                  <div className="text-sm text-muted-foreground break-words">{row.ru || t('No Russian name')}</div>
                )}
                {kind === 'equipment' && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {equipmentModes(row.key)
                      .map((mode) => t(transportModeLabels[mode]))
                      .join(', ') || t('No transport mode')}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {!row.builtIn && <Badge variant="secondary">{t('Added')}</Badge>}
                {row.builtIn && row.item && !hidden && <Badge variant="secondary">{t('Renamed')}</Badge>}
                {hidden && <Badge variant="outline">{t('Hidden')}</Badge>}
                <Button size="icon-sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(row)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={hidden ? t('Show in lists') : t('Hide from lists')}
                  title={hidden ? t('Show in lists') : t('Hide from lists')}
                  onClick={() => toggleHidden(row)}
                >
                  {hidden ? <Eye /> : <EyeOff />}
                </Button>
                {row.item && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={row.builtIn ? t('Restore original') : t('Delete')}
                    title={row.builtIn ? t('Restore original') : t('Delete')}
                    onClick={() => run(removeCatalogItem(kind, row.key))}
                  >
                    {row.builtIn ? <RotateCcw /> : <Trash2 />}
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <OptionDialog
        kind={kind}
        row={editing === 'new' ? undefined : editing}
        open={!!editing}
        taken={rows.map((r) => r.key.toLowerCase())}
        onOpenChange={(open) => !open && setEditing(undefined)}
      />
    </div>
  )
}

function OptionDialog({
  kind,
  row,
  open,
  taken,
  onOpenChange,
}: {
  kind: ListKind
  row?: Row
  open: boolean
  taken: string[]
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row ? t('Edit {name}', { name: row.en }) : t('Add value')}</DialogTitle>
        </DialogHeader>
        {open && <OptionForm kind={kind} row={row} taken={taken} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function OptionForm({ kind, row, taken, onDone }: { kind: ListKind; row?: Row; taken: string[]; onDone: () => void }) {
  const [en, setEn] = useState(row?.en ?? '')
  const [ru, setRu] = useState(row?.ru ?? '')
  const [modes, setModes] = useState<TransportMode[]>(() => (row ? equipmentModes(row.key) : []))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const name = en.trim()
    if (name.length < 2) return setError(t('At least 2 characters'))
    // Новое значение: ключом становится английское название, поэтому оно не должно повторяться
    if (!row && taken.includes(name.toLowerCase())) return setError(t('This value already exists'))
    if (kind === 'equipment' && !modes.length) return setError(t('Pick at least one transport mode'))
    setSaving(true)
    saveCatalogItem({
      kind,
      key: row?.key ?? name,
      labelEn: name,
      labelRu: ru.trim(),
      extra: kind === 'equipment' ? modes.join(',') : '',
      hidden: row?.item?.hidden ?? false,
    })
      .then(onDone)
      .catch((e: unknown) => setError(t(apiErrorText(e))))
      .finally(() => setSaving(false))
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormField label="Name in English" htmlFor="catalog-en" required>
        <Input id="catalog-en" value={en} maxLength={80} onChange={(e) => setEn(e.target.value)} />
      </FormField>
      <FormField label="Name in Russian" htmlFor="catalog-ru" optional>
        <Input id="catalog-ru" value={ru} maxLength={80} onChange={(e) => setRu(e.target.value)} />
      </FormField>
      {kind === 'equipment' && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('Fits transport modes')}</legend>
          <div className="flex flex-wrap gap-4">
            {TRANSPORT_MODES.map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={modes.includes(mode)}
                  onChange={(e) =>
                    setModes((prev) => (e.target.checked ? [...prev, mode] : prev.filter((m) => m !== mode)))
                  }
                />
                {t(transportModeLabels[mode])}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {row?.builtIn && (
        <p className="text-xs text-muted-foreground">
          {t('Records that already use this value keep it. Only the name changes.')}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button type="submit" disabled={saving}>
          {t('Save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Города, которые добавил или поправил владелец. Встроенный список большой, поэтому здесь только свои
function CityList() {
  const items = useCatalog()
  const cities = items.filter((i) => i.kind === 'city')
  const [editing, setEditing] = useState<CatalogItem | 'new'>()
  const [error, setError] = useState('')

  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="text-sm text-muted-foreground tabular-nums">{t('{n} cities added', { n: cities.length })}</span>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus />
          {t('Add city')}
        </Button>
      </div>
      {error && (
        <p className="px-4 pt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {cities.length ? (
        <ul className="divide-y" data-testid="catalog-city">
          {cities.map((city) => (
            <li key={city.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                <div className="text-sm font-medium break-words">
                  {city.labelEn}
                  {city.labelRu && <span className="font-normal text-muted-foreground"> · {city.labelRu}</span>}
                </div>
                <div className="text-xs text-muted-foreground">{countryLabel(city.extra)}</div>
              </div>
              <div className="flex gap-1.5">
                <Button size="icon-sm" variant="ghost" aria-label={t('Edit')} onClick={() => setEditing(city)}>
                  <Pencil />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t('Delete')}
                  onClick={() => {
                    setError('')
                    removeCatalogItem('city', city.key).catch((e: unknown) => setError(t(apiErrorText(e))))
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t('No cities added yet.')}</p>
      )}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing && editing !== 'new' ? t('Edit {name}', { name: editing.labelEn }) : t('Add city')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <CityForm city={editing === 'new' ? undefined : editing} onDone={() => setEditing(undefined)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CityForm({ city, onDone }: { city?: CatalogItem; onDone: () => void }) {
  const [en, setEn] = useState(city?.labelEn ?? '')
  const [ru, setRu] = useState(city?.labelRu ?? '')
  const [country, setCountry] = useState(city?.extra ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const countries = useMemo(() => countryOptions(), [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const name = en.trim()
    if (name.length < 2) return setError(t('At least 2 characters'))
    if (!country) return setError(t('Pick a country'))
    setSaving(true)
    const save = () =>
      saveCatalogItem({ kind: 'city', key: name, labelEn: name, labelRu: ru.trim(), extra: country, hidden: false })
    // Поменяли английское название — это другой ключ: старую запись убираем
    const action = city && city.key !== name ? removeCatalogItem('city', city.key).then(save) : save()
    action
      .then(onDone)
      .catch((e: unknown) => setError(t(apiErrorText(e))))
      .finally(() => setSaving(false))
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormField
        label="Name in English"
        htmlFor="city-en"
        required
        hint="This name is saved in records and printed on documents."
      >
        <Input id="city-en" value={en} maxLength={80} placeholder="Ashgabat" onChange={(e) => setEn(e.target.value)} />
      </FormField>
      <FormField label="Name in Russian" htmlFor="city-ru" optional>
        <Input id="city-ru" value={ru} maxLength={80} placeholder="Ашхабад" onChange={(e) => setRu(e.target.value)} />
      </FormField>
      <FormField label="Country" htmlFor="city-country" required>
        <Combobox id="city-country" value={country} onChange={setCountry} options={countries} placeholder={t('Country')} />
      </FormField>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button type="submit" disabled={saving}>
          {t('Save')}
        </Button>
      </DialogFooter>
    </form>
  )
}
