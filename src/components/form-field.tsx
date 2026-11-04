import { useEffect, useRef, type ReactNode } from 'react'
import { CircleHelp } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

// Подпись + поле + ошибка. Обязательные поля помечены звёздочкой, остальные — без пометок,
// чтобы длинные русские подписи не переносились и не налезали друг на друга.
// hint — пояснение «что это и зачем», показывается при наведении на значок «?».
// Ошибка всплывает поверх формы над полем справа, на свободном месте строки с подписью: вёрстка не прыгает
// и соседние поля не закрываются. Текст видно у поля в фокусе или под мышкой, у остальных — только красная рамка.
// Первое поле с ошибкой получает фокус само.
export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (error) focusFirstInvalid(box.current)
  }, [error])

  return (
    // Колонка: подпись растягивается и прижимает текст книзу, поэтому поля в одной строке сетки
    // стоят ровно, даже если у соседа подпись всё-таки перенеслась на две строки.
    <div ref={box} className={cn('group/field flex flex-col gap-1.5', className)}>
      <div className="flex flex-1 items-end gap-1">
        <Label htmlFor={htmlFor} className="block leading-snug">
          {t(label)}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {hint && <FieldHint text={hint} />}
      </div>
      <div className="relative">
        {children}
        {error && (
          <FieldError
            text={error}
            placement="above"
            className="opacity-0 transition-opacity group-focus-within/field:opacity-100 group-hover/field:opacity-100"
          />
        )}
      </div>
    </div>
  )
}

export function FieldHint({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            aria-label={t(text)}
            className="mb-px text-muted-foreground/70 hover:text-foreground"
          >
            <CircleHelp className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 leading-relaxed">
          {t(text)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Всплывающая подсказка об ошибке: стрелка указывает на поле, место в форме она не занимает.
// above — над полем у правого края, below — под полем слева (для галочек, где сверху текст)
export function FieldError({
  text,
  className,
  placement = 'below',
}: {
  text: string
  className?: string
  placement?: 'above' | 'below'
}) {
  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-none absolute z-20 max-w-[90%] animate-in rounded-md bg-destructive px-2.5 py-1 text-xs text-white shadow-md fade-in-0',
        placement === 'above'
          ? 'right-0 bottom-full mb-1.5 slide-in-from-bottom-1'
          : 'top-full left-0 mt-1.5 slide-in-from-top-1',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute size-2 rotate-45 bg-destructive',
          placement === 'above' ? 'right-3 -bottom-1' : 'left-3 -top-1',
        )}
      />
      <span className="relative">{text}</span>
    </div>
  )
}

// Если фокус не стоит на поле с ошибкой — ставим его на первое такое поле в форме
function focusFirstInvalid(from: HTMLElement | null) {
  const scope = from?.closest('form, [role=dialog]') ?? document
  const active = document.activeElement
  if (active?.getAttribute('aria-invalid') === 'true') return
  scope.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}
