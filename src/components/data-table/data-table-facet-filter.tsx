import type { Column } from '@tanstack/react-table'
import { ListFilter, X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type FacetOption = { value: string; label: string }

// Фильтр «по значениям» колонки: можно отметить несколько статусов сразу.
// Колонка должна иметь filterFn: 'arrIncludesSome'.
export function DataTableFacetFilter<TData>({
  column,
  title,
  options,
}: {
  column: Column<TData, unknown>
  title: string
  options: FacetOption[]
}) {
  const selected = new Set((column.getFilterValue() as string[] | undefined) ?? [])
  const counts = column.getFacetedUniqueValues()

  const toggle = (value: string) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    column.setFilterValue(next.size ? [...next] : undefined)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <ListFilter />
          {title}
          {selected.size > 0 && (
            <Badge variant="info" className="ml-1 rounded-sm px-1.5">
              {selected.size}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Filter by {title.toLowerCase()}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.has(option.value)}
            onCheckedChange={() => toggle(option.value)}
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{counts.get(option.value) ?? 0}</span>
          </DropdownMenuCheckboxItem>
        ))}
        {selected.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => column.setFilterValue(undefined)}>
              <X />
              Clear filter
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
