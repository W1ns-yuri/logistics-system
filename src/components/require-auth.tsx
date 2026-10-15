import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { usePermissions, useSession } from '@/data/auth'

// Пускает дальше только после входа. Иначе — на /login, запомнив, куда человек шёл.
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const location = useLocation()

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

// Оплаты и аналитику сотрудник не видит — отправляем на главную
export function RequirePayments({ children }: { children: ReactNode }) {
  const { canSeePayments } = usePermissions()
  if (!canSeePayments) return <Navigate to="/" replace />
  return children
}
