import { ChevronDown } from 'lucide-react'

import { QuotationStatusBadge, quotationStatuses } from '@/components/status-badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { updateQuotation } from '@/data/store'
import { t } from '@/i18n'
import type { Quotation, QuotationStatus } from '@/types/quotation'

// Что значит каждый статус — подпись под пунктом меню
const hints: Partial<Record<QuotationStatus, string>> = {
  in_progress: 'Still working on the price',
  completed: 'Sent to the customer',
  failed: 'The customer did not take our offer',
  cancelled: 'We turned the request down ourselves',
}
// «Перевозка создана» ставится сама, когда из котировки сделали перевозку
const manual: QuotationStatus[] = ['in_progress', 'completed', 'failed', 'cancelled']

// Статус котировки меняется прямо в её карточке: нажал на бейдж — выбрал новый
export function QuotationStatusMenu({ quotation, editable }: { quotation: Quotation; editable: boolean }) {
  // По котировке уже есть перевозка — статус ведёт перевозка, вручную не меняем
  if (!editable || quotation.status === 'shipment_created') return <QuotationStatusBadge status={quotation.status} />
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('Change status')}
        className="inline-flex items-center gap-1 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <QuotationStatusBadge status={quotation.status} />
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t('Change status')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={quotation.status}
          onValueChange={(status) => updateQuotation(quotation.id, { status: status as QuotationStatus })}
        >
          {manual.map((status) => (
            <DropdownMenuRadioItem key={status} value={status} className="items-start">
              <div>
                <div>{t(quotationStatuses[status].label)}</div>
                <div className="text-xs text-muted-foreground">{t(hints[status]!)}</div>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
