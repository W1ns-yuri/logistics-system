import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

// Подпись + значение. Используется в карточках и панелях просмотра.
export function InfoField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children || '—'}</div>
    </div>
  )
}
