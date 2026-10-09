import { InfoField } from '@/components/info-field'
import { formatMoney, formatPercent, formatWeight } from '@/lib/format'
import { quotationTotals } from '@/lib/calculation'
import { movementLabels } from '@/types/logistics'
import type { Quotation } from '@/types/quotation'

// Панель под таблицей, как в Scope: быстрый просмотр выбранной котировки без открытия карточки
export function QuotationPreview({ quotation: q }: { quotation: Quotation }) {
  const totals = quotationTotals(q)

  return (
    <div className="grid gap-x-8 gap-y-3 rounded-xl border bg-card p-5 text-sm shadow-xs sm:grid-cols-2 lg:grid-cols-4">
      <InfoField label="Customer">
        <div className="font-medium">{q.customer}</div>
        <div className="text-muted-foreground">{q.customerAddress}</div>
      </InfoField>
      <div className="space-y-3">
        <InfoField label="Route">
          {q.portOfDeparture} → {q.portOfDelivery}
        </InfoField>
        <InfoField label="Incoterms / Movement">
          {q.incoterm} · {movementLabels[q.movement]}
        </InfoField>
      </div>
      <div className="space-y-3">
        <InfoField label="Cargo">
          {q.natureOfGoods}, {formatWeight(q.weightKg)}, {q.volumeM3} m³
        </InfoField>
        <InfoField label="Carrier">{q.carrier}</InfoField>
      </div>
      <div className="space-y-3">
        <InfoField label="Income / Profit">
          <span className="tabular-nums">
            {formatMoney(totals.income, q.currency)} / {formatMoney(totals.profit, q.currency)}
          </span>
        </InfoField>
        <InfoField label="Margin">
          <span className="font-medium tabular-nums">{formatPercent(totals.margin)}</span>
        </InfoField>
      </div>
    </div>
  )
}
