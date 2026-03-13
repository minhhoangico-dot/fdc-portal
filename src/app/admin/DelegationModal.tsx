import React from "react";
import { ROLES } from "@/lib/constants";
import { User } from "@/types/user";

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser: User | null;
  users: User[];
  onSave: (payload: {
    delegatorId: string;
    delegateId: string;
    requestTypes: string[];
    startDate: string;
    endDate: string;
  }) => Promise<void> | void;
}

export function DelegationModal({
  isOpen,
  onClose,
  selectedUser,
  users,
  onSave,
}: DelegationModalProps) {
  const [delegateId, setDelegateId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [types, setTypes] = React.useState<string[]>([]);

  if (!isOpen || !selectedUser) return null;

  const toggleType = (t: string) => {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const handleSubmit = async () => {
    if (!delegateId || !startDate || !endDate || types.length === 0) {
      onClose();
      return;
    }
    await onSave({
      delegatorId: selectedUser.id,
      delegateId,
      requestTypes: types,
      startDate,
      endDate,
    });
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 p-6 animate-in zoom-in-95 duration-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Ủy quyền duyệt: {selectedUser.name}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Người được ủy quyền
            </label>
            <select
              className="w-full text-sm rounded-lg border-gray-200 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={delegateId}
              onChange={(e) => setDelegateId(e.target.value)}
            >
              <option value="">Chọn người dùng...</option>
              {users
                .filter((u) => u.id !== selectedUser.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({ROLES[u.role]})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm rounded-lg border-gray-200 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại đề nghị ủy quyền
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={types.includes("purchase")}
                  onChange={() => toggleType("purchase")}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Đề nghị mua sắm</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={types.includes("payment")}
                  onChange={() => toggleType("payment")}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  Đề nghị thanh toán
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={types.includes("leave")}
                  onChange={() => toggleType("leave")}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Đơn xin nghỉ phép</span>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Lưu ủy quyền
          </button>
        </div>
      </div>
    </>
  );
}

