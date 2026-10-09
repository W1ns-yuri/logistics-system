// Временные данные для главной. Когда появится API, заменим на запросы к серверу.

export type DocumentStatus = 'in_progress' | 'completed' | 'shipment_created' | 'in_transit' | 'cancelled'

export type RecentDocument = {
  reference: string
  type: 'Quotation' | 'Shipment' | 'Invoice'
  customer: string
  route: string
  status: DocumentStatus
  updatedAt: string
}

export const kpis = [
  { label: 'Open quotations', value: '24', hint: '+6 this week' },
  { label: 'Shipments in transit', value: '12', hint: '3 at the border' },
  { label: 'Unpaid invoices', value: '$18,450', hint: '4 overdue' },
  { label: 'Avg. margin', value: '9.4%', hint: 'last 30 days' },
]

export const recentDocuments: RecentDocument[] = [
  {
    reference: 'AT000004',
    type: 'Quotation',
    customer: 'TBM',
    route: 'Samarkand → Manisa',
    status: 'in_progress',
    updatedAt: '09.10.2026 10:12',
  },
  {
    reference: 'SH000003',
    type: 'Shipment',
    customer: 'DHL',
    route: 'Ashgabat → Abu Dhabi',
    status: 'in_transit',
    updatedAt: '09.10.2026 09:40',
  },
  {
    reference: 'AT000001',
    type: 'Quotation',
    customer: 'Huawei',
    route: 'Shanghai → Ashgabat',
    status: 'shipment_created',
    updatedAt: '08.10.2026 17:05',
  },
  {
    reference: 'INV-000140',
    type: 'Invoice',
    customer: 'Oguzabat',
    route: '—',
    status: 'in_progress',
    updatedAt: '08.10.2026 15:22',
  },
  {
    reference: 'AT000002',
    type: 'Quotation',
    customer: 'Hyundai',
    route: 'Busan → Mary',
    status: 'completed',
    updatedAt: '07.10.2026 12:48',
  },
  {
    reference: 'AT000005',
    type: 'Quotation',
    customer: 'Sign Works FZ-LLC',
    route: 'London → Dubai',
    status: 'cancelled',
    updatedAt: '06.10.2026 11:30',
  },
]
