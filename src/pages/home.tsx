import { FileText, Receipt, Truck } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { kpis, recentDocuments, type RecentDocument } from '@/data/dashboard'

const typeIcon: Record<RecentDocument['type'], typeof FileText> = {
  Quotation: FileText,
  Shipment: Truck,
  Invoice: Receipt,
}

export function HomePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader title="Home" description="Overview of quotations, shipments and payments." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="gap-2">
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums">{kpi.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{kpi.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <div>
            <CardTitle>Recently used documents</CardTitle>
            <CardDescription className="mt-1">Last documents you opened or changed</CardDescription>
          </div>
          <Badge variant="secondary">{recentDocuments.length}</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Reference</th>
                <th className="px-5 py-2.5 font-medium">Type</th>
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <th className="px-5 py-2.5 font-medium">Route</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentDocuments.map((doc) => {
                const Icon = typeIcon[doc.type]
                return (
                  <tr key={doc.reference} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium text-primary">{doc.reference}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Icon className="size-4" />
                        {doc.type}
                      </span>
                    </td>
                    <td className="px-5 py-3">{doc.customer}</td>
                    <td className="px-5 py-3 text-muted-foreground">{doc.route}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground tabular-nums">{doc.updatedAt}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
