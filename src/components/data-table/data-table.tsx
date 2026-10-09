import { useMemo, useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { DataTableFacetFilter, type FacetOption } from './data-table-facet-filter'
import { DataTablePagination } from './data-table-pagination'
import { DataTableViewOptions } from './data-table-view-options'

export type FacetFilterConfig = {
  columnId: string
  title: string
  options: FacetOption[]
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  getRowId: (row: TData) => string
  selectedId?: string
  onSelect?: (row: TData | undefined) => void
  onOpen?: (row: TData) => void
  searchPlaceholder?: string
  facetFilters?: FacetFilterConfig[]
  actions?: ReactNode
  initialSorting?: SortingState
  rowClassName?: (row: TData) => string | undefined
}

/*
 * Универсальная таблица на TanStack Table.
 * Умеет: поиск по всем колонкам, фильтр по значениям (например статус), сортировку по клику
 * на заголовок, скрытие колонок, пагинацию и выбор строки (клик — выбрать, двойной клик — открыть).
 * Колонки описываются снаружи (см. quotation-columns.tsx), сама таблица ничего не знает про котировки.
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  selectedId,
  onSelect,
  onOpen,
  searchPlaceholder = 'Search...',
  facetFilters = [],
  actions,
  initialSorting = [],
  rowClassName,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const rowSelection = useMemo(() => (selectedId ? { [selectedId]: true } : {}), [selectedId])

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, globalFilter, columnFilters, columnVisibility, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    enableMultiRowSelection: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: { pagination: { pageSize: 10 } },
  })

  const rows = table.getRowModel().rows

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      {/* Верхняя панель: поиск, фильтры, действия */}
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-64 pl-8"
          />
        </div>
        {facetFilters.map((filter) => {
          const column = table.getColumn(filter.columnId)
          return column ? (
            <DataTableFacetFilter key={filter.columnId} column={column} title={filter.title} options={filter.options} />
          ) : null
        })}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <Table className="text-[13px]">
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead key={header.id} style={{ width: header.column.columnDef.size }}>
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === 'asc' ? (
                          <ArrowUp className="size-3.5" />
                        ) : sorted === 'desc' ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? 'selected' : undefined}
                onClick={() => onSelect?.(row.getIsSelected() ? undefined : row.original)}
                onDoubleClick={() => onOpen?.(row.original)}
                className={cn('cursor-pointer select-none', rowClassName?.(row.original))}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                Nothing found. Try changing the search or filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <DataTablePagination table={table} />
    </div>
  )
}
