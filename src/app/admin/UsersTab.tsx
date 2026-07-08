/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Key, Plus, Search, UserCog } from "lucide-react";
import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import { User } from "@/types/user";
import { DataTable, type DataTableColumn } from "@/ui/DataTable";
import { StatusBadge } from "@/ui/StatusBadge";

/**
 * UsersTab — reskin of the admin "Người dùng" table onto `ui/DataTable` +
 * brand tokens (Phase 4a §4 "Quản trị" mapping row).
 *
 * Presentation only: consumes `useAdmin`'s props (`users`, the callbacks) and
 * `useRoleCatalog().getAssignableRoles` verbatim — no query/filter/sort logic
 * added. The active-toggle switch becomes a clickable `StatusBadge` calling
 * the same `onToggleActive` handler; the role `<select>` stays the editable
 * control (a `StatusBadge` cannot host an edit affordance) with tokenized
 * styling.
 */

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

  const columns: DataTableColumn<User>[] = [
    {
      key: "user",
      header: "Người dùng",
      cell: (user) => (
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full bg-line object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
              {user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <div className="font-medium text-ink-900">{user.name}</div>
            <div className="text-xs text-ink-400">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Vai trò",
      cell: (user) => {
        const roleOptions = getAssignableRoles(user.role);
        return (
          <select
            value={user.role}
            onChange={(event) => onRoleChange(user.id, event.target.value)}
            className="rounded-field border border-line bg-card py-1 pl-2 pr-8 text-sm text-ink-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          >
            {roleOptions.map((roleOption) => (
              <option key={roleOption.roleKey} value={roleOption.roleKey}>
                {roleOption.displayName}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: "department",
      header: "Phòng ban",
      cellClassName: "hidden sm:table-cell",
      headerClassName: "hidden sm:table-cell",
      cell: (user) => <span className="text-sm text-ink-600">{user.department || "-"}</span>,
    },
    {
      key: "status",
      header: "Trạng thái",
      align: "center",
      cell: (user) => (
        <button
          type="button"
          onClick={() => onToggleActive(user.id)}
          title={user.isActive ?? true ? "Vô hiệu hóa" : "Kích hoạt"}
        >
          <StatusBadge
            status={user.isActive ?? true ? "ok" : "neutral"}
            label={user.isActive ?? true ? "Hoạt động" : "Vô hiệu"}
          />
        </button>
      ),
    },
    {
      key: "actions",
      header: "Thao tác",
      align: "right",
      cell: (user) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onResetPassword(user.id)}
            className="rounded-field p-1.5 text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
            title="Reset mật khẩu"
          >
            <Key className="h-4 w-4" />
          </button>
          <button
            onClick={() => onOpenDelegation(user)}
            className="rounded-field p-1.5 text-ink-400 transition-colors hover:bg-warn-100 hover:text-warn-600"
            title="Ủy quyền"
          >
            <UserCog className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col justify-between gap-4 border-b border-line p-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-field border border-transparent bg-paper py-2 pl-9 pr-4 text-sm text-ink-900 focus:border-brand-600 focus:bg-card focus:outline-none focus:ring-2 focus:ring-brand-600/20"
          />
        </div>
        <button
          onClick={onOpenAddUser}
          className="flex items-center justify-center gap-2 rounded-field bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Thêm người dùng
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <DataTable
          columns={columns}
          rows={users}
          rowKey={(user) => user.id}
          emptyLabel="Không tìm thấy người dùng nào phù hợp."
        />
      </div>
    </div>
  );
}
