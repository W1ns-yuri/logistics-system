import { CompanyMark } from '@/components/company-mark'
import { usePermissions } from '@/data/auth'
import { useSettings } from '@/data/settings'
import { t } from '@/i18n'
import { invoiceTotals } from '@/lib/calculation'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Invoice } from '@/types/invoice'

/*
 * Инвойс для клиента по образцу заказчика (INV-AHL-000020):
 * реквизиты компании справа, «INVOICE» по центру, Bill To и номер/даты, таблица
 * # / Item / Description / Qty / Rate / Amount, внизу Total, Payment Made (−) и Balance Due, подпись.
 * Тот же компонент идёт на печать и в PDF (класс print-area).
 */
export function InvoicePreview({ invoice, className }: { invoice: Invoice; className?: string }) {
  const company = useSettings()
  const { total, balanceDue } = invoiceTotals(invoice)
  const number = (value: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const money = (value: number) => formatMoney(value, invoice.currency)

  return (
    <div
      className={cn(
        'print-area mx-auto max-w-3xl rounded-xl border bg-white p-8 text-[13px] text-neutral-900 shadow-xs sm:p-10',
        'print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none',
        className,
      )}
      data-testid="invoice-document"
    >
      {/* Шапка: логотип (или название) компании слева, реквизиты справа */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <CompanyMark company={company} withLogo={usePermissions().features.logo} />
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
        <span className="text-lg tracking-wide text-neutral-700">{t('INVOICE')}</span>
        <span className="h-px w-1/4 bg-neutral-300" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <div className="text-neutral-600">{t('Bill to')}</div>
          <div className="mt-1 font-semibold">{invoice.billTo}</div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-1.5">
          <Term label="Invoice#">{invoice.number}</Term>
          <Term label="Invoice date">{formatDate(invoice.invoiceDate)}</Term>
          <Term label="Terms">{invoice.terms}</Term>
          <Term label="Due date">{formatDate(invoice.dueDate)}</Term>
          {invoice.poNumber && <Term label="P.O.#">{invoice.poNumber}</Term>}
          {invoice.projectName && <Term label="Project name">{invoice.projectName}</Term>}
        </dl>
      </div>

      <table className="mt-8 w-full border-collapse">
        <thead>
          <tr className="border-y border-neutral-300 bg-neutral-100 text-left text-xs">
            <th className="w-8 px-2 py-2 font-semibold">#</th>
            <th className="px-2 py-2 font-semibold">{t('Item')}</th>
            <th className="px-2 py-2 font-semibold">{t('Description')}</th>
            <th className="px-2 py-2 text-right font-semibold">{t('Qty')}</th>
            <th className="px-2 py-2 text-right font-semibold">{t('Rate')}</th>
            <th className="px-2 py-2 text-right font-semibold">{t('Amount')}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={index} className="border-b border-neutral-200 align-top">
              <td className="px-2 py-2 text-neutral-600">{index + 1}</td>
              <td className="px-2 py-2">
                {index === 0 || line.item !== invoice.lines[index - 1]?.item ? line.item : ''}
              </td>
              <td className="px-2 py-2 whitespace-pre-line">{line.description}</td>
              <td className="px-2 py-2 text-right tabular-nums">{number(line.quantity)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{number(line.rate)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{number(line.quantity * line.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 grid grid-cols-2 gap-6">
        <p className="text-neutral-700">{t('Thanks for your business.')}</p>
        <div className="space-y-2" data-testid="invoice-totals">
          <Total label="Sub total" note="(Tax inclusive)" value={number(total)} />
          <Total label="Total" value={money(total)} strong />
          <Total label="Payment made" value={`(−) ${number(invoice.paid)}`} />
          {invoice.discount > 0 && <Total label="Payment discount" value={`(−) ${number(invoice.discount)}`} />}
          <div className="flex justify-between border-y border-neutral-300 bg-neutral-100 px-3 py-2 font-bold">
            <span>{t('Balance due')}</span>
            <span className="tabular-nums">{money(Math.max(0, balanceDue))}</span>
          </div>
        </div>
      </div>

      <div className="mt-16 w-56 border-t border-neutral-400 pt-2 text-neutral-700">{t('Authorized signature')}</div>
    </div>
  )
}

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-semibold">{t(label)}</dt>
      <dd>{children}</dd>
    </>
  )
}

function Total({ label, note, value, strong }: { label: string; note?: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between px-3', strong && 'font-bold')}>
      <span className={cn('text-right', !strong && 'text-neutral-600')}>
        {t(label)}
        {note && <span className="block text-xs">{t(note)}</span>}
      </span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
