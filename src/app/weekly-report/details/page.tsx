/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Download, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWeeklyReportDetails } from '@/viewmodels/useWeeklyReport';

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

function toCsvValue(value: unknown): string {
  const stringValue = String(value ?? '');
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

export default function WeeklyReportDetailsPage() {
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
      const leftValue = (left as Record<string, unknown>)[sortConfig.key];
      const rightValue = (right as Record<string, unknown>)[sortConfig.key];
      if (leftValue == null && rightValue == null) return 0;
      if (leftValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (rightValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      return `${leftValue}`.localeCompare(`${rightValue}`, 'vi', { numeric: true }) * (sortConfig.direction === 'asc' ? 1 : -1);
    });
  }, [rows, sortConfig]);

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
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'weekly-report-details.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const backTarget = from === 'admin' ? '/admin?tab=weekly_report' : `/weekly-report/tv?date=${encodeURIComponent(start)}`;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to={backTarget}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>

          <h1 className="text-2xl font-bold uppercase text-blue-900">Chi tiết dịch vụ</h1>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Xuất CSV
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Danh sách bệnh nhân - {title}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className="w-[60px] px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">STT</th>
                  <th className="w-[100px] px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Mã BN</th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">Tên bệnh nhân</th>
                  <th className="w-[60px] px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">GT</th>

                  {isTransfer ? (
                    <>
                      <th className="w-[140px] px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <button type="button" onClick={() => handleSort('examtime')} className="inline-flex items-center gap-1">
                          Ngày khám
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <button type="button" onClick={() => handleSort('hospitalname')} className="inline-flex items-center gap-1">
                          Bệnh viện
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <button type="button" onClick={() => handleSort('diagnosis')} className="inline-flex items-center gap-1">
                          Chẩn đoán
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <button type="button" onClick={() => handleSort('doituong')} className="inline-flex items-center gap-1">
                          Đối tượng
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <button type="button" onClick={() => handleSort('servicename')} className="inline-flex items-center gap-1">
                          Dịch vụ
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                        <button type="button" onClick={() => handleSort('time')} className="inline-flex items-center gap-1">
                          Thời gian
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={isTransfer ? 7 : 7} className="px-4 py-8 text-center text-slate-500">
                      Đang tải...
                    </td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={isTransfer ? 7 : 7} className="px-4 py-8 text-center text-slate-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row, index) => (
                    <tr key={`${row.servicedataid}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">{row.patientcode}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{row.patientname}</td>
                      <td className="px-4 py-3">{row.gender}</td>

                      {isTransfer ? (
                        <>
                          <td className="px-4 py-3">{row.examtime}</td>
                          <td className="min-w-[220px] whitespace-normal px-4 py-3 font-medium text-blue-700">{row.hospitalname}</td>
                          <td className="min-w-[320px] whitespace-normal px-4 py-3 italic text-slate-600">{row.diagnosis}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                row.doituong === 'Bao hiem'
                                  ? 'bg-blue-100 text-blue-700'
                                  : row.doituong === 'Vien phi'
                                    ? 'bg-green-100 text-green-700'
                                    : row.doituong === 'Yeu cau'
                                      ? 'bg-purple-100 text-purple-700'
                                      : row.doituong === 'Mien phi'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {row.doituong}
                            </span>
                          </td>
                          <td className="px-4 py-3">{row.servicename}</td>
                          <td className="px-4 py-3">{row.time}</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

