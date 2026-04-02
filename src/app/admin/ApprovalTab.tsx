import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRoleCatalog } from "@/contexts/RoleCatalogContext";
import type {
  ApprovalConfigDraft,
  ApprovalConfigStepField,
} from "@/lib/approval-config";
import { REQUEST_TYPES } from "@/lib/constants";

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

  return (
    <div className="flex h-full min-h-[600px] flex-col md:flex-row">
      <div className="w-full space-y-2 border-b border-gray-200 bg-gray-50/50 p-4 md:w-64 md:border-b-0 md:border-r">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          Loại đề nghị
        </h3>
        {approvalConfigs.map((config) => (
          <button
            key={config.id}
            onClick={() => onSelectConfig(config)}
            className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              selectedConfig?.id === config.id
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {getRequestTypeLabel(config.requestType)}
          </button>
        ))}
        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          onClick={() => onAddType("other")}
        >
          <Plus className="h-4 w-4" />
          Thêm loại mới
        </button>
      </div>

      <div className="flex-1 p-6">
        {selectedConfig ? (
          <>
            {saveMessage && (
              <div
                className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
                  saveMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {saveMessage.text}
              </div>
            )}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Quy trình: {getRequestTypeLabel(selectedConfig.requestType)}
              </h2>
              <button
                disabled={savingConfigId === selectedConfig.id}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onSaveConfig(selectedConfig.id)}
              >
                Lưu thay đổi
              </button>
            </div>

            <div className="mb-8 overflow-x-auto rounded-xl border border-gray-100 bg-gray-50 p-6">
              <h3 className="mb-4 text-sm font-medium text-gray-500">Sơ đồ quy trình</h3>
              <div className="flex min-w-max items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-center text-sm font-bold leading-tight text-gray-600 shadow-sm">
                    Bắt <br /> đầu
                  </div>
                </div>
                {selectedConfig.steps.map((step, index) => (
                  <React.Fragment key={step.id ?? index}>
                    <div className="relative h-0.5 w-8 bg-gray-300">
                      <div className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-gray-300" />
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
                        {getRoleLabel(step.role)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{step.sla_hours}h</div>
                    </div>
                  </React.Fragment>
                ))}
                <div className="relative h-0.5 w-8 bg-gray-300">
                  <div className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-gray-300" />
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-center text-sm font-bold leading-tight text-emerald-600 shadow-sm">
                    Kết <br /> thúc
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Các bước phê duyệt</h3>
              {selectedConfig.steps.map((step, index) => {
                const roleOptions = getAssignableRoles(step.role);

                return (
                  <div
                    key={step.id ?? index}
                    className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                      {index + 1}
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                          Vai trò duyệt
                        </label>
                        <select
                          value={step.role}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                        <label className="mb-1 block text-xs font-medium text-gray-500">
                          SLA (Giờ)
                        </label>
                        <input
                          type="number"
                          value={step.sla_hours}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          onChange={(event) =>
                            onUpdateStep(
                              selectedConfig.id,
                              index,
                              "auto_approve",
                              event.target.checked,
                            )
                          }
                        />
                        <label className="text-sm text-gray-700">Tự động duyệt</label>
                      </div>
                      <div className="mt-6 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={step.can_escalate}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          onChange={(event) =>
                            onUpdateStep(
                              selectedConfig.id,
                              index,
                              "can_escalate",
                              event.target.checked,
                            )
                          }
                        />
                        <label className="text-sm text-gray-700">Cho phép vượt cấp</label>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => onDeleteStep(selectedConfig.id, index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                onClick={() => onAddStep(selectedConfig.id)}
              >
                <Plus className="h-4 w-4" />
                Thêm bước duyệt
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
            Đang tải cấu hình phê duyệt...
          </div>
        )}
      </div>
    </div>
  );
}
