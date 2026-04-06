/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { X } from "lucide-react";

type Cell = string | number | null | undefined;

type SummaryTone = "default" | "positive" | "warning" | "danger";

interface SummaryRow {
  label: string;
  value: string;
  tone?: SummaryTone;
}

export interface ChartDetailModalProps {
  title: string;
  dataSource: string;
  dataNote?: string;
  summaryRows?: SummaryRow[];
  filters?: React.ReactNode;
  columns: string[];
  rows: Cell[][];
  onClose: () => void;
}

const SUMMARY_TONE_CLASSES: Record<SummaryTone, string> = {
  default: "text-gray-900 bg-gray-50 border-gray-100",
  positive: "text-emerald-700 bg-emerald-50 border-emerald-100",
  warning: "text-amber-700 bg-amber-50 border-amber-100",
  danger: "text-rose-700 bg-rose-50 border-rose-100",
};

export default function ChartDetailModal({
  title,
  dataSource,
  dataNote,
  summaryRows = [],
  filters,
  columns,
  rows,
  onClose,
}: ChartDetailModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{title}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-gray-500">Nguồn dữ liệu:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                {dataSource}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {filters ? (
            <div className="px-4 py-3 border-b border-gray-100 bg-white">{filters}</div>
          ) : null}

          {summaryRows.length > 0 ? (
            <div className="px-4 py-4 border-b border-gray-100 bg-gray-50/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summaryRows.map((row) => (
                  <div
                    key={`${row.label}:${row.value}`}
                    className={`rounded-xl border px-4 py-3 ${SUMMARY_TONE_CLASSES[row.tone || "default"]}`}
                  >
                    <div className="text-xs font-medium text-gray-500">{row.label}</div>
                    <div className="mt-1 text-sm font-semibold">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {dataNote ? (
            <div className="px-4 py-3 border-b border-gray-100 bg-indigo-50/60 text-sm text-gray-600">
              {dataNote}
            </div>
          ) : null}

          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length || 1}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap"
                      >
                        {cell ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
