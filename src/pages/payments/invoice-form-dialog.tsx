import { Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { updateInvoice } from '@/data/store'
import { t } from '@/i18n'
import { formatMoney } from '@/lib/format'
import type { Invoice } from '@/types/invoice'
import { CURRENCIES, type Currency } from '@/types/logistics'

type LineForm = { item: string; description: string; quantity: string; rate: string }

// Редактирование инвойса: шапка (P.O., Project Name, сроки) и строки с описанием
export function InvoiceFormDialog({
  invoice,
  onOpenChange,
}: {
  invoice?: Invoice
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('Edit invoice {ref}', { ref: invoice?.number ?? '' })}</DialogTitle>
        </DialogHeader>
        {invoice && <InvoiceForm invoice={invoice} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function InvoiceForm({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const [head, setHead] = useState({
    billTo: invoice.billTo,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    terms: invoice.terms,
    poNumber: invoice.poNumber ?? '',
    projectName: invoice.projectName,
    currency: invoice.currency,
  })
  const [lines, setLines] = useState<LineForm[]>(() =>
    invoice.lines.map((l) => ({
      item: l.item,
      description: l.description ?? '',
      quantity: String(l.quantity),
      rate: String(l.rate),
    })),
  )
  const [error, setError] = useState<string>()

  const bind = (key: keyof typeof head) => ({
    id: `invoice-${key}`,
    value: head[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setHead((prev) => ({ ...prev, [key]: e.target.value })),
  })
  const setLine = (index: number, key: keyof LineForm, value: string) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [key]: value } : l)))

  const total = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.rate) || 0), 0)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const clean = lines.filter((l) => l.item.trim())
    if (!head.billTo.trim() || !clean.length) return setError(t('Bill to and at least one line are required'))
    updateInvoice(invoice.id, {
      ...head,
      billTo: head.billTo.trim(),
      poNumber: head.poNumber.trim() || undefined,
      projectName: head.projectName.trim(),
      currency: head.currency as Currency,
      lines: clean.map((l) => ({
        item: l.item.trim(),
        description: l.description.trim() || undefined,
        quantity: Number(l.quantity) || 0,
        rate: Number(l.rate) || 0,
      })),
    })
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Bill to" htmlFor="invoice-billTo" required className="sm:col-span-2">
          <Input {...bind('billTo')} />
        </FormField>
        <FormField label="Currency" htmlFor="invoice-currency" required>
          <NativeSelect {...bind('currency')}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="P.O.#" htmlFor="invoice-poNumber">
          <Input {...bind('poNumber')} />
        </FormField>
        <FormField label="Project name" htmlFor="invoice-projectName" className="sm:col-span-2">
          <Input {...bind('projectName')} placeholder="2026.05.18-AHL-62" />
        </FormField>
        <FormField label="Invoice date" htmlFor="invoice-invoiceDate" required>
          <Input {...bind('invoiceDate')} type="date" />
        </FormField>
        <FormField label="Due date" htmlFor="invoice-dueDate" required>
          <Input {...bind('dueDate')} type="date" />
        </FormField>
        <FormField label="Terms" htmlFor="invoice-terms">
          <Input {...bind('terms')} />
        </FormField>
      </div>

      <div className="space-y-2">
        <div className="hidden grid-cols-[1fr_1.3fr_5rem_7rem_2rem] gap-2 px-0.5 text-xs text-muted-foreground sm:grid">
          <span>{t('Item')}</span>
          <span>{t('Description')}</span>
          <span className="text-right">{t('Qty')}</span>
          <span className="text-right">{t('Rate')}</span>
          <span />
        </div>
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1.3fr_5rem_7rem_2rem]">
            <Input
              aria-label={t('Item')}
              value={line.item}
              placeholder="Freight Forwarding Services"
              onChange={(e) => setLine(i, 'item', e.target.value)}
            />
            <Input
              aria-label={t('Description')}
              value={line.description}
              placeholder="FCA Kocaeli – DAP Ashgabat via Iran"
              onChange={(e) => setLine(i, 'description', e.target.value)}
            />
            <Input
              aria-label={t('Qty')}
              type="number"
              className="text-right"
              value={line.quantity}
              onChange={(e) => setLine(i, 'quantity', e.target.value)}
            />
            <Input
              aria-label={t('Rate')}
              type="number"
              className="text-right"
              value={line.rate}
              onChange={(e) => setLine(i, 'rate', e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="self-center text-muted-foreground hover:text-destructive"
              aria-label={t('Remove line')}
              onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, { item: '', description: '', quantity: '1', rate: '0' }])}
          >
            <Plus />
            {t('Add line')}
          </Button>
          <span className="text-sm">
            {t('Total')}: <span className="font-semibold tabular-nums">{formatMoney(total, head.currency)}</span>
          </span>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {t('Cancel')}
        </Button>
        <Button type="submit">{t('Save changes')}</Button>
      </DialogFooter>
    </form>
  )
}
