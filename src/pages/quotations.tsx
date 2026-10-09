import { FileText } from 'lucide-react'

import { ComingSoon } from '@/components/coming-soon'
import { DocumentToolbar } from '@/components/document-toolbar'
import { PageHeader } from '@/components/page-header'

export function QuotationsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Quotations"
        description="Price offers for customers: route, cargo, calculation and margin."
        actions={<DocumentToolbar withCreateShipment />}
      />
      <ComingSoon icon={FileText} title="Quotations are on the way" description="Next step: a table with filters, sorting and pagination, plus the quotation card with General and Calculation tabs." />
    </div>
  )
}
