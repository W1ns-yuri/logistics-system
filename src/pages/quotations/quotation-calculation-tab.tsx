import { InfoField } from '@/components/info-field'
import { SectionCard } from '@/components/section-card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { chargeTotals, quotationTotals } from '@/lib/calculation'
import { formatMoney, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Quotation } from '@/types/quotation'

// Вкладка Calculation: итоги (слайд 4) + строки начислений (скриншот Scope)
export function QuotationCalculationTab({ quotation: q }: { quotation: Quotation }) {
  const totals = quotationTotals(q)
  const money = (value: number) => formatMoney(value, q.currency)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Rate income" value={money(totals.income)} />
        <KpiTile label="Rate cost" value={money(totals.cost)} />
        <KpiTile label="Profit" value={money(totals.profit)} tone={totals.profit >= 0 ? 'positive' : 'negative'} />
        <KpiTile
          label="Margin"
          value={formatPercent(totals.margin)}
          tone={totals.margin >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <SectionCard title="Charges" className="[&>div:last-child]:p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Order type</TableHead>
              <TableHead>Charge type</TableHead>
              <TableHead className="text-right">Rate (income)</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Rate (cost)</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="pr-5 text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.charges.map((charge) => {
              const line = chargeTotals(charge)
              return (
                <TableRow key={charge.id}>
                  <TableCell className="pl-5">{charge.orderType}</TableCell>
                  <TableCell>{charge.chargeType}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {money(charge.rateIncome)} × {charge.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(line.income)}</TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {money(charge.rateCost)} × {charge.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(line.cost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(line.profit)}</TableCell>
                  <TableCell className="pr-5 text-right tabular-nums">{formatPercent(line.margin)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell className="pl-5" colSpan={3}>
                Total
              </TableCell>
              <TableCell className="text-right tabular-nums">{money(totals.income)}</TableCell>
              <TableCell />
              <TableCell className="text-right tabular-nums">{money(totals.cost)}</TableCell>
              <TableCell className="text-right tabular-nums">{money(totals.profit)}</TableCell>
              <TableCell className="pr-5 text-right tabular-nums">{formatPercent(totals.margin)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Terms">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Carrier">{q.carrier}</InfoField>
            <InfoField label="Currency">{q.currency}</InfoField>
            <InfoField label="Transit time">{q.transitTime}</InfoField>
            <InfoField label="Payment terms">{q.paymentTerms}</InfoField>
          </div>
        </SectionCard>
        <SectionCard title="Terms & conditions / Notes">
          <div className="space-y-4">
            <InfoField label="Terms & conditions">{q.termsAndConditions}</InfoField>
            <InfoField label="Notes">{q.notes}</InfoField>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function KpiTile({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums',
          tone === 'positive' && 'text-success',
          tone === 'negative' && 'text-destructive',
        )}
      >
        {value}
      </div>
    </div>
  )
}
