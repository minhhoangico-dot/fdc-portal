import React from "react";
import { RefreshCw, Save } from "lucide-react";
import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import { getVisibleModulesForRole } from "@/lib/navigation";
import type { RoleCatalogItem } from "@/types/roleCatalog";
import type { Role } from "@/types/user";

type RoleDraft = Pick<RoleCatalogItem, "displayName" | "description" | "sortOrder" | "isActive">;

function toDraft(item: RoleCatalogItem): RoleDraft {
  return {
    displayName: item.displayName,
    description: item.description,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
  };
}

function normalizeDraft(draft: RoleDraft): RoleDraft {
  return {
    displayName: draft.displayName.trim(),
    description: draft.description.trim(),
    sortOrder: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
    isActive: draft.isActive,
  };
}

export function RolesTab() {
  const { roleCatalog, isLoading, refreshRoleCatalog, saveRoleCatalogItem } = useRoleCatalog();
  const [drafts, setDrafts] = React.useState<Record<Role, RoleDraft>>({} as Record<Role, RoleDraft>);
  const [savingRoleKey, setSavingRoleKey] = React.useState<Role | null>(null);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  React.useEffect(() => {
    setDrafts(
      roleCatalog.reduce(
        (accumulator, item) => {
          accumulator[item.roleKey] = toDraft(item);
          return accumulator;
        },
        {} as Record<Role, RoleDraft>,
      ),
    );
  }, [roleCatalog]);

  const updateDraft = <K extends keyof RoleDraft>(
    roleKey: Role,
    field: K,
    value: RoleDraft[K],
  ) => {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [roleKey]: {
        ...currentDrafts[roleKey],
        [field]: value,
      },
    }));
  };

  const handleSave = async (roleKey: Role) => {
    const draft = drafts[roleKey];
    if (!draft) return;

    setSavingRoleKey(roleKey);
    setMessage(null);

    try {
      const normalizedDraft = normalizeDraft(draft);
      if (!normalizedDraft.displayName) {
        setMessage({
          type: "error",
          text: "Display name không được để trống.",
        });
        return;
      }
      await saveRoleCatalogItem(roleKey, normalizedDraft);
      setMessage({
        type: "success",
        text: `Đã lưu metadata cho vai trò ${normalizedDraft.displayName}.`,
      });
    } catch (error) {
      console.error("Failed to save role catalog item:", error);
      setMessage({
        type: "error",
        text: "Không thể lưu metadata vai trò. Kiểm tra migration hoặc quyền RLS.",
      });
    } finally {
      setSavingRoleKey(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Danh sách vai trò</h2>
          <p className="text-sm text-gray-500">
            Chỉ chỉnh metadata hiển thị của 7 vai trò cố định. Ẩn/hiện module vẫn đọc từ permission matrix trong code.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshRoleCatalog()}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Tải lại
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {isLoading && roleCatalog.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Đang tải vai trò từ Supabase...
        </div>
      ) : (
        <div className="space-y-4">
          {roleCatalog.map((item) => {
            const draft = drafts[item.roleKey] ?? toDraft(item);
            const normalizedDraft = normalizeDraft(draft);
            const hasChanges =
              normalizedDraft.displayName !== item.displayName ||
              normalizedDraft.description !== item.description ||
              normalizedDraft.sortOrder !== item.sortOrder ||
              normalizedDraft.isActive !== item.isActive;
            const allowedModules = getVisibleModulesForRole(item.roleKey);

            return (
              <div
                key={item.roleKey}
                className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">{item.displayName}</h3>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {item.roleKey}
                      </span>
                      {!draft.isActive && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Các module đang được phép:</p>
                    <div className="flex flex-wrap gap-2">
                      {allowedModules.map((module) => (
                        <span
                          key={module.key}
                          className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                        >
                          {module.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave(item.roleKey)}
                    disabled={!hasChanges || savingRoleKey === item.roleKey}
                    className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingRoleKey === item.roleKey ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-1">
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={draft.displayName}
                      onChange={(event) => updateDraft(item.roleKey, "displayName", event.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={draft.description}
                      onChange={(event) => updateDraft(item.roleKey, "description", event.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 xl:grid-cols-1">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                        Sort Order
                      </label>
                      <input
                        type="number"
                        value={draft.sortOrder}
                        onChange={(event) =>
                          updateDraft(item.roleKey, "sortOrder", Number(event.target.value))
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(event) =>
                            updateDraft(item.roleKey, "isActive", event.target.checked)
                          }
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Active
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
