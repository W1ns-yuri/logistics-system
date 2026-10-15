import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

// Подпись + поле + ошибка. Обязательные поля помечены звёздочкой, необязательные — словом Optional.
export function FormField({
  label,
  htmlFor,
  required,
  optional,
  error,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  optional?: boolean
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="gap-1">
        {t(label)}
        {required && <span className="text-destructive">*</span>}
        {optional && <span className="font-normal text-muted-foreground">({t('optional')})</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
