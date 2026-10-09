import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/components/layout/app-layout'
import { CustomersPage } from '@/pages/customers'
import { HomePage } from '@/pages/home'
import { NotFoundPage } from '@/pages/not-found'
import { PaymentsPage } from '@/pages/payments'
import { QuotationDetailPage } from '@/pages/quotations/quotation-detail-page'
import { QuotationsPage } from '@/pages/quotations/quotations-page'
import { SettingsPage } from '@/pages/settings'
import { ShipmentDetailPage } from '@/pages/shipments/shipment-detail-page'
import { ShipmentsPage } from '@/pages/shipments/shipments-page'
import { SupportPage } from '@/pages/support'
import { VendorsPage } from '@/pages/vendors'

// Все страницы — дети AppLayout, поэтому меню и шапка остаются на месте при переходах
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'quotations', element: <QuotationsPage /> },
      { path: 'quotations/:id', element: <QuotationDetailPage /> },
      { path: 'shipments', element: <ShipmentsPage /> },
      { path: 'shipments/:id', element: <ShipmentDetailPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'vendors', element: <VendorsPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
