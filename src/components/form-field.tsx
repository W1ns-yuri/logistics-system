import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

// Подпись + поле + ошибка. Обязательные поля помечены звёздочкой, остальные — без пометок,
// чтобы длинные русские подписи не переносились и не налезали друг на друга.
export function FormField({
  label,
  htmlFor,
  required,
  error,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    // Колонка: подпись растягивается и прижимает текст книзу, поэтому поля в одной строке сетки
    // стоят ровно, даже если у соседа подпись всё-таки перенеслась на две строки.
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="block flex-1 content-end leading-snug">
        {t(label)}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
