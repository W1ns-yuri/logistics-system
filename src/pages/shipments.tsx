import { Truck } from 'lucide-react'

import { ComingSoon } from '@/components/coming-soon'
import { DocumentToolbar } from '@/components/document-toolbar'
import { PageHeader } from '@/components/page-header'

export function ShipmentsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Shipments"
        description="Active and completed shipments with ETD, ETA and status tracking."
        actions={<DocumentToolbar />}
      />
      <ComingSoon icon={Truck} title="Shipments are on the way" description="Shipments will be created from quotations and tracked from loading to delivery." />
    </div>
  )
}
