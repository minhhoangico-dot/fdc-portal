/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { getWeeklyReportDetailsBackTarget } from '@/lib/weekly-report';
import { useWeeklyReportDetails } from '@/viewmodels/useWeeklyReport';
import type { WeeklyReportDetailRow } from '@/types/weeklyReport';
import { PageHeader } from '@/ui/PageHeader';
import { WidgetCard } from '@/ui/WidgetCard';
import { DataTable } from '@/ui/DataTable';
import type { DataTableColumn } from '@/ui/DataTable';
import { StatusBadge } from '@/ui/StatusBadge';
import type { StatusKind } from '@/ui/StatusBadge';

/**
 * WeeklyReportDetailsScreen — re-skin of the hand-rolled sortable `<table>`
 * onto `ui/PageHeader` + `ui/WidgetCard` + `ui/DataTable` (compact, sticky,
 * sortable) + `ui/StatusBadge` + brand tokens (Phase 4a §4 mapping row 3).
 *
 * PRESENTATION ONLY. Consumes `useWeeklyReportDetails` verbatim — same
 * fields (`rows`, `loading`, `error`). `sortConfig` / `sortedRows` /
 * `handleSort` / `exportCsv` / `toCsvValue` are the identical presentation
 * state + CSV builder already in this file — reproduced verbatim.
 * `DataTable` never re-sorts: it only renders `sortedRows` in the order
 * this component already computed, controlled by `sortKey`/`sortDir`/
 * `onToggleSort` wired straight to the local `sortConfig`/`handleSort`.
 */

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

/** Row + display index (1-based) — presentation-only, mirrors the original `index + 1` STT column. */
type IndexedRow = WeeklyReportDetailRow & { __rowIndex: number };

function toCsvValue(value: unknown): string {
  const stringValue = String(value ?? '');
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

/**
 * `doituong` → StatusBadge kind. StatusBadge exposes 5 kinds (ok/warn/danger/
 * info/neutral); the legacy chip used 5 solid hues (blue/green/purple/
 * yellow/gray). Purple has no token equivalent — "Yeu cau" is mapped to
 * `danger` purely for the 5th distinct hue, not to imply an error state.
 */
function doituongStatus(value?: string): StatusKind {
  switch (value) {
    case 'Bao hiem':
      return 'info';
    case 'Vien phi':
      return 'ok';
    case 'Yeu cau':
      return 'danger';
    case 'Mien phi':
      return 'warn';
    default:
      return 'neutral';
  }
}

export function WeeklyReportDetailsScreen() {
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key') || '';
  const type = searchParams.get('type');
  const start = searchParams.get('start') || new Date().toISOString();
  const end = searchParams.get('end') || new Date().toISOString();
  const from = searchParams.get('from') || 'tv';
  const title = searchParams.get('title') || key;
  const isTransfer = type === 'transfer';
  const { rows, loading, error } = useWeeklyReportDetails({ key, type, start, end });
  const [sortConfig, setSortConfig] = React.useState<SortConfig>(null);

  const sortedRows = React.useMemo(() => {
    if (!sortConfig) return rows;
    return [...rows].sort((left, right) => {
      const leftValue = (left as unknown as Record<string, unknown>)[sortConfig.key];
      const rightValue = (right as unknown as Record<string, unknown>)[sortConfig.key];
      if (leftValue == null && rightValue == null) return 0;
      if (leftValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (rightValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      return `${leftValue}`.localeCompare(`${rightValue}`, 'vi', { numeric: true }) * (sortConfig.direction === 'asc' ? 1 : -1);
    });
  }, [rows, sortConfig]);

  const indexedRows = React.useMemo<IndexedRow[]>(
    () => sortedRows.map((row, index) => ({ ...row, __rowIndex: index + 1 })),
    [sortedRows],
  );

  const handleSort = (nextKey: string) => {
    setSortConfig((current) => {
      if (current?.key === nextKey) {
        return current.direction === 'asc' ? { key: nextKey, direction: 'desc' } : null;
      }
      return { key: nextKey, direction: 'asc' };
    });
  };

  const exportCsv = () => {
    const header = isTransfer
      ? ['STT', 'Mã BN', 'Tên bệnh nhân', 'GT', 'Ngày khám', 'Bệnh viện', 'Chẩn đoán']
      : ['STT', 'Mã BN', 'Tên bệnh nhân', 'GT', 'Đối tượng', 'Dịch vụ', 'Thời gian'];

    const rowsForCsv = sortedRows.map((row, index) =>
      isTransfer
        ? [index + 1, row.patientcode, row.patientname, row.gender, row.examtime, row.hospitalname, row.diagnosis]
        : [index + 1, row.patientcode, row.patientname, row.gender, row.doituong, row.servicename, row.time],
    );

    const csv = [header, ...rowsForCsv].map((line) => line.map(toCsvValue).join(',')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'weekly-report-details.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const backTarget = getWeeklyReportDetailsBackTarget({ from, start });

  const commonColumns: DataTableColumn<IndexedRow>[] = [
    {
      key: 'stt',
      header: 'STT',
      cell: (row) => row.__rowIndex,
      cellClassName: 'w-[60px]',
    },
    {
      key: 'patientcode',
      header: 'Mã BN',
      cell: (row) => row.patientcode,
      cellClassName: 'w-[100px]',
    },
    {
      key: 'patientname',
      header: 'Tên bệnh nhân',
      cell: (row) => row.patientname,
      cellClassName: 'whitespace-nowrap font-medium text-ink-900',
    },
    {
      key: 'gender',
      header: 'GT',
      cell: (row) => row.gender,
      cellClassName: 'w-[60px]',
    },
  ];

  const transferColumns: DataTableColumn<IndexedRow>[] = [
    {
      key: 'examtime',
      header: 'Ngày khám',
      sortKey: 'examtime',
      cell: (row) => row.examtime,
      cellClassName: 'w-[140px]',
    },
    {
      key: 'hospitalname',
      header: 'Bệnh viện',
      sortKey: 'hospitalname',
      cell: (row) => row.hospitalname,
      cellClassName: 'min-w-[220px] whitespace-normal font-medium text-info-600',
    },
    {
      key: 'diagnosis',
      header: 'Chẩn đoán',
      sortKey: 'diagnosis',
      cell: (row) => row.diagnosis,
      cellClassName: 'min-w-[320px] whitespace-normal italic text-ink-600',
    },
  ];

  const serviceColumns: DataTableColumn<IndexedRow>[] = [
    {
      key: 'doituong',
      header: 'Đối tượng',
      sortKey: 'doituong',
      cell: (row) => (row.doituong ? <StatusBadge status={doituongStatus(row.doituong)} label={row.doituong} /> : null),
    },
    {
      key: 'servicename',
      header: 'Dịch vụ',
      sortKey: 'servicename',
      cell: (row) => row.servicename,
    },
    {
      key: 'time',
      header: 'Thời gian',
      sortKey: 'time',
      cell: (row) => row.time,
    },
  ];

  const columns = [...commonColumns, ...(isTransfer ? transferColumns : serviceColumns)];

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex items-center gap-2 text-[14px] text-ink-600">
          <Link
            to={backTarget}
            className="inline-flex items-center gap-2 rounded-field border border-line bg-card px-4 py-2 text-[14px] font-medium text-ink-700 hover:bg-paper"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
        </div>

        <PageHeader
          title="Chi tiết dịch vụ"
          actions={
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-field border border-line bg-card px-4 py-2 text-[14px] font-medium text-ink-700 hover:bg-paper"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </button>
          }
        />

        {error && (
          <div className="rounded-field border border-danger-600/20 bg-danger-600/10 px-4 py-3 text-[14px] text-danger-600">
            {error}
          </div>
        )}

        <WidgetCard title={`Danh sách bệnh nhân - ${title}`}>
          <DataTable
            columns={columns}
            rows={indexedRows}
            rowKey={(row) => `${row.servicedataid}-${row.__rowIndex}`}
            sortKey={sortConfig?.key}
            sortDir={sortConfig?.direction}
            onToggleSort={handleSort}
            emptyLabel={loading ? 'Đang tải...' : 'Không có dữ liệu'}
            density="compact"
          />
        </WidgetCard>
      </div>
    </div>
  );
}
