import { Warehouse } from 'lucide-react'

import { ComingSoon } from '@/components/coming-soon'
import { DocumentToolbar } from '@/components/document-toolbar'
import { PageHeader } from '@/components/page-header'

export function VendorsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Vendors"
        description="Carriers, airlines, shipping lines and agents you buy services from."
        actions={<DocumentToolbar hasSelection={false} />}
      />
      <ComingSoon
        icon={Warehouse}
        title="Vendors are on the way"
        description="Vendor directory: airlines, shipping lines, trucking and rail operators."
      />
    </div>
  )
}
