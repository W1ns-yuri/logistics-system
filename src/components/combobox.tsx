import { useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

export type ComboboxOption = { value: string; label: string; hint?: string }

/*
 * Выпадающий список с поиском (как выбор клиента в программе, которую показал заказчик).
 * allowCustom — можно ввести своё значение, если его нет в списке (например, город).
 * footer — кнопка внизу списка, например «Новый клиент».
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  allowCustom,
  invalid,
  footer,
  open: openProp,
  onOpenChange,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  allowCustom?: boolean
  invalid?: boolean
  footer?: (close: () => void) => ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [ownOpen, setOwnOpen] = useState(false)
  const open = openProp ?? ownOpen
  const setOpen = (next: boolean) => {
    setOwnOpen(next)
    onOpenChange?.(next)
    if (!next) setQuery('')
  }
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => `${o.label} ${o.value} ${o.hint ?? ''}`.toLowerCase().includes(q))
  }, [options, query])

  const custom =
    allowCustom && query.trim() && !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase())
  const items: ComboboxOption[] = custom
    ? [...filtered, { value: query.trim(), label: t('Use “{text}”', { text: query.trim() }) }]
    : filtered

  const pick = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs outline-none dark:bg-input/30',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
          )}
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {selected?.label ?? (value || t(placeholder))}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            placeholder={t('Search')}
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, items.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                const item = items[active]
                if (item) pick(item.value)
              }
            }}
          />
        </div>
        <div role="listbox" className="max-h-64 overflow-y-auto p-1">
          {items.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">{t('Nothing found')}</div>
          )}
          {items.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(option.value)}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                index === active && 'bg-accent text-accent-foreground',
              )}
            >
              <Check className={cn('size-4 shrink-0', option.value === value ? 'opacity-100' : 'opacity-0')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{option.label}</span>
                {option.hint && <span className="block truncate text-xs text-muted-foreground">{option.hint}</span>}
              </span>
            </button>
          ))}
        </div>
        {footer && <div className="border-t p-1">{footer(() => setOpen(false))}</div>}
      </PopoverContent>
    </Popover>
  )
}

// Кнопка внизу списка: «+ Новый клиент»
export function ComboboxAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm font-medium text-primary hover:bg-accent"
    >
      <Plus className="size-4" />
      {children}
    </button>
  )
}
