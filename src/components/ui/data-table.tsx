"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button, Input } from "@fluentui/react-components";
import { ChevronLeft20Regular, ChevronRight20Regular, Search20Regular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Cari data...",
  emptyTitle = "Belum ada data",
  emptyDescription = "Data akan muncul setelah transaksi dibuat.",
  pageSize = 8,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const stableColumns = useMemo(() => columns, [columns]);
  const table = useReactTable({
    data,
    columns: stableColumns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-[var(--app-border)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={globalFilter}
          onChange={(_, data) => setGlobalFilter(data.value)}
          contentBefore={<Search20Regular />}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full sm:max-w-xs"
        />
        <span className="text-xs text-[var(--app-text-muted)]">{table.getFilteredRowModel().rows.length} data</span>
      </div>

      {table.getRowModel().rows.length === 0 ? (
        <EmptyState
          title={globalFilter.trim() ? "Tidak ada hasil pencarian" : emptyTitle}
          description={globalFilter.trim() ? `Tidak ada data yang cocok dengan “${globalFilter.trim()}”. Coba kata kunci lain.` : emptyDescription}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-[var(--app-surface-2)]">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b border-[var(--app-border)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="interactive-row border-b border-[var(--app-border)] last:border-b-0">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle text-[var(--app-text)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {table.getPageCount() > 1 ? (
        <div className="flex items-center justify-between gap-4 border-t border-[var(--app-border)] px-4 py-3">
          <span className="text-xs text-[var(--app-text-muted)]">
            Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
          </span>
          <div className="flex gap-1">
            <Button
              appearance="subtle"
              icon={<ChevronLeft20Regular />}
              aria-label="Halaman sebelumnya"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            />
            <Button
              appearance="subtle"
              icon={<ChevronRight20Regular />}
              aria-label="Halaman berikutnya"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
