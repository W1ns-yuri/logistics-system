import type { ReactNode } from 'react'
import { t } from '@/i18n'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  // Кнопки отдельной строкой под заголовком — для списков (котировки, перевозки), чтобы они выглядели одинаково
  stacked?: boolean
}

export function PageHeader({ title, description, actions, stacked }: PageHeaderProps) {
  if (stacked)
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t(title)}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{t(description)}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    )
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t(title)}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{t(description)}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
