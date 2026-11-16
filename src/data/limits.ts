import { API_MODE } from '@/lib/api'
import { usePermissions } from './auth'
import { LIMIT_WARNING, planLimits, todayIso, useCurrentCompany } from './platform'
import { useQuotations, useShipments } from './store'

export type LimitKind = 'shipments' | 'quotations'
export type LimitState = { used: number; limit: number; reached: boolean; warn: boolean }

/*
 * Лимит тарифа Basic: сколько новых перевозок или котировок создано в этом месяце.
 * null — у тарифа нет лимитов. В рабочей сборке число считает сервер (он же и не даст создать сверх лимита),
 * в демо — считаем по датам создания здесь.
 */
export function usePlanLimit(kind: LimitKind): LimitState | null {
  const { plan } = usePermissions()
  const company = useCurrentCompany()
  const quotations = useQuotations()
  const shipments = useShipments()
  const limits = plan ? planLimits[plan] : null
  if (!limits) return null
  const month = todayIso().slice(0, 7)
  const used = API_MODE
    ? (company?.usage?.[kind] ?? 0)
    : kind === 'quotations'
      ? quotations.filter((q) => q.createdAt?.startsWith(month)).length
      : shipments.filter((s) => s.orderDate?.startsWith(month)).length
  const limit = limits[kind]
  return { used, limit, reached: used >= limit, warn: used >= limit * LIMIT_WARNING }
}
