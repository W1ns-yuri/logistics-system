import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router'

import { usePermissions } from '@/data/auth'
import { usePlanLimit, type LimitKind } from '@/data/limits'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

const text: Record<LimitKind, { warn: string; reached: string }> = {
  shipments: {
    warn: '{used} of {limit} new shipments used this month on the Basic plan.',
    reached: 'The Basic plan limit of {limit} new shipments this month is reached. Current shipments work as usual.',
  },
  quotations: {
    warn: '{used} of {limit} new quotations used this month on the Basic plan.',
    reached: 'The Basic plan limit of {limit} new quotations this month is reached. Current quotations work as usual.',
  },
}

// Плашка над списком: лимит Basic почти кончился или кончился. На Lite лимитов нет
export function LimitNotice({ kind }: { kind: LimitKind }) {
  const state = usePlanLimit(kind)
  const { role } = usePermissions()
  if (!state?.warn) return null
  return (
    <div
      role="status"
      data-testid={`limit-${kind}`}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm',
        state.reached
          ? 'border-destructive/20 bg-destructive/10 text-destructive'
          : 'border-warning/20 bg-warning/10 text-warning-text',
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span>{t(state.reached ? text[kind].reached : text[kind].warn, { used: state.used, limit: state.limit })}</span>
      <span>{t('Lite has no limits.')}</span>
      {role === 'admin' && (
        <Link to="/settings?tab=subscription" className="font-medium underline underline-offset-2">
          {t('Switch to Lite')}
        </Link>
      )}
    </div>
  )
}
