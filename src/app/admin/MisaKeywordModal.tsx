import React, { useState, useEffect } from "react";

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

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {initialValue ? "Sửa từ khóa" : "Thêm từ khóa"}
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Từ khóa
            </label>
            <input
              type="text"
              required
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Danh mục
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-200 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={alertOnMatch}
                onChange={(e) => setAlertOnMatch(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">
                Cảnh báo khi trùng từ khóa
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Kích hoạt</span>
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

