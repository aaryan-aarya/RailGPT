import { useState } from 'react';
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable, type ColumnDef, type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  pageSize?: number;
}

export function DataTable<T>({ data, columns, searchPlaceholder = 'Search…', emptyMessage = 'No records found.', pageSize = 10 }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, value) => {
      const v = String(value).toLowerCase();
      return Object.values(row.original as Record<string, unknown>).some((cell) =>
        String(cell ?? '').toLowerCase().includes(v),
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div>
      <div className="relative mb-3 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input className="pl-9" placeholder={searchPlaceholder} value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} aria-label={searchPlaceholder} />
      </div>
      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-line bg-paper">
                  {hg.headers.map((header) => (
                    <th key={header.id} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-ink transition-colors">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <ArrowUpDown className={cn('h-3 w-3', header.column.getIsSorted() ? 'text-brand' : 'text-muted/50')} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 && (
                <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-muted">{emptyMessage}</td></tr>
              )}
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 hover:bg-brand-tint/40 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-body">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-muted">
        <span>
          {table.getFilteredRowModel().rows.length} record{table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
            className="flex h-8 w-8 items-center justify-center rounded border border-line bg-surface disabled:opacity-40 hover:border-brand/40 transition-colors" aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs">Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
          <button type="button" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
            className="flex h-8 w-8 items-center justify-center rounded border border-line bg-surface disabled:opacity-40 hover:border-brand/40 transition-colors" aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
