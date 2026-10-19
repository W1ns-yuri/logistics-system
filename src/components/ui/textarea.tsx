import * as React from 'react'

import { cleanValue, MAX_LENGTH } from '@/lib/input-rules'
import { cn } from '@/lib/utils'

function Textarea({ className, onChange, maxLength, ...props }: React.ComponentProps<'textarea'>) {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const clean = cleanValue('text', event.target.value)
    if (clean !== event.target.value) event.target.value = clean
    onChange?.(event)
  }
  return (
    <textarea
      data-slot="textarea"
      maxLength={maxLength ?? MAX_LENGTH.textarea}
      onChange={handleChange}
      className={cn(
        'flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
