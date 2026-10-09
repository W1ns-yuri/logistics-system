import { Users } from 'lucide-react'

import { ComingSoon } from '@/components/coming-soon'
import { DocumentToolbar } from '@/components/document-toolbar'
import { PageHeader } from '@/components/page-header'

export function CustomersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Customers"
        description="Companies you quote and ship for, with their contacts."
        actions={<DocumentToolbar hasSelection={false} />}
      />
      <ComingSoon
        icon={Users}
        title="Customers are on the way"
        description="Customer directory with contacts and quotation conversion rate."
      />
    </div>
  )
}
