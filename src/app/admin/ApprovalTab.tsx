/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import type {
  ApprovalConfigApprovalStepDraft,
  ApprovalConfigDraft,
  ApprovalConfigNotificationStepDraft,
  ApprovalConfigStepField,
  ApprovalStepDraft,
} from "@/lib/approval-config";
import { REQUEST_TYPES } from "@/lib/constants";
import { WidgetCard } from "@/ui/WidgetCard";
import { StatusBadge } from "@/ui/StatusBadge";

interface ApprovalTabProps {
  approvalConfigs: ApprovalConfigDraft[];
  selectedConfig: ApprovalConfigDraft | null;
  onSelectConfig: (config: ApprovalConfigDraft) => void;
  onUpdateStep: (
    configId: string,
    stepIndex: number,
    field: ApprovalConfigStepField,
    value: string | number | boolean,
  ) => void;
  onAddStep: (configId: string) => void;
  onDeleteStep: (configId: string, stepIndex: number) => void;
  onSaveConfig: (configId: string) => void;
  onAddType: (requestType: string) => void;
  savingConfigId?: string | null;
  saveMessage?: {
    type: "success" | "error";
    text: string;
  } | null;
}

const isApprovalStep = (
  step: ApprovalStepDraft,
): step is ApprovalConfigApprovalStepDraft => step.stepType === "approval";

const isNotificationStep = (
  step: ApprovalStepDraft,
): step is ApprovalConfigNotificationStepDraft => step.stepType === "notification";

const FIELD_CLASS =
  "w-full rounded-field border border-line bg-card px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

export function ApprovalTab({
  approvalConfigs,
  selectedConfig,
  onSelectConfig,
  onUpdateStep,
  onAddStep,
  onDeleteStep,
  onSaveConfig,
  onAddType,
  savingConfigId,
  saveMessage,
}: ApprovalTabProps) {
  const { getAssignableRoles, getRoleLabel } = useRoleCatalog();

  const getRequestTypeLabel = (type: string) => {
    return REQUEST_TYPES[type as keyof typeof REQUEST_TYPES] || type;
  };

  const isSaving = Boolean(selectedConfig && savingConfigId === selectedConfig.id);

  return (
    <div className="flex min-h-[600px] flex-col gap-4 md:flex-row">
      <div className="w-full shrink-0 md:w-64">
        <WidgetCard title="Loại đề nghị">
          <div className="space-y-1.5">
            {approvalConfigs.map((config) => (
              <button
                key={config.id}
                onClick={() => onSelectConfig(config)}
                className={`w-full rounded-field px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  selectedConfig?.id === config.id
                    ? "bg-brand-100 text-brand-700"
                    : "text-ink-900 hover:bg-brand-50"
                }`}
              >
                {getRequestTypeLabel(config.requestType)}
              </button>
            ))}
            <button
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-field border border-dashed border-line px-3 py-2 text-sm font-medium text-ink-400 transition-colors hover:bg-brand-50 hover:text-brand-600"
              onClick={() => onAddType("other")}
            >
              <Plus className="h-4 w-4" />
              Thêm loại mới
            </button>
          </div>
        </WidgetCard>
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        {selectedConfig ? (
          <>
            {saveMessage && (
              <div
                className={`rounded-card border px-4 py-3 text-sm ${
                  saveMessage.type === "success"
                    ? "border-brand-100 bg-brand-50 text-brand-700"
                    : "border-danger-600/20 bg-danger-600/10 text-danger-600"
                }`}
              >
                {saveMessage.text}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink-900">
                Quy trình: {getRequestTypeLabel(selectedConfig.requestType)}
              </h2>
              <div className="flex items-center gap-3">
                {isSaving && <StatusBadge status="info" label="Đang lưu…" />}
                <button
                  disabled={isSaving}
                  className="rounded-field bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => onSaveConfig(selectedConfig.id)}
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>

            <WidgetCard title="Sơ đồ quy trình">
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-line text-center text-sm font-bold leading-tight text-ink-600">
                      Bắt <br /> đầu
                    </div>
                  </div>
                  {selectedConfig.steps.map((step, index) => {
                    const stepLabel = isApprovalStep(step)
                      ? getRoleLabel(step.role)
                      : `Thông báo: ${getRoleLabel(step.recipientRole ?? step.recipientName ?? "recipient")}`;
                    const stepMeta = isApprovalStep(step) ? `${step.sla_hours}h` : "notification";

                    return (
                      <React.Fragment key={step.id ?? index}>
                        <div className="relative h-0.5 w-8 bg-line">
                          <div className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-line" />
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="rounded-field border border-brand-100 bg-card px-4 py-2 text-sm font-medium text-brand-700 shadow-card">
                            {stepLabel}
                          </div>
                          <div className="mt-1 text-xs text-ink-400 [font-variant-numeric:tabular-nums]">
                            {stepMeta}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div className="relative h-0.5 w-8 bg-line">
                    <div className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-line" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-center text-sm font-bold leading-tight text-brand-600">
                      Kết <br /> thúc
                    </div>
                  </div>
                </div>
              </div>
            </WidgetCard>

            <WidgetCard title="Các bước phê duyệt">
              <div className="space-y-4">
                {selectedConfig.steps.map((step, index) => {
                  if (isNotificationStep(step)) {
                    const recipientRoleOptions = getAssignableRoles(step.recipientRole);

                    return (
                      <div
                        key={step.id ?? index}
                        className="flex items-start gap-4 rounded-card border border-warn-600/20 bg-warn-100/40 p-4"
                      >
                        <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warn-100 text-xs font-bold text-warn-600 [font-variant-numeric:tabular-nums]">
                          {index + 1}
                        </div>
                        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-ink-600">
                              Loại bước
                            </label>
                            <select
                              value={step.stepType}
                              className={FIELD_CLASS}
                              onChange={(event) =>
                                onUpdateStep(selectedConfig.id, index, "stepType", event.target.value)
                              }
                            >
                              <option value="approval">Phê duyệt</option>
                              <option value="notification">Thông báo</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-ink-600">
                              Người nhận
                            </label>
                            <select
                              value={step.recipientType}
                              className={FIELD_CLASS}
                              onChange={(event) =>
                                onUpdateStep(selectedConfig.id, index, "recipientType", event.target.value)
                              }
                            >
                              <option value="role">Theo vai trò</option>
                              <option value="user">Người dùng cụ thể</option>
                            </select>
                          </div>
                          {step.recipientType === "role" ? (
                            <div>
                              <label className="mb-1 block text-xs font-medium text-ink-600">
                                Vai trò nhận
                              </label>
                              <select
                                value={step.recipientRole ?? ""}
                                className={FIELD_CLASS}
                                onChange={(event) =>
                                  onUpdateStep(selectedConfig.id, index, "recipientRole", event.target.value)
                                }
                              >
                                {recipientRoleOptions.map((roleOption) => (
                                  <option key={roleOption.roleKey} value={roleOption.roleKey}>
                                    {roleOption.displayName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-ink-600">
                                  ID người nhận
                                </label>
                                <input
                                  value={step.recipientId ?? ""}
                                  className={FIELD_CLASS}
                                  onChange={(event) =>
                                    onUpdateStep(selectedConfig.id, index, "recipientId", event.target.value)
                                  }
                                />
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-medium text-ink-600">
                                  Tên hiển thị
                                </label>
                                <input
                                  value={step.recipientName ?? ""}
                                  className={FIELD_CLASS}
                                  onChange={(event) =>
                                    onUpdateStep(selectedConfig.id, index, "recipientName", event.target.value)
                                  }
                                />
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            className="rounded-field p-1.5 text-ink-400 transition-colors hover:bg-danger-600/10 hover:text-danger-600"
                            onClick={() => onDeleteStep(selectedConfig.id, index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const roleOptions = getAssignableRoles(step.role);

                  return (
                    <div
                      key={step.id ?? index}
                      className="flex items-start gap-4 rounded-card border border-line bg-card p-4"
                    >
                      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-line text-xs font-bold text-ink-600 [font-variant-numeric:tabular-nums]">
                        {index + 1}
                      </div>
                      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-600">
                            Vai trò duyệt
                          </label>
                          <select
                            value={step.role}
                            className={FIELD_CLASS}
                            onChange={(event) =>
                              onUpdateStep(selectedConfig.id, index, "role", event.target.value)
                            }
                          >
                            {roleOptions.map((roleOption) => (
                              <option key={roleOption.roleKey} value={roleOption.roleKey}>
                                {roleOption.displayName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-ink-600">
                            SLA (Giờ)
                          </label>
                          <input
                            type="number"
                            value={step.sla_hours}
                            className={`${FIELD_CLASS} [font-variant-numeric:tabular-nums]`}
                            onChange={(event) =>
                              onUpdateStep(
                                selectedConfig.id,
                                index,
                                "sla_hours",
                                Number(event.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="mt-6 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={step.auto_approve}
                            className="rounded border-line text-brand-600 focus:ring-brand-500"
                            onChange={(event) =>
                              onUpdateStep(
                                selectedConfig.id,
                                index,
                                "auto_approve",
                                event.target.checked,
                              )
                            }
                          />
                          <label className="text-sm text-ink-900">Tự động duyệt</label>
                        </div>
                        <div className="mt-6 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={step.can_escalate}
                            className="rounded border-line text-brand-600 focus:ring-brand-500"
                            onChange={(event) =>
                              onUpdateStep(
                                selectedConfig.id,
                                index,
                                "can_escalate",
                                event.target.checked,
                              )
                            }
                          />
                          <label className="text-sm text-ink-900">Cho phép vượt cấp</label>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          className="rounded-field p-1.5 text-ink-400 transition-colors hover:bg-danger-600/10 hover:text-danger-600"
                          onClick={() => onDeleteStep(selectedConfig.id, index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-line py-3 text-sm font-medium text-ink-600 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600"
                  onClick={() => onAddStep(selectedConfig.id)}
                >
                  <Plus className="h-4 w-4" />
                  Thêm bước duyệt
                </button>
              </div>
            </WidgetCard>
          </>
        ) : (
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center text-ink-400">
            Đang tải cấu hình phê duyệt...
          </div>
        )}
      </div>
    </div>
  );
}
