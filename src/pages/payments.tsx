import { CreditCard } from 'lucide-react'

import { ComingSoon } from '@/components/coming-soon'
import { PageHeader } from '@/components/page-header'

export function PaymentsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        title="Payments"
        description="Customer invoices, vendor bills and payment status."
      />
      <ComingSoon icon={CreditCard} title="Payments module is on the way" description="Invoices generated from shipments, payments and balance due." />
    </div>
  )
}
