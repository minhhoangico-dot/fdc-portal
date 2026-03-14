import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { ROLES } from "@/lib/constants";

interface ApprovalStep {
  id: string;
  role: string;
  sla_hours?: number;
  slaHours?: number;
  auto_approve?: boolean;
  autoApprove?: boolean;
  can_escalate?: boolean;
  canEscalate?: boolean;
}

interface ApprovalConfig {
  id: string;
  requestType: string;
  steps: ApprovalStep[];
}

interface ApprovalTabProps {
  approvalConfigs: ApprovalConfig[];
  selectedConfig: ApprovalConfig | null;
  onSelectConfig: (config: ApprovalConfig) => void;
  onUpdateStep: (
    configId: string,
    stepIndex: number,
    field: "role" | "sla_hours" | "auto_approve" | "can_escalate",
    value: any,
  ) => void;
  onAddStep: (configId: string) => void;
  onDeleteStep: (configId: string, stepIndex: number) => void;
  onSaveConfig: (configId: string) => void;
  onAddType: (requestType: string) => void;
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
}: ApprovalTabProps) {
  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "purchase":
        return "Đề nghị mua sắm";
      case "leave":
        return "Đơn xin nghỉ phép";
      case "payment":
        return "Đề nghị thanh toán";
      case "material_release":
        return "Xuất vật tư";
      case "advance":
        return "Tạm ứng";
      case "other":
        return "Khác";
      default:
        return type;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[600px]">
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-50/50 p-4 space-y-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Loại đề nghị
        </h3>
        {approvalConfigs.map((config) => (
          <button
            key={config.id}
            onClick={() => onSelectConfig(config)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              selectedConfig?.id === config.id
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {getRequestTypeLabel(config.requestType)}
          </button>
        ))}
        <button
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors mt-4"
          onClick={() => onAddType("other")}
        >
          <Plus className="w-4 h-4" />
          Thêm loại mới
        </button>
      </div>

      <div className="flex-1 p-6">
        {selectedConfig ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">
                Quy trình: {getRequestTypeLabel(selectedConfig.requestType)}
              </h2>
              <button
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                onClick={() => onSaveConfig(selectedConfig.id)}
              >
                Lưu thay đổi
              </button>
            </div>

            <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100 overflow-x-auto">
              <h3 className="text-sm font-medium text-gray-500 mb-4">
                Sơ đồ quy trình
              </h3>
              <div className="flex items-center gap-2 min-w-max">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm shadow-sm text-center leading-tight">
                    Bắt <br /> đầu
                  </div>
                </div>
                {selectedConfig.steps.map((step, idx) => (
                  <React.Fragment key={step.id ?? idx}>
                    <div className="w-8 h-0.5 bg-gray-300 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 border-t-2 border-r-2 border-gray-300 rotate-45"></div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="px-4 py-2 bg-white border border-indigo-200 rounded-lg shadow-sm text-sm font-medium text-indigo-700">
                        {ROLES[step.role as keyof typeof ROLES] || step.role}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {step.sla_hours || step.slaHours}h
                      </div>
                    </div>
                  </React.Fragment>
                ))}
                <div className="w-8 h-0.5 bg-gray-300 relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 border-t-2 border-r-2 border-gray-300 rotate-45"></div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm shadow-sm text-center leading-tight">
                    Kết <br /> thúc
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">
                Các bước phê duyệt
              </h3>
              {selectedConfig.steps.map((step, index) => (
                <div
                  key={step.id ?? index}
                  className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
                >
                  <div className="mt-1 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Vai trò duyệt
                      </label>
                      <select
                        value={step.role}
                        className="w-full text-sm rounded-lg border border-gray-200 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) =>
                          onUpdateStep(selectedConfig.id, index, "role", e.target.value)
                        }
                      >
                        {Object.entries(ROLES).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        SLA (Giờ)
                      </label>
                      <input
                        type="number"
                        value={step.sla_hours || step.slaHours}
                        className="w-full text-sm rounded-lg border border-gray-200 py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500"
                        onChange={(e) =>
                          onUpdateStep(
                            selectedConfig.id,
                            index,
                            "sla_hours",
                            Number(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        checked={step.auto_approve ?? step.autoApprove}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        onChange={(e) =>
                          onUpdateStep(
                            selectedConfig.id,
                            index,
                            "auto_approve",
                            e.target.checked,
                          )
                        }
                      />
                      <label className="text-sm text-gray-700">Tự động duyệt</label>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <input
                        type="checkbox"
                        checked={step.can_escalate ?? step.canEscalate}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        onChange={(e) =>
                          onUpdateStep(
                            selectedConfig.id,
                            index,
                            "can_escalate",
                            e.target.checked,
                          )
                        }
                      />
                      <label className="text-sm text-gray-700">
                        Cho phép vượt cấp
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      onClick={() => onDeleteStep(selectedConfig.id, index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                onClick={() => onAddStep(selectedConfig.id)}
              >
                <Plus className="w-4 h-4" />
                Thêm bước duyệt
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            Đang tải cấu hình phê duyệt...
          </div>
        )}
      </div>
    </div>
  );
}

