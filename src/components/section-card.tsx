import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { t } from '@/i18n'

// Блок карточки с заголовком: «Customer», «Route», «Cargo»...
export function SectionCard({
  title,
  children,
  className,
  action,
  description,
}: {
  title: string
  // Одна строка под заголовком: что писать в этом блоке
  description?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section className={cn('rounded-xl border bg-card shadow-xs', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t(title)}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{t(description)}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
