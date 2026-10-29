import type { ReactNode } from 'react'

import { useSettings } from '@/data/settings'
import { t } from '@/i18n'
import { chargeTotals, quotationTotals } from '@/lib/calculation'
import { formatDate, formatMoney, formatTransit, formatWeight } from '@/lib/format'
import { terminalLabels } from '@/lib/terminals'
import { movementLabels, transportModeLabels } from '@/types/logistics'
import type { Quotation } from '@/types/quotation'

// Котировка в виде документа для клиента (по образцу Kras Logistics).
// Себестоимость и прибыль сюда не попадают — клиент видит только свою цену.
export function QuotationPreview({ quotation: q }: { quotation: Quotation }) {
  const company = useSettings()
  const { income } = quotationTotals(q)
  const money = (value: number) => formatMoney(value, q.currency)

  return (
    <div className="print-area mx-auto max-w-3xl rounded-xl border bg-card p-8 text-sm shadow-xs print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="text-2xl font-semibold tracking-tight">{t('QUOTATION')}</div>
          <div className="mt-1 font-medium">{q.reference}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{company.companyName}</div>
          <div className="text-muted-foreground">{company.companyAddress}</div>
          <div className="text-muted-foreground">{company.companyPhone}</div>
          <div className="text-muted-foreground">{company.companyEmail}</div>
          {company.companyWebsite && <div className="text-muted-foreground">{company.companyWebsite}</div>}
          {company.companyTaxId && (
            <div className="text-muted-foreground">{t('Tax ID: {id}', { id: company.companyTaxId })}</div>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">{t('Customer')}</div>
          <div className="mt-1 font-semibold">{q.customer}</div>
          {q.customerAddress && <div className="text-muted-foreground">{q.customerAddress}</div>}
          {q.contactPerson && <div className="mt-1">{q.contactPerson}</div>}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
          <Term label="Date">{formatDate(q.createdAt)}</Term>
          {q.validTo && <Term label="Valid to">{formatDate(q.validTo)}</Term>}
          <Term label="Mode">{t(transportModeLabels[q.mode])}</Term>
          {q.transitTime && <Term label="Transit time">{formatTransit(q.transitTime)}</Term>}
        </dl>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-4 print:grid-cols-4">
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

      <table className="mt-8 w-full">
        <thead>
          <tr className="border-y bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">{t('Item')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('Qty')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('Rate')}</th>
            <th className="px-3 py-2 text-right font-medium">{t('Amount')}</th>
          </tr>
        </thead>
        <tbody>
          {q.charges.map((charge, index) => (
            <tr key={charge.id} className="border-b">
              <td className="px-3 py-2.5 text-muted-foreground">{index + 1}</td>
              <td className="px-3 py-2.5">
                <div>{charge.chargeType || charge.orderType}</div>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{charge.quantity}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{money(charge.rateIncome)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{money(chargeTotals(charge).income)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto flex w-64 justify-between rounded-md bg-muted px-3 py-2 font-semibold">
        <span>{t('Total')}</span>
        <span className="tabular-nums">{money(income)}</span>
      </div>

      {(q.paymentTerms || q.termsAndConditions || q.notes) && (
        <div className="mt-8 space-y-3">
          {q.paymentTerms && <Note label="Payment terms">{q.paymentTerms}</Note>}
          {q.termsAndConditions && <Note label="Terms & conditions">{q.termsAndConditions}</Note>}
          {q.notes && <Note label="Notes">{q.notes}</Note>}
        </div>
      )}
    </div>
  )
}

function Term({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{t(label)}</dt>
      <dd className="text-right">{children}</dd>
    </>
  )
}

function Fact({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{t(label)}</div>
      <div className="font-medium">{children || '—'}</div>
    </div>
  )
}

function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{t(label)}</div>
      <div className="whitespace-pre-line">{children}</div>
    </div>
  )
}
