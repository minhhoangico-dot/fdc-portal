/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

/**
 * MisaKeywordModal — reskin of the MISA keyword add/edit dialog onto brand
 * tokens (Phase 4a §4 "Quản trị" mapping row). Presentation only: same form
 * state, same `onSubmit` payload shape, same open/close behavior.
 */

interface MisaKeywordForm {
  keyword: string;
  category?: string;
  alertOnMatch: boolean;
  isActive: boolean;
}

interface MisaKeywordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: MisaKeywordForm;
  onSubmit: (value: MisaKeywordForm) => Promise<void> | void;
}

export function MisaKeywordModal({
  isOpen,
  onClose,
  initialValue,
  onSubmit,
}: MisaKeywordModalProps) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [alertOnMatch, setAlertOnMatch] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialValue) {
      setKeyword(initialValue.keyword);
      setCategory(initialValue.category ?? "");
      setAlertOnMatch(initialValue.alertOnMatch);
      setIsActive(initialValue.isActive ?? true);
    } else {
      setKeyword("");
      setCategory("");
      setAlertOnMatch(true);
      setIsActive(true);
    }
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      keyword: keyword.trim(),
      category: category.trim() || undefined,
      alertOnMatch,
      isActive,
    });
    onClose();
  };

  const inputClass =
    "w-full rounded-field border border-line bg-card px-3 py-2 text-sm text-ink-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink-900/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-card p-6 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-ink-900">
          {initialValue ? "Sửa từ khóa" : "Thêm từ khóa"}
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-600">Từ khóa</label>
            <input
              type="text"
              required
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-600">Danh mục</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={alertOnMatch}
                onChange={(e) => setAlertOnMatch(e.target.checked)}
                className="rounded border-line text-brand-600 focus:ring-brand-600"
              />
              <span className="text-sm text-ink-600">Cảnh báo khi trùng từ khóa</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-line text-brand-600 focus:ring-brand-600"
              />
              <span className="text-sm text-ink-600">Kích hoạt</span>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-field px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-paper"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-field bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
