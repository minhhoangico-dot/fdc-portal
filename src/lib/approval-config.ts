/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ApprovalConfigStepField =
  | "stepType"
  | "role"
  | "sla_hours"
  | "auto_approve"
  | "can_escalate"
  | "recipientType"
  | "recipientRole"
  | "recipientId"
  | "recipientName";

export interface ApprovalConfigApprovalStepDraft {
  id: string;
  stepType: "approval";
  role: string;
  sla_hours: number;
  auto_approve: boolean;
  can_escalate: boolean;
}

export interface ApprovalConfigNotificationStepDraft {
  id: string;
  stepType: "notification";
  recipientType: "role" | "user";
  recipientRole?: string;
  recipientId?: string;
  recipientName?: string;
}

export type ApprovalStepDraft =
  | ApprovalConfigApprovalStepDraft
  | ApprovalConfigNotificationStepDraft;

export type ApprovalConfigStepType = ApprovalStepDraft["stepType"];

export interface ApprovalConfigDraft {
  id: string;
  requestType: string;
  name: string;
  isActive: boolean;
  steps: ApprovalStepDraft[];
}

interface ApprovalStepInput {
  id?: string;
  step_type?: string;
  stepType?: string;
  role?: string;
  approver_role?: string;
  approverRole?: string;
  sla_hours?: number;
  slaHours?: number;
  auto_approve?: boolean;
  autoApprove?: boolean;
  can_escalate?: boolean;
  canEscalate?: boolean;
  recipient_type?: string;
  recipientType?: string;
  recipient_role?: string;
  recipientRole?: string;
  recipient_id?: string;
  recipientId?: string;
  recipient_name?: string;
  recipientName?: string;
}

interface ApprovalConfigInput {
  id: string;
  requestType?: string;
  request_type?: string;
  name?: string;
  isActive?: boolean;
  is_active?: boolean;
  steps?: ApprovalStepInput[];
}

const DEFAULT_STEP_ROLE = "business_head";
const DEFAULT_STEP_SLA_HOURS = 24;
const DEFAULT_NOTIFICATION_RECIPIENT_ROLE = "director";

function toFiniteNumber(value: unknown, fallback: number): number {
  const nextValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
}

function createDefaultApprovalStep(id: string): ApprovalConfigApprovalStepDraft {
  return {
    id,
    stepType: "approval",
    role: DEFAULT_STEP_ROLE,
    sla_hours: DEFAULT_STEP_SLA_HOURS,
    auto_approve: false,
    can_escalate: false,
  };
}

function createDefaultNotificationStep(
  id: string,
): ApprovalConfigNotificationStepDraft {
  return {
    id,
    stepType: "notification",
    recipientType: "role",
    recipientRole: DEFAULT_NOTIFICATION_RECIPIENT_ROLE,
  };
}

function createDefaultStep(
  id: string,
  stepType: ApprovalConfigStepType,
): ApprovalStepDraft {
  return stepType === "notification"
    ? createDefaultNotificationStep(id)
    : createDefaultApprovalStep(id);
}

function normalizeApprovalStep(step: ApprovalStepInput, index: number): ApprovalStepDraft {
  const id =
    typeof step.id === "string" && step.id.trim()
      ? step.id
      : `approval-step-${index + 1}`;
  const stepType = step.step_type ?? step.stepType ?? "approval";

  if (stepType === "notification") {
    const recipientType =
      step.recipient_type === "user" || step.recipientType === "user"
        ? "user"
        : "role";

    return {
      ...createDefaultNotificationStep(id),
      recipientType,
      recipientRole: step.recipient_role ?? step.recipientRole ?? undefined,
      recipientId: step.recipient_id ?? step.recipientId ?? undefined,
      recipientName: step.recipient_name ?? step.recipientName ?? undefined,
    };
  }

  return {
    ...createDefaultApprovalStep(id),
    role: step.role ?? step.approver_role ?? step.approverRole ?? DEFAULT_STEP_ROLE,
    sla_hours: toFiniteNumber(step.sla_hours ?? step.slaHours, DEFAULT_STEP_SLA_HOURS),
    auto_approve: Boolean(step.auto_approve ?? step.autoApprove ?? false),
    can_escalate: Boolean(step.can_escalate ?? step.canEscalate ?? false),
  };
}

export function normalizeApprovalConfig(
  config: ApprovalConfigInput,
): ApprovalConfigDraft {
  return {
    id: config.id,
    requestType: config.requestType ?? config.request_type ?? "other",
    name: config.name ?? "Quy trinh moi",
    isActive: config.isActive ?? config.is_active ?? true,
    steps: Array.isArray(config.steps)
      ? config.steps.map((step, index) => normalizeApprovalStep(step, index))
      : [],
  };
}

export function selectApprovalConfig(
  configs: ApprovalConfigDraft[],
  configId: string | null,
): ApprovalConfigDraft | null {
  if (!configId) {
    return null;
  }

  return configs.find((config) => config.id === configId) ?? null;
}

export function updateApprovalConfigStep(
  configs: ApprovalConfigDraft[],
  configId: string,
  stepIndex: number,
  field: ApprovalConfigStepField,
  value: string | number | boolean,
): ApprovalConfigDraft[] {
  return configs.map((config) => {
    if (config.id !== configId) {
      return config;
    }

    return {
      ...config,
      steps: config.steps.map((step, index) => {
        if (index !== stepIndex) {
          return step;
        }

        if (field === "stepType") {
          const nextId = step.id;
          if (value === "notification") {
            if (step.stepType === "notification") {
              return step;
            }

            return {
              ...createDefaultNotificationStep(nextId),
              recipientRole: step.role || DEFAULT_NOTIFICATION_RECIPIENT_ROLE,
            };
          }

          if (step.stepType === "approval") {
            return step;
          }

          return createDefaultApprovalStep(nextId);
        }

        return { ...step, [field]: value } as ApprovalStepDraft;
      }),
    };
  });
}

export function addApprovalConfigStep(
  configs: ApprovalConfigDraft[],
  configId: string,
  stepType: ApprovalConfigStepType = "approval",
): ApprovalConfigDraft[] {
  return configs.map((config) => {
    if (config.id !== configId) {
      return config;
    }

    return {
      ...config,
      steps: [
        ...config.steps,
        createDefaultStep(`temp-${Date.now()}`, stepType),
      ],
    };
  });
}

export function deleteApprovalConfigStep(
  configs: ApprovalConfigDraft[],
  configId: string,
  stepIndex: number,
): ApprovalConfigDraft[] {
  return configs.map((config) => {
    if (config.id !== configId) {
      return config;
    }

    return {
      ...config,
      steps: config.steps.filter((_step, index) => index !== stepIndex),
    };
  });
}

export function buildApprovalConfigSavePayload(
  configs: ApprovalConfigDraft[],
  configId: string,
) {
  const config = selectApprovalConfig(configs, configId);
  if (!config) {
    throw new Error(`Approval config ${configId} not found.`);
  }

  return {
    name: config.name,
    is_active: config.isActive,
    steps: config.steps.map((step, index) => {
      if (index === 0 && step.stepType === "notification") {
        throw new Error("Workflow first step must be approval.");
      }

      if (step.stepType === "notification") {
        if (step.recipientType === "user" && !step.recipientId) {
          throw new Error("Notification step requires a valid recipient.");
        }

        if (step.recipientType === "role" && !step.recipientRole) {
          throw new Error("Notification step requires a valid recipient.");
        }

        return {
          id: step.id,
          step_type: "notification",
          recipient_type: step.recipientType,
          ...(step.recipientType === "role"
            ? { recipient_role: step.recipientRole }
            : {
                recipient_id: step.recipientId,
                ...(step.recipientName ? { recipient_name: step.recipientName } : {}),
              }),
        };
      }

      return {
        id: step.id,
        step_type: "approval",
        role: step.role,
        sla_hours: step.sla_hours,
        auto_approve: step.auto_approve,
        can_escalate: step.can_escalate,
      };
    }),
  };
}
