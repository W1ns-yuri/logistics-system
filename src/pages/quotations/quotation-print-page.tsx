import { Printer } from 'lucide-react'
import { useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { useQuotations } from '@/data/store'
import { PrintLanguageSwitch } from '@/components/print-menu'
import { currentLanguage, isLanguage, setDocumentLanguage, t, type Language } from '@/i18n'
import { NotFoundPage } from '@/pages/not-found'
import { QuotationPreview } from './quotation-preview'

// Отдельная страница котировки для печати или «Сохранить как PDF», как у инвойса. Открывается в новой вкладке
export function QuotationPrintPage() {
  const { id } = useParams()
  const quotation = useQuotations().find((q) => q.id === id)

  // Язык документа из адреса (?lang=ru). Ставим до отрисовки: все подписи, даты и страны ниже — на нём
  const [params, setParams] = useSearchParams()
  const wanted = params.get('lang')
  const language: Language = isLanguage(wanted) ? wanted : currentLanguage()
  setDocumentLanguage(language)
  // Ушли со страницы печати — дальше снова язык интерфейса
  useEffect(() => () => setDocumentLanguage(null), [])

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
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-end gap-2 print:hidden">
        <PrintLanguageSwitch value={language} onChange={(next) => setParams({ lang: next }, { replace: true })} />
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
export const printQuotation = (id: string, language: Language = currentLanguage()) => window.open(`/quotations/${id}/print?lang=${language}`, '_blank')
