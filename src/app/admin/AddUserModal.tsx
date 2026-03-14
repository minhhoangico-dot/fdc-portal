import React, { useState } from "react";
import { ROLES } from "@/lib/constants";
import { Role } from "@/types/user";
import { HikvisionValidationResult } from "@/viewmodels/hikvision";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    email?: string;
    department?: string;
    role: Role;
    hikvisionEmployeeId?: string;
  }) => Promise<void> | void;
  onValidateHikvisionId?: (employeeId: string) => Promise<HikvisionValidationResult>;
}

export function AddUserModal({ isOpen, onClose, onSubmit, onValidateHikvisionId }: AddUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [hikvisionEmployeeId, setHikvisionEmployeeId] = useState("");
  const [isCheckingHik, setIsCheckingHik] = useState(false);
  const [hikStatus, setHikStatus] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name: name.trim(),
      email: email.trim() || undefined,
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
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Thêm người dùng mới
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ và tên
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-200 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-200 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phòng ban
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-200 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã nhân viên máy chấm công
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={hikvisionEmployeeId}
                onChange={(e) => setHikvisionEmployeeId(e.target.value)}
                className="flex-1 text-sm rounded-lg border-gray-200 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                maxLength={64}
              />
              <button
                type="button"
                onClick={handleCheckHikvision}
                disabled={isCheckingHik || !hikvisionEmployeeId.trim()}
                className="px-3 py-2 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingHik ? "Đang kiểm tra..." : "Kiểm tra"}
              </button>
            </div>
            {hikStatus && (
              <p className="mt-1 text-xs text-gray-600">
                {hikStatus}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vai trò
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full text-sm rounded-lg border-gray-200 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Object.entries(ROLES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
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

