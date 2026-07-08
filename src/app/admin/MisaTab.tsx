/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Activity, Edit2, Plus, ShieldAlert } from "lucide-react";
import { MisaKeywordModal } from "./MisaKeywordModal";
import { WidgetCard } from "@/ui/WidgetCard";
import { DataTable, type DataTableColumn } from "@/ui/DataTable";
import { StatusBadge } from "@/ui/StatusBadge";

/**
 * MisaTab — reskin of the MISA keyword manager + recent-scan panel onto
 * `ui/WidgetCard` + `ui/DataTable` + brand tokens (Phase 4a §4 "Quản trị"
 * mapping row). Presentation only: consumes `useAdmin`'s props
 * (`misaKeywords`, `scanResults`, callbacks) verbatim; the active-toggle
 * switch becomes a clickable `StatusBadge` calling the same
 * `onToggleKeywordActive` handler.
 */

interface MisaKeyword {
  id: string;
  keyword: string;
  category: string;
  alertOnMatch: boolean;
  isActive: boolean;
}

interface MisaTabProps {
  misaKeywords: MisaKeyword[];
  onToggleKeywordActive: (id: string) => void;
  onAddKeyword: (payload: { keyword: string; category?: string; alertOnMatch: boolean }) => Promise<void> | void;
  onEditKeyword: (
    id: string,
    payload: { keyword: string; category?: string; alertOnMatch: boolean; isActive: boolean },
  ) => Promise<void> | void;
  scanResults: {
    id: string;
    docNumber: string;
    docDate: string;
    amount: number;
    description: string;
    matchedKeywords: string[];
    category: string;
    syncedAt: string;
  }[];
}

export function MisaTab({
  misaKeywords,
  onToggleKeywordActive,
  onAddKeyword,
  onEditKeyword,
  scanResults,
}: MisaTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<MisaKeyword | null>(null);

  const columns: DataTableColumn<MisaKeyword>[] = [
    {
      key: "keyword",
      header: "Từ khóa",
      cell: (kw) => <span className="font-medium text-ink-900">{kw.keyword}</span>,
    },
    {
      key: "category",
      header: "Danh mục",
      cell: (kw) => <span className="text-ink-600">{kw.category}</span>,
    },
    {
      key: "alertOnMatch",
      header: "Cảnh báo",
      align: "center",
      cell: (kw) =>
        kw.alertOnMatch ? (
          <ShieldAlert className="mx-auto h-4 w-4 text-danger-600" />
        ) : (
          <span className="text-ink-400">-</span>
        ),
    },
    {
      key: "isActive",
      header: "Trạng thái",
      align: "center",
      cell: (kw) => (
        <button type="button" onClick={() => onToggleKeywordActive(kw.id)}>
          <StatusBadge
            status={kw.isActive ? "ok" : "neutral"}
            label={kw.isActive ? "Hoạt động" : "Vô hiệu"}
          />
        </button>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "right",
      cell: (kw) => (
        <button
          className="rounded-field p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
          onClick={() => {
            setEditingKeyword(kw);
            setIsModalOpen(true);
          }}
        >
          <Edit2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Quản lý từ khóa MISA</h2>
          <p className="mt-1 text-sm text-ink-600">
            Hệ thống sẽ cảnh báo khi phiếu chi có chứa các từ khóa này.
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          onClick={() => {
            setEditingKeyword(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Thêm từ khóa
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            rows={misaKeywords}
            rowKey={(kw) => kw.id}
            emptyLabel="Chưa có từ khóa nào."
          />
        </div>

        <WidgetCard
          title="Kết quả quét gần đây"
          actions={<Activity className="h-4 w-4 text-brand-600" />}
        >
          <div className="space-y-3">
            {scanResults.map((r) => (
              <div
                key={r.id}
                className="rounded-field border border-danger-600/20 bg-card p-3 shadow-card"
              >
                <div className="mb-1 flex items-center justify-between">
                  <StatusBadge status="danger" label="Cảnh báo" />
                  <span className="text-xs text-ink-400">
                    {r.syncedAt ? new Date(r.syncedAt).toLocaleString("vi-VN") : ""}
                  </span>
                </div>
                <p className="text-sm font-medium text-ink-900">{r.docNumber}</p>
                <p className="mt-1 text-xs text-ink-600">
                  {r.description}{" "}
                  {r.matchedKeywords && r.matchedKeywords.length > 0 && (
                    <span className="rounded bg-warn-100 px-1 font-medium text-warn-600">
                      {r.matchedKeywords.join(", ")}
                    </span>
                  )}
                </p>
              </div>
            ))}
            {scanResults.length === 0 && (
              <div className="text-xs text-ink-400">Chưa có kết quả quét gần đây.</div>
            )}
          </div>
        </WidgetCard>
      </div>

      <MisaKeywordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialValue={
          editingKeyword
            ? {
                keyword: editingKeyword.keyword,
                category: editingKeyword.category,
                alertOnMatch: editingKeyword.alertOnMatch,
                isActive: editingKeyword.isActive,
              }
            : undefined
        }
        onSubmit={async (value) => {
          if (editingKeyword) {
            await onEditKeyword(editingKeyword.id, value);
          } else {
            await onAddKeyword(value);
          }
        }}
      />
    </div>
  );
}
