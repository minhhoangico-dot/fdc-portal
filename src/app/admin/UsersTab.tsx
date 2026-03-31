import React from "react";
import { Key, Plus, Search, UserCog } from "lucide-react";
import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import { User } from "@/types/user";

interface UsersTabProps {
  users: User[];
  onRoleChange: (userId: string, role: string) => void;
  onResetPassword: (userId: string) => void;
  onOpenAddUser: () => void;
  onOpenDelegation: (user: User) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onToggleActive: (userId: string) => void;
}

export function UsersTab({
  users,
  onRoleChange,
  onResetPassword,
  onOpenAddUser,
  onOpenDelegation,
  search,
  onSearchChange,
  onToggleActive,
}: UsersTabProps) {
  const { getAssignableRoles } = useRoleCatalog();

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-lg border-transparent bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <button
          onClick={onOpenAddUser}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Thêm người dùng
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Người dùng
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
                Vai trò
              </th>
              <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                Phòng ban
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const roleOptions = getAssignableRoles(user.role);

              return (
                <tr key={user.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          className="h-8 w-8 rounded-full bg-gray-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600">
                          {user.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(event) => onRoleChange(user.id, event.target.value)}
                      className="rounded-md border border-gray-200 py-1 pl-2 pr-8 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {roleOptions.map((roleOption) => (
                        <option key={roleOption.roleKey} value={roleOption.roleKey}>
                          {roleOption.displayName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-sm text-gray-600">{user.department || "-"}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={user.isActive ?? true}
                        onChange={() => onToggleActive(user.id)}
                      />
                      <div className="peer h-5 w-9 rounded-full bg-gray-200 peer-focus:outline-none peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-['']" />
                    </label>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onResetPassword(user.id)}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        title="Reset mật khẩu"
                      >
                        <Key className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onOpenDelegation(user)}
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                        title="Ủy quyền"
                      >
                        <UserCog className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
