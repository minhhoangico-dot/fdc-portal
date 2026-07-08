/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { RefreshCw, Save } from "lucide-react";
import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import { getVisibleModulesForRole } from "@/lib/navigation";
import { PageHeader } from "@/ui/PageHeader";
import { WidgetCard } from "@/ui/WidgetCard";
import { StatusBadge } from "@/ui/StatusBadge";
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

  const inputClass =
    "w-full rounded-field border border-line bg-card px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
  const fieldLabelClass =
    "mb-1 block text-xs font-medium uppercase tracking-wider text-ink-400";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Danh sách vai trò"
        sub="Chỉ chỉnh metadata hiển thị của 7 vai trò cố định. Ẩn/hiện module vẫn đọc từ permission matrix trong code."
        actions={
          <button
            type="button"
            onClick={() => refreshRoleCatalog()}
            className="inline-flex items-center gap-2 rounded-field border border-line px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-brand-50 hover:text-ink-900"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </button>
        }
      />

      {message && (
        <div
          className={`rounded-card border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-brand-100 bg-brand-50 text-brand-700"
              : "border-danger-600/20 bg-danger-600/10 text-danger-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {isLoading && roleCatalog.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-6 text-sm text-ink-600">
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
              <WidgetCard key={item.roleKey} className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-ink-900">{item.displayName}</h3>
                      <span className="rounded-field bg-line px-2 py-0.5 text-xs font-medium text-ink-600">
                        {item.roleKey}
                      </span>
                      {!draft.isActive && <StatusBadge status="warn" label="Inactive" />}
                    </div>
                    <p className="text-sm text-ink-600">Các module đang được phép:</p>
                    <div className="flex flex-wrap gap-2">
                      {allowedModules.map((module) => (
                        <span
                          key={module.key}
                          className="rounded-field bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
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
                    className="inline-flex items-center gap-2 self-start rounded-field bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingRoleKey === item.roleKey ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-1">
                    <label className={fieldLabelClass}>Display Name</label>
                    <input
                      type="text"
                      value={draft.displayName}
                      onChange={(event) => updateDraft(item.roleKey, "displayName", event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="xl:col-span-2">
                    <label className={fieldLabelClass}>Description</label>
                    <textarea
                      rows={2}
                      value={draft.description}
                      onChange={(event) => updateDraft(item.roleKey, "description", event.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 xl:grid-cols-1">
                    <div>
                      <label className={fieldLabelClass}>Sort Order</label>
                      <input
                        type="number"
                        value={draft.sortOrder}
                        onChange={(event) =>
                          updateDraft(item.roleKey, "sortOrder", Number(event.target.value))
                        }
                        className={`${inputClass} [font-variant-numeric:tabular-nums]`}
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-3 rounded-field border border-line px-3 py-2 text-sm text-ink-600">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={(event) =>
                            updateDraft(item.roleKey, "isActive", event.target.checked)
                          }
                          className="rounded border-line text-brand-600 focus:ring-brand-500"
                        />
                        Active
                      </label>
                    </div>
                  </div>
                </div>
              </WidgetCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
