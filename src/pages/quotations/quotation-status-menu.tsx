import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

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
import { lostReasonText, type Quotation, type QuotationStatus } from '@/types/quotation'
import { LostReasonDialog } from './lost-reason-dialog'

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
  const [askReason, setAskReason] = useState(false)
  // Причина проигрыша рядом со статусом
  const reason = quotation.status === 'failed' && quotation.lostReason && (
    <span className="text-sm text-muted-foreground" data-testid="lost-reason">
      {t('Reason: {reason}', { reason: t(lostReasonText(quotation.lostReason)) })}
    </span>
  )
  // По котировке уже есть перевозка — статус ведёт перевозка, вручную не меняем
  if (!editable || quotation.status === 'shipment_created')
    return (
      <>
        <QuotationStatusBadge status={quotation.status} />
        {reason}
      </>
    )
  return (
    <>
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
            onValueChange={(status) =>
              // «Провалена» — сначала спрашиваем почему, статус ставит окно
              status === 'failed'
                ? setAskReason(true)
                : updateQuotation(quotation.id, { status: status as QuotationStatus, lostReason: undefined })
            }
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
      {reason}
      <LostReasonDialog quotation={quotation} open={askReason} onOpenChange={setAskReason} />
    </>
  )
}
