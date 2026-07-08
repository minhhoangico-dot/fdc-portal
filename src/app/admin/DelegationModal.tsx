import React from "react";
import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import { User } from "@/types/user";
import { StatusBadge } from "@/ui/StatusBadge";

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

const DELEGATION_REQUEST_TYPES: { value: string; label: string }[] = [
  { value: "purchase", label: "Đề nghị mua sắm" },
  { value: "payment", label: "Đề nghị thanh toán" },
  { value: "leave", label: "Đơn xin nghỉ phép" },
  { value: "material_release", label: "Xuất vật tư" },
  { value: "advance", label: "Tạm ứng" },
  { value: "other", label: "Khác" },
];

export function DelegationModal({
  isOpen,
  onClose,
  selectedUser,
  users,
  onSave,
}: DelegationModalProps) {
  const { getRoleLabel } = useRoleCatalog();
  const [delegateId, setDelegateId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [types, setTypes] = React.useState<string[]>([]);
  const [triedSubmit, setTriedSubmit] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setDelegateId("");
      setStartDate("");
      setEndDate("");
      setTypes([]);
      setTriedSubmit(false);
    }
  }, [isOpen, selectedUser?.id]);

  if (!isOpen || !selectedUser) return null;

  const toggleType = (type: string) => {
    setTypes((previous) =>
      previous.includes(type) ? previous.filter((item) => item !== type) : [...previous, type],
    );
  };

  const handleSubmit = async () => {
    if (!delegateId || !startDate || !endDate || types.length === 0) {
      setTriedSubmit(true);
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

  const isInvalid = !delegateId || !startDate || !endDate || types.length === 0;
  const showValidation = triedSubmit && isInvalid;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-95 rounded-card border border-line bg-card p-6 shadow-card duration-200">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-ink-900">
            Ủy quyền duyệt: {selectedUser.name}
          </h2>
          <StatusBadge status="neutral" label={getRoleLabel(selectedUser.role)} />
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-600">
              Người được ủy quyền
            </label>
            <select
              className={`w-full rounded-field bg-card py-2 text-sm text-ink-900 focus:border-brand-500 focus:ring-brand-500 ${
                showValidation && !delegateId ? "border border-danger-600" : "border border-line"
              }`}
              value={delegateId}
              onChange={(event) => setDelegateId(event.target.value)}
            >
              <option value="">Chọn người dùng...</option>
              {users
                .filter((user) => user.id !== selectedUser.id)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({getRoleLabel(user.role)})
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-600">Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={`w-full rounded-field bg-card py-2 text-sm text-ink-900 focus:border-brand-500 focus:ring-brand-500 ${
                  showValidation && !startDate ? "border border-danger-600" : "border border-line"
                }`}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-600">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className={`w-full rounded-field bg-card py-2 text-sm text-ink-900 focus:border-brand-500 focus:ring-brand-500 ${
                  showValidation && !endDate ? "border border-danger-600" : "border border-line"
                }`}
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-ink-600">
              Loại đề nghị ủy quyền
            </label>
            <div
              className={`space-y-2 ${
                showValidation && types.length === 0 ? "rounded-field border border-danger-600/30 p-2" : ""
              }`}
            >
              {DELEGATION_REQUEST_TYPES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={types.includes(value)}
                    onChange={() => toggleType(value)}
                    className="rounded border-line text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-ink-600">{label}</span>
                </label>
              ))}
            </div>
            {showValidation && (
              <p className="text-xs text-danger-600">
                Vui lòng điền đầy đủ và chọn ít nhất một loại đề nghị.
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-field px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-line"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-field bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Lưu ủy quyền
          </button>
        </div>
      </div>
    </>
  );
}
