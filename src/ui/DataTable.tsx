/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { ArrowUpDown } from 'lucide-react';

/**
 * DataTable — controlled, PURELY presentational sortable table (direction §5.2,
 * Phase 3 spec §3.1).
 *
 * Renders exactly the `rows` it is handed, IN THE GIVEN ORDER. It never sorts,
 * filters, slices, or re-derives anything — sorting is controlled by the caller
 * via `sortKey`/`sortDir`/`onToggleSort` (wired straight to the frozen
 * viewmodels' `sortKey`/`sortDir`/`toggleSort`). This passthrough purity is
 * load-bearing for "numbers provably unchanged".
 *
 * Pure presentational: no supabase, no viewmodels, no business logic. Tokens
 * only (no indigo). Covers the pharmacy/supply list tables and the valuation
 * table (row highlight via `isRowActive`).
 */

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  /** Cell + header horizontal alignment. Default 'left'. */
  align?: 'left' | 'right' | 'center';
  /** When present, the column header is a sort toggle keyed by this value. */
  sortKey?: string;
  /** Caller renders the cell content — it owns ALL formatting. */
  cell: (row: Row) => ReactNode;
  /** Extra classes on every body cell in this column (e.g. 'hidden md:table-cell'). */
  cellClassName?: string;
  /** Extra classes on this column's header cell. */
  headerClassName?: string;
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[];
  /** Rendered as-is, in order. Never re-sorted or sliced. */
  rows: Row[];
  rowKey: (row: Row) => string;
  /** Active sort column key (matches a column's `sortKey`). */
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  /** Called with a column's `sortKey` when its header is clicked. */
  onToggleSort?: (key: string) => void;
  onRowClick?: (row: Row) => void;
  /** Highlights a row (e.g. the valuation row currently selected). */
  isRowActive?: (row: Row) => boolean;
  /** Rendered when `rows` is empty. Default "Không có dữ liệu." */
  emptyLabel?: ReactNode;
  /** 'compact' = accounting density (px-3 py-2, 13px). Default 'comfortable'. */
  density?: 'comfortable' | 'compact';
  /** Sticky header on the paper background. Default true. */
  stickyHeader?: boolean;
  className?: string;
}

const ALIGN_CLASS: Record<'left' | 'right' | 'center', string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDir,
  onToggleSort,
  onRowClick,
  isRowActive,
  emptyLabel = 'Không có dữ liệu.',
  density = 'comfortable',
  stickyHeader = true,
  className = '',
}: DataTableProps<Row>) {
  const cellPad = density === 'compact' ? 'px-3 py-2 text-[13px]' : 'px-4 py-3 text-[14px]';
  const headPad = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';
  const clickable = Boolean(onRowClick);

  return (
    <div
      className={`overflow-x-auto rounded-card border border-line bg-card ${className}`.trim()}
    >
      <table className="w-full border-collapse">
        <thead
          className={`bg-paper ${stickyHeader ? 'sticky top-0 z-10' : ''}`.trim()}
        >
          <tr className="border-b border-line">
            {columns.map((col) => {
              const align = col.align ?? 'left';
              const sortable = Boolean(col.sortKey) && Boolean(onToggleSort);
              const active = sortable && col.sortKey === sortKey;
              const justify =
                align === 'right'
                  ? 'justify-end'
                  : align === 'center'
                    ? 'justify-center'
                    : 'justify-start';

              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={`${headPad} ${ALIGN_CLASS[align]} text-[12px] font-semibold uppercase tracking-wide text-ink-600 ${col.headerClassName ?? ''}`.trim()}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onToggleSort?.(col.sortKey!)}
                      className={`inline-flex items-center gap-1 ${justify} transition-colors hover:text-ink-900 ${active ? 'text-brand-600' : ''}`.trim()}
                    >
                      <span>{col.header}</span>
                      <ArrowUpDown
                        className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-brand-600' : 'text-ink-400'}`}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={`${cellPad} text-center text-ink-400`}
              >
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const active = isRowActive?.(row) ?? false;
              return (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-line last:border-b-0 transition-colors ${
                    active ? 'bg-brand-50' : 'hover:bg-brand-50/40'
                  } ${clickable ? 'cursor-pointer' : ''}`.trim()}
                >
                  {columns.map((col) => {
                    const align = col.align ?? 'left';
                    const numeric = align === 'right' ? '[font-variant-numeric:tabular-nums]' : '';
                    return (
                      <td
                        key={col.key}
                        className={`${cellPad} ${ALIGN_CLASS[align]} ${numeric} text-ink-900 ${col.cellClassName ?? ''}`.trim()}
                      >
                        {col.cell(row)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
