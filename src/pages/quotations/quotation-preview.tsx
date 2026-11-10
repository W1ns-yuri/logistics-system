import type { ReactNode } from 'react'

import { useSettings } from '@/data/settings'
import { t } from '@/i18n'
import { chargeTotals, quotationTotals } from '@/lib/calculation'
import { formatDate, formatMoney, formatTransit, formatWeight } from '@/lib/format'
import { terminalLabels } from '@/lib/terminals'
import { cn } from '@/lib/utils'
import { movementLabels, transportModeLabels } from '@/types/logistics'
import type { Quotation } from '@/types/quotation'

// Котировка в виде документа для клиента. Оформлена так же, как инвойс (invoice-preview.tsx):
// одна шапка, те же шрифты, цвета, таблица и подпись — документы из одной системы выглядят одинаково.
// Себестоимость и прибыль сюда не попадают — клиент видит только свою цену.
export function QuotationPreview({ quotation: q, className }: { quotation: Quotation; className?: string }) {
  const company = useSettings()
  const { income } = quotationTotals(q)
  const number = (value: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const money = (value: number) => formatMoney(value, q.currency)

  return (
    <div
      className={cn(
        'print-area mx-auto max-w-3xl rounded-xl border bg-white p-8 text-[13px] text-neutral-900 shadow-xs sm:p-10',
        'print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none',
        className,
      )}
      data-testid="quotation-document"
    >
      {/* Шапка: как у инвойса — название компании слева, реквизиты справа */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="text-2xl font-bold tracking-tight text-neutral-800">{company.companyName}</div>
        <div className="text-right leading-relaxed">
          <div className="font-semibold">{company.companyName}</div>
          <div className="text-neutral-600">{company.companyAddress}</div>
          <div className="text-neutral-600">{company.companyPhone}</div>
          <div className="text-neutral-600">{company.companyEmail}</div>
          {company.companyWebsite && <div className="text-neutral-600">{company.companyWebsite}</div>}
          {company.companyTaxId && (
            <div className="text-neutral-600">{t('Tax ID: {id}', { id: company.companyTaxId })}</div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-neutral-300" />
        <span className="text-lg tracking-wide text-neutral-700">{t('QUOTATION')}</span>
        <span className="h-px w-1/4 bg-neutral-300" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-neutral-600">{t('Customer')}</div>
          <div className="mt-1 font-semibold">{q.customer}</div>
          {q.customerAddress && <div className="text-neutral-700">{q.customerAddress}</div>}
          {q.contactPerson && <div className="mt-1 text-neutral-700">{q.contactPerson}</div>}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-1.5">
          <Term label="Quotation#">{q.reference}</Term>
          <Term label="Date">{formatDate(q.createdAt)}</Term>
          {q.validTo && <Term label="Valid to">{formatDate(q.validTo)}</Term>}
          <Term label="Mode">{t(transportModeLabels[q.mode])}</Term>
          {q.transitTime && <Term label="Transit time">{formatTransit(q.transitTime)}</Term>}
        </dl>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 border-y border-neutral-300 bg-neutral-50 px-3 py-3 sm:grid-cols-4 print:grid-cols-4">
        <Fact label="Pick up location">{q.collectionAddress}</Fact>
        <Fact label="Delivery location">{q.deliveryAddress}</Fact>
        <Fact label={terminalLabels(q.mode).from}>{q.portOfDeparture}</Fact>
        <Fact label={terminalLabels(q.mode).to}>{q.portOfDelivery}</Fact>
        <Fact label="Incoterms">{q.incoterm}</Fact>
        <Fact label="Movement">{t(movementLabels[q.movement])}</Fact>
        <Fact label="Equipment">{`${q.transportQuantity} × ${q.equipment}`}</Fact>
        <Fact label="Weight">{formatWeight(q.weightKg)}</Fact>
        {q.volumeM3 ? <Fact label="Volume, m³">{q.volumeM3}</Fact> : null}
        {q.chargeableWeightKg ? <Fact label="Chargeable weight, kg">{q.chargeableWeightKg}</Fact> : null}
        <Fact label="Nature of goods">{q.natureOfGoods}</Fact>
      </div>

      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="border-y border-neutral-300 bg-neutral-100 text-left text-xs">
            <th className="w-8 px-2 py-2 font-semibold">#</th>
            <th className="px-2 py-2 font-semibold">{t('Item')}</th>
            <th className="px-2 py-2 text-right font-semibold">{t('Qty')}</th>
            <th className="px-2 py-2 text-right font-semibold">{t('Rate')}</th>
            <th className="px-2 py-2 text-right font-semibold">{t('Amount')}</th>
          </tr>
        </thead>
        <tbody>
          {q.charges.map((charge, index) => (
            <tr key={charge.id} className="border-b border-neutral-200 align-top">
              <td className="px-2 py-2 text-neutral-600">{index + 1}</td>
              <td className="px-2 py-2">{charge.chargeType || charge.orderType}</td>
              <td className="px-2 py-2 text-right tabular-nums">{number(charge.quantity)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{number(charge.rateIncome)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{number(chargeTotals(charge).income)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 grid grid-cols-2 gap-6">
        <div className="space-y-3 text-neutral-700">
          {q.paymentTerms && <Note label="Payment terms">{q.paymentTerms}</Note>}
          {q.termsAndConditions && <Note label="Terms & conditions">{q.termsAndConditions}</Note>}
          {q.notes && <Note label="Notes">{q.notes}</Note>}
        </div>
        <div className="space-y-2" data-testid="quotation-totals">
          <div className="flex justify-between border-y border-neutral-300 bg-neutral-100 px-3 py-2 font-bold">
            <span>{t('Total')}</span>
            <span className="tabular-nums">{money(income)}</span>
          </div>
        </div>
      </div>

      <p className="mt-8 text-neutral-700">{t('Thanks for your business.')}</p>
      <div className="mt-16 w-56 border-t border-neutral-400 pt-2 text-neutral-700">{t('Authorized signature')}</div>
    </div>
  )
}

function Term({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-semibold">{t(label)}</dt>
      <dd>{children}</dd>
    </>
  )
}

function Fact({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-neutral-600">{t(label)}</div>
      <div className="font-medium">{children || '—'}</div>
    </div>
  )
}

function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-semibold text-neutral-900">{t(label)}</div>
      <div className="whitespace-pre-line">{children}</div>
    </div>
  )
}
