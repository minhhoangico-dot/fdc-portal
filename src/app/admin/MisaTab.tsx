import React, { useState } from "react";
import { Activity, Edit2, Plus, ShieldAlert } from "lucide-react";
import { MisaKeywordModal } from "./MisaKeywordModal";

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Quản lý từ khóa MISA</h2>
          <p className="text-sm text-gray-500 mt-1">
            Hệ thống sẽ cảnh báo khi phiếu chi có chứa các từ khóa này.
          </p>
        </div>
        <button
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          onClick={() => {
            setEditingKeyword(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Thêm từ khóa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Từ khóa
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  Cảnh báo
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {misaKeywords.map((kw) => (
                <tr key={kw.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {kw.keyword}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {kw.category}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {kw.alertOnMatch ? (
                      <ShieldAlert className="w-4 h-4 text-rose-500 mx-auto" />
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={kw.isActive}
                        onChange={() => onToggleKeywordActive(kw.id)}
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      onClick={() => {
                        setEditingKeyword(kw);
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Kết quả quét gần đây
          </h3>
          <div className="space-y-3">
            {scanResults.map((r) => (
              <div
                key={r.id}
                className="bg-white p-3 rounded-lg border border-rose-100 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                    Cảnh báo
                  </span>
                  <span className="text-xs text-gray-500">
                    {r.syncedAt ? new Date(r.syncedAt).toLocaleString("vi-VN") : ""}
                  </span>
                </div>
                <p className="text-sm text-gray-900 font-medium">{r.docNumber}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {r.description}{" "}
                  {r.matchedKeywords && r.matchedKeywords.length > 0 && (
                    <span className="bg-yellow-200 font-medium px-1 rounded">
                      {r.matchedKeywords.join(", ")}
                    </span>
                  )}
                </p>
              </div>
            ))}
            {scanResults.length === 0 && (
              <div className="text-xs text-gray-500">
                Chưa có kết quả quét gần đây.
              </div>
            )}
          </div>
        </div>
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

