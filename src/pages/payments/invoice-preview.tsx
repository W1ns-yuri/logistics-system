import { Link } from 'react-router'

import { InvoiceStatusBadge } from '@/components/status-badge'
import { useSettings } from '@/data/settings'
import { invoiceTotals } from '@/lib/calculation'
import { formatDate, formatMoney } from '@/lib/format'
import type { Invoice } from '@/types/invoice'

// Просмотр инвойса в том же виде, что и PDF-пример INV-AHL-000140
export function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const company = useSettings()
  const { total, balanceDue } = invoiceTotals(invoice)
  const money = (value: number) => formatMoney(value, invoice.currency)

  return (
    <div className="mx-auto max-w-3xl rounded-xl border bg-card p-8 text-sm shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="text-2xl font-semibold tracking-tight">INVOICE</div>
          <div className="mt-2">
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{company.companyName}</div>
          <div className="text-muted-foreground">{company.companyAddress}</div>
          <div className="text-muted-foreground">{company.companyPhone}</div>
          <div className="text-muted-foreground">{company.companyEmail}</div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Bill to</div>
          <div className="mt-1 font-semibold">{invoice.billTo}</div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
          <dt className="text-muted-foreground">Invoice #</dt>
          <dd className="text-right font-medium">{invoice.number}</dd>
          <dt className="text-muted-foreground">Invoice date</dt>
          <dd className="text-right">{formatDate(invoice.invoiceDate)}</dd>
          <dt className="text-muted-foreground">Terms</dt>
          <dd className="text-right">{invoice.terms}</dd>
          <dt className="text-muted-foreground">Due date</dt>
          <dd className="text-right">{formatDate(invoice.dueDate)}</dd>
          <dt className="text-muted-foreground">Project</dt>
          <dd className="text-right">
            {invoice.shipmentId ? (
              <Link to={`/shipments/${invoice.shipmentId}`} className="text-primary hover:underline">
                {invoice.projectName}
              </Link>
            ) : (
              invoice.projectName
            )}
          </dd>
        </dl>
      </div>

      <table className="mt-8 w-full">
        <thead>
          <tr className="border-y bg-muted/50 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 text-right font-medium">Qty</th>
            <th className="px-3 py-2 text-right font-medium">Rate</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines.map((line, index) => (
            <tr key={index} className="border-b">
              <td className="px-3 py-2.5 text-muted-foreground">{index + 1}</td>
              <td className="px-3 py-2.5">
                <div>{line.item}</div>
                {line.description && <div className="text-xs text-muted-foreground">{line.description}</div>}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{line.quantity.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{money(line.rate)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{money(line.quantity * line.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-64 space-y-1.5">
        <Row label="Sub total" value={money(total)} />
        <Row label="Total" value={money(total)} strong />
        <Row label="Paid" value={`− ${money(invoice.paid)}`} />
        <div className="flex justify-between rounded-md bg-muted px-3 py-2 font-semibold">
          <span>Balance due</span>
          <span className="tabular-nums">{money(balanceDue)}</span>
        </div>
      </div>

      <p className="mt-8 text-muted-foreground">Thanks for your business.</p>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between px-3 ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
