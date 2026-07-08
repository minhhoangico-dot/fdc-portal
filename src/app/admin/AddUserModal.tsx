import React, { useState } from "react";
import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import { Role } from "@/types/user";
import { HikvisionValidationResult } from "@/viewmodels/hikvision";
import { StatusBadge } from "@/ui/StatusBadge";

const FIELD_CLASS =
  "w-full rounded-field border border-line bg-card px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:ring-brand-500";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    email: string;
    department?: string;
    role: Role;
    hikvisionEmployeeId?: string;
  }) => Promise<void> | void;
  onValidateHikvisionId?: (employeeId: string) => Promise<HikvisionValidationResult>;
}

export function AddUserModal({
  isOpen,
  onClose,
  onSubmit,
  onValidateHikvisionId,
}: AddUserModalProps) {
  const { getAssignableRoles } = useRoleCatalog();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<Role>("clinic_staff");
  const [hikvisionEmployeeId, setHikvisionEmployeeId] = useState("");
  const [isCheckingHik, setIsCheckingHik] = useState(false);
  const [hikStatus, setHikStatus] = useState<string | null>(null);
  const roleOptions = getAssignableRoles(role);

  React.useEffect(() => {
    if (!roleOptions.some((roleOption) => roleOption.roleKey === role) && roleOptions[0]) {
      setRole(roleOptions[0].roleKey);
    }
  }, [role, roleOptions]);

  if (!isOpen) return null;

  const handleCheckHikvision = async () => {
    if (!onValidateHikvisionId) {
      setHikStatus("Chức năng kiểm tra sẽ được cấu hình sau.");
      return;
    }

    setIsCheckingHik(true);
    setHikStatus(null);

    const result = await onValidateHikvisionId(hikvisionEmployeeId);
    if (result.ok) {
      const nameText = result.name ? ` (${result.name})` : "";
      setHikStatus(`Tìm thấy trên máy chấm công${nameText}.`);
    } else {
      setHikStatus(result.message || "Không tìm thấy mã này trong máy chấm công.");
    }

    setIsCheckingHik(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    await onSubmit({
      name: name.trim(),
      email: email.trim(),
      department: department.trim() || undefined,
      role,
      hikvisionEmployeeId: hikvisionEmployeeId.trim() || undefined,
    });

    setName("");
    setEmail("");
    setDepartment("");
    setRole("clinic_staff");
    setHikvisionEmployeeId("");
    setHikStatus(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-line bg-card p-6 shadow-card">
        <h2 className="mb-4 text-lg font-bold text-ink-900">Thêm người dùng mới</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-600">Họ và tên</label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-600">
              Email đăng nhập
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={FIELD_CLASS}
            />
            <p className="mt-1 text-xs text-ink-400">
              Email là bắt buộc để tạo Supabase Auth user.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-600">Phòng ban</label>
            <input
              type="text"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-600">
              Mã nhân viên máy chấm công
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hikvisionEmployeeId}
                onChange={(event) => setHikvisionEmployeeId(event.target.value)}
                className={`flex-1 ${FIELD_CLASS}`}
                maxLength={64}
              />
              <button
                type="button"
                onClick={handleCheckHikvision}
                disabled={isCheckingHik || !hikvisionEmployeeId.trim()}
                className="rounded-field border border-line px-3 py-2 text-xs font-medium text-brand-600 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCheckingHik ? "Đang kiểm tra..." : "Kiểm tra"}
              </button>
            </div>
            {hikStatus && (
              <div className="mt-2">
                <StatusBadge status="info" label={hikStatus} />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-600">Vai trò</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className={FIELD_CLASS}
            >
              {roleOptions.map((roleOption) => (
                <option key={roleOption.roleKey} value={roleOption.roleKey}>
                  {roleOption.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-field px-4 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-line"
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
