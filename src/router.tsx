import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/components/layout/app-layout'
import { CustomersPage } from '@/pages/customers'
import { HomePage } from '@/pages/home'
import { NotFoundPage } from '@/pages/not-found'
import { PaymentsPage } from '@/pages/payments'
import { QuotationsPage } from '@/pages/quotations'
import { ShipmentsPage } from '@/pages/shipments'
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
      { path: 'shipments', element: <ShipmentsPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'vendors', element: <VendorsPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
