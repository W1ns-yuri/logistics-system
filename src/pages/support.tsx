import { LifeBuoy } from 'lucide-react'

import { ComingSoon } from '@/components/coming-soon'
import { PageHeader } from '@/components/page-header'

export function SupportPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Support"
        description="Help requests and feedback."
      />
      <ComingSoon icon={LifeBuoy} title="Support is on the way" description="Support tickets will live here." />
    </div>
  )
}
