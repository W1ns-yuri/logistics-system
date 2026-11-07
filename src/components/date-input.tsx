import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { locale, t } from '@/i18n'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/*
 * Поле даты на языке интерфейса: в английском «18 Nov 2026», в русском «18.11.2026».
 * Стандартный <input type="date"> берёт формат из языка компьютера, а не системы, поэтому свой.
 * Значение — строка ISO '2026-11-18' (как у стандартного поля), пустая строка — дата не выбрана.
 */

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayIso = () => {
  const now = new Date()
  return toIso(now.getFullYear(), now.getMonth(), now.getDate())
}

type Props = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  // Можно ли очистить дату крестиком (для необязательных полей)
  clearable?: boolean
  'aria-invalid'?: boolean
  'aria-label'?: string
  className?: string
}

export function DateInput({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  clearable = true,
  className,
  ...aria
}: Props) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined
  const base = selected ?? new Date()
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() })

  const openChange = (next: boolean) => {
    // Открыли — показываем месяц выбранной даты
    if (next) setView({ year: base.getFullYear(), month: base.getMonth() })
    setOpen(next)
  }

  const shift = (delta: number) =>
    setView(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const pick = (iso: string) => {
    onChange(iso)
    setOpen(false)
  }

  // Неделя с понедельника; пустые клетки до первого числа
  const first = new Date(view.year, view.month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(view.year, view.month + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale(), { weekday: 'short' }).format(new Date(2024, 0, 1 + i)),
  )
  const months = Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale(), { month: 'long' }).format(new Date(2024, i, 1)),
  )
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 16 }, (_, i) => thisYear - 10 + i)
  if (!years.includes(view.year)) years.push(view.year)
  const today = todayIso()

  return (
    <Popover open={open} onOpenChange={openChange}>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            id={id}
            type="button"
            aria-invalid={aria['aria-invalid']}
            aria-label={aria['aria-label']}
            className={cn(
              'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {value ? formatDate(value) : t(placeholder)}
            </span>
          </button>
        </PopoverTrigger>
        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label={t('Clear date')}
            onClick={() => onChange('')}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-72 p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="mb-2 flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('Previous month')}
            onClick={() => shift(-1)}
          >
            <ChevronLeft />
          </Button>
          <select
            aria-label={t('Month')}
            value={view.month}
            onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))}
            className="h-8 min-w-0 flex-1 rounded-md bg-transparent px-1 text-sm font-medium capitalize outline-none hover:bg-accent"
          >
            {months.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label={t('Year')}
            value={view.year}
            onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
            className="h-8 rounded-md bg-transparent px-1 text-sm font-medium outline-none hover:bg-accent"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Next month')} onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
          {weekdays.map((name) => (
            <span key={name} className="py-1 text-muted-foreground capitalize">
              {name}
            </span>
          ))}
          {cells.map((day, i) => {
            if (!day) return <span key={`e${i}`} />
            const iso = toIso(view.year, view.month, day)
            return (
              <button
                key={iso}
                type="button"
                data-date={iso}
                onClick={() => pick(iso)}
                className={cn(
                  'h-8 rounded-md text-sm tabular-nums hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                  iso === today && 'font-semibold text-primary',
                  iso === value && 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between border-t pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => pick(today)}>
            {t('Today')}
          </Button>
          {clearable && value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => pick('')}>
              {t('Clear')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
