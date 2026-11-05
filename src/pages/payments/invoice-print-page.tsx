import { Printer } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { useInvoices } from '@/data/store'
import { t } from '@/i18n'
import { NotFoundPage } from '@/pages/not-found'
import { InvoicePreview } from './invoice-preview'

// Отдельная страница инвойса для печати или «Сохранить как PDF». Открывается в новой вкладке
export function InvoicePrintPage() {
  const { id } = useParams()
  const invoice = useInvoices().find((inv) => inv.id === id)

  useEffect(() => {
    if (!invoice) return
    document.title = invoice.number
    const timer = setTimeout(() => window.print(), 300)
    return () => clearTimeout(timer)
  }, [invoice])

  if (!invoice) return <NotFoundPage />
  return (
    <div className="min-h-svh bg-muted/40 p-4 sm:p-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <Printer />
          {t('Print / PDF')}
        </Button>
      </div>
      <InvoicePreview invoice={invoice} />
    </div>
  )
}

// Открыть инвойс на печать в новой вкладке
export const printInvoice = (id: string) => window.open(`/invoices/${id}/print`, '_blank')
