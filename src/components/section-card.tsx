import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { t } from '@/i18n'

// Блок карточки с заголовком: «Customer», «Route», «Cargo»...
export function SectionCard({
  title,
  children,
  className,
  action,
}: {
  title: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section className={cn('rounded-xl border bg-card shadow-xs', className)}>
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-sm font-semibold">{t(title)}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
