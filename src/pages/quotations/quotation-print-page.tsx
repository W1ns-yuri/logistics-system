import { Printer } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { useQuotations } from '@/data/store'
import { t } from '@/i18n'
import { NotFoundPage } from '@/pages/not-found'
import { QuotationPreview } from './quotation-preview'

// Отдельная страница котировки для печати или «Сохранить как PDF», как у инвойса. Открывается в новой вкладке
export function QuotationPrintPage() {
  const { id } = useParams()
  const quotation = useQuotations().find((q) => q.id === id)

  useEffect(() => {
    if (!quotation) return
    // Имя файла PDF по умолчанию — номер котировки
    document.title = quotation.reference
    const timer = setTimeout(() => window.print(), 300)
    return () => clearTimeout(timer)
  }, [quotation])

  if (!quotation) return <NotFoundPage />
  return (
    <div className="min-h-svh bg-muted/40 p-4 sm:p-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <Printer />
          {t('Print / PDF')}
        </Button>
      </div>
      <QuotationPreview quotation={quotation} />
    </div>
  )
}

// Открыть котировку на печать в новой вкладке
export const printQuotation = (id: string) => window.open(`/quotations/${id}/print`, '_blank')
