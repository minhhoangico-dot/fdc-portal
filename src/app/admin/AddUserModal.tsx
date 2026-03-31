import React, { useState } from "react";
import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import { Role } from "@/types/user";
import { HikvisionValidationResult } from "@/viewmodels/hikvision";

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
  const [role, setRole] = useState<Role>("staff");
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
    setRole("staff");
    setHikvisionEmployeeId("");
    setHikStatus(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Thêm người dùng mới</h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Họ và tên</label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email đăng nhập
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email là bắt buộc để tạo Supabase Auth user.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phòng ban</label>
            <input
              type="text"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mã nhân viên máy chấm công
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hikvisionEmployeeId}
                onChange={(event) => setHikvisionEmployeeId(event.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                maxLength={64}
              />
              <button
                type="button"
                onClick={handleCheckHikvision}
                disabled={isCheckingHik || !hikvisionEmployeeId.trim()}
                className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCheckingHik ? "Đang kiểm tra..." : "Kiểm tra"}
              </button>
            </div>
            {hikStatus && <p className="mt-1 text-xs text-gray-600">{hikStatus}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Vai trò</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
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
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
