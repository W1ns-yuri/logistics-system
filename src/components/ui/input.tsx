import * as React from 'react'

import { cleanValue, maxLengthFor } from '@/lib/input-rules'
import { cn } from '@/lib/utils'

// Поле ввода. Лишние символы убираются сразу при вводе, длина ограничена по типу поля (см. input-rules)
function Input({ className, type, onChange, maxLength, ...props }: React.ComponentProps<'input'>) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const clean = cleanValue(type, event.target.value)
    if (clean !== event.target.value) event.target.value = clean
    onChange?.(event)
  }
  return (
    <input
      type={type}
      data-slot="input"
      inputMode={type === 'tel' ? 'tel' : undefined}
      maxLength={maxLength ?? maxLengthFor(type)}
      onChange={handleChange}
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
