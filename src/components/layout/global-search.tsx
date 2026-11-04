import { FileText, Receipt, Search, Truck, X } from 'lucide-react'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePermissions } from '@/data/auth'
import { useInvoices, useQuotations, useShipments } from '@/data/store'
import { t } from '@/i18n'
import { cn } from '@/lib/utils'

type Hit = { key: string; to: string; icon: typeof FileText; title: string; subtitle: string }

const LIMIT = 8

// Поиск в шапке: номер или клиент котировки, перевозки, инвойса. Enter — открыть первую находку
export function GlobalSearch() {
  const quotations = useQuotations()
  const shipments = useShipments()
  const invoices = useInvoices()
  const { canSeePayments } = usePermissions()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // На телефоне поле прячется за иконкой и раскрывается на всю ширину шапки
  const [expanded, setExpanded] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const has = (...values: (string | undefined)[]) => values.some((v) => v?.toLowerCase().includes(q))
    const found: Hit[] = []
    for (const s of shipments)
      if (has(s.number, s.customer))
        found.push({ key: s.id, to: `/shipments/${s.id}`, icon: Truck, title: s.number, subtitle: s.customer })
    for (const item of quotations)
      if (has(item.reference, item.customer))
        found.push({
          key: item.id,
          to: `/quotations/${item.id}`,
          icon: FileText,
          title: item.reference,
          subtitle: item.customer,
        })
    // Инвойс открывается в своей перевозке; бухгалтерия видна не всем ролям
    if (canSeePayments)
      for (const inv of invoices)
        if (inv.shipmentId && has(inv.number, inv.billTo))
          found.push({
            key: inv.id,
            to: `/shipments/${inv.shipmentId}`,
            icon: Receipt,
            title: inv.number,
            subtitle: inv.billTo,
          })
    return found.slice(0, LIMIT)
  }, [query, quotations, shipments, invoices, canSeePayments])

  const go = (hit: Hit) => {
    navigate(hit.to)
    setQuery('')
    setOpen(false)
    setExpanded(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, hits.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter' && hits[active]) {
      go(hits[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
      setExpanded(false)
      input.current?.blur()
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        aria-label={t('Search')}
        onClick={() => {
          setExpanded(true)
          requestAnimationFrame(() => input.current?.focus())
        }}
      >
        <Search />
      </Button>
      <div
        className={cn(
          'relative',
          expanded
            ? 'absolute inset-x-0 top-0 z-30 flex h-14 items-center gap-2 bg-background px-3'
            : 'hidden lg:block',
        )}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={input}
            value={query}
            role="combobox"
            aria-expanded={open && query.trim().length >= 2}
            aria-controls="global-search-results"
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            // Даём клику по результату сработать до закрытия списка
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder={t('Search by reference, customer...')}
            className={cn('h-9 pl-8', expanded ? 'w-full' : 'w-72')}
          />
          {open && query.trim().length >= 2 && (
            <ul
              id="global-search-results"
              role="listbox"
              className="absolute top-full right-0 left-0 z-40 mt-1 max-h-96 overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md"
            >
              {hits.length ? (
                hits.map((hit, index) => (
                  <li key={hit.key} role="option" aria-selected={index === active}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => go(hit)}
                      onMouseEnter={() => setActive(index)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left',
                        index === active && 'bg-accent',
                      )}
                    >
                      <hit.icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{hit.title}</span>
                      <span className="truncate text-muted-foreground">{hit.subtitle}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-2 py-3 text-center text-muted-foreground">{t('Nothing found')}</li>
              )}
            </ul>
          )}
        </div>
        {expanded && (
          <Button variant="ghost" size="icon-sm" aria-label={t('Close')} onClick={() => setExpanded(false)}>
            <X />
          </Button>
        )}
      </div>
    </>
  )
}
