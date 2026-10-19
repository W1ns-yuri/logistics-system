import { createBrowserRouter } from 'react-router'

import { AppLayout } from '@/components/layout/app-layout'
import { RequireAuth, RequirePayments } from '@/components/require-auth'
import { AnalyticsPage } from '@/pages/analytics/analytics-page'
import { CustomersPage } from '@/pages/customers/customers-page'
import { HomePage } from '@/pages/home'
import { LoginPage } from '@/pages/login/login-page'
import { NotFoundPage } from '@/pages/not-found'
import { PaymentsPage } from '@/pages/payments/payments-page'
import { CompaniesPage } from '@/pages/platform/companies-page'
import { CompanyPage } from '@/pages/platform/company-page'
import { PlatformLayout } from '@/pages/platform/platform-layout'
import { QuotationDetailPage } from '@/pages/quotations/quotation-detail-page'
import { QuotationFormPage } from '@/pages/quotations/quotation-form-page'
import { QuotationsPage } from '@/pages/quotations/quotations-page'
import { SettingsPage } from '@/pages/settings'
import { SignupPage } from '@/pages/signup/signup-page'
import { ShipmentDetailPage } from '@/pages/shipments/shipment-detail-page'
import { ShipmentsPage } from '@/pages/shipments/shipments-page'
import { SupportPage } from '@/pages/support'
import { VendorsPage } from '@/pages/vendors/vendors-page'

// Все страницы — дети AppLayout, поэтому меню и шапка остаются на месте при переходах
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  // Админка владельца платформы: свой вход и свой каркас
  {
    path: '/platform',
    element: <PlatformLayout />,
    children: [
      { index: true, element: <CompaniesPage /> },
      { path: 'companies/:id', element: <CompanyPage /> },
    ],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'quotations', element: <QuotationsPage /> },
      { path: 'quotations/new', element: <QuotationFormPage /> },
      { path: 'quotations/:id', element: <QuotationDetailPage /> },
      { path: 'quotations/:id/edit', element: <QuotationFormPage /> },
      { path: 'shipments', element: <ShipmentsPage /> },
      { path: 'shipments/:id', element: <ShipmentDetailPage /> },
      { path: 'customers', element: <CustomersPage /> },
      { path: 'vendors', element: <VendorsPage /> },
      {
        path: 'payments',
        element: (
          <RequirePayments>
            <PaymentsPage />
          </RequirePayments>
        ),
      },
      {
        path: 'analytics',
        element: (
          <RequirePayments>
            <AnalyticsPage />
          </RequirePayments>
        ),
      },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'support', element: <SupportPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
