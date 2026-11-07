import { ArrowLeft, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { Button } from '@/components/ui/button'
import { useInvoices, useShipments } from '@/data/store'
import { t } from '@/i18n'
import { NotFoundPage } from '@/pages/not-found'
import { InvoicePanel } from './invoice-panel'

// Один инвойс на отдельной странице: документ, оплаты, кнопки. Открывается кликом по строке в «Оплатах»
export function InvoicePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const invoice = useInvoices().find((inv) => inv.id === id)
  const shipment = useShipments().find((s) => s.id === invoice?.shipmentId)

  if (!invoice) return <NotFoundPage />
  return (
    <div className="mx-auto max-w-[1200px] space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/payments">
            <ArrowLeft />
            {t('All invoices')}
          </Link>
        </Button>
        {shipment && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/shipments/${shipment.id}`}>
              <Truck />
              {t('Open shipment {number}', { number: shipment.number })}
            </Link>
          </Button>
        )}
      </div>
      <InvoicePanel invoice={invoice} defaultTab="details" onDeleted={() => navigate('/payments')} />
    </div>
  )
}
