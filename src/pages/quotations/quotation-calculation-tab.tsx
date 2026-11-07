import { Calculator, Pencil, Plus } from 'lucide-react'
import { Link } from 'react-router'

import { InfoField } from '@/components/info-field'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/section-card'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useVendors } from '@/data/store'
import { chargeTotals, quotationTotals } from '@/lib/calculation'
import { formatMoney, formatPercent, formatTransit } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Quotation } from '@/types/quotation'
import { t } from '@/i18n'

// Вкладка Calculation: итоги (слайд 4) + строки начислений (скриншот Scope)
export function QuotationCalculationTab({ quotation: q, canEdit }: { quotation: Quotation; canEdit?: boolean }) {
  // Цены часто узнают позже: из карточки сразу попадаем в форму на вкладку «Расчёт»
  const editLink = `/quotations/${q.id}/edit?tab=calculation`
  const empty = q.charges.length === 0
  const totals = quotationTotals(q)
  const money = (value: number) => formatMoney(value, q.currency)
  const vendors = useVendors()
  const vendorName = (id?: string) => vendors.find((v) => v.id === id)?.name ?? '—'

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

      <SectionCard
        title="Charges"
        className="[&>div:last-child]:p-0"
        action={
          canEdit &&
          !empty && (
            <Button asChild size="sm" variant="outline">
              <Link to={editLink}>
                <Pencil />
                {t('Edit calculation')}
              </Link>
            </Button>
          )
        }
      >
        {empty ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" data-testid="calc-empty">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Calculator className="size-5" />
            </span>
            <div>
              <div className="font-medium">{t('No calculation yet')}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('Add rates when you know the prices from carriers.')}
              </p>
            </div>
            {canEdit && (
              <Button asChild>
                <Link to={editLink}>
                  <Plus />
                  {t('Add calculation')}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">{t('Carrier')}</TableHead>
                <TableHead>{t('Charge type')}</TableHead>
                <TableHead className="text-right">{t('Rate (income)')}</TableHead>
                <TableHead className="text-right">{t('Income')}</TableHead>
                <TableHead className="text-right">{t('Rate (cost)')}</TableHead>
                <TableHead className="text-right">{t('Cost')}</TableHead>
                <TableHead className="text-right">{t('Profit')}</TableHead>
                <TableHead className="pr-5 text-right">{t('Margin')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.charges.map((charge) => {
                const line = chargeTotals(charge)
                return (
                  <TableRow key={charge.id}>
                    <TableCell className="pl-5">{vendorName(charge.vendorId)}</TableCell>
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
                  {t('Total')}
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(totals.income)}</TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">{money(totals.cost)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(totals.profit)}</TableCell>
                <TableCell className="pr-5 text-right tabular-nums">{formatPercent(totals.margin)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </SectionCard>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <SectionCard title="Terms">
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Currency">{q.currency}</InfoField>
            <InfoField label="Transit time">{formatTransit(q.transitTime)}</InfoField>
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
      <div className="text-xs text-muted-foreground">{t(label)}</div>
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
