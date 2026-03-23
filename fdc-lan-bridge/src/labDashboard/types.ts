/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LabDashboardSectionKey = "queue" | "tat" | "abnormal" | "reagents";

export type LabDashboardDetailSection = LabDashboardSectionKey;

export type LabDashboardSectionSource = "his" | "supabase";

export type LabDashboardAbnormalSeverity = "high" | "low" | "critical";

export type LabDashboardReagentStatus = "ok" | "low" | "critical";

export type LabDashboardOrderStage = "waiting" | "processing" | "completed";

export type LabDashboardQueueFocus = LabDashboardOrderStage;

export type LabDashboardTatMetricFocus =
  | "average"
  | "median"
  | "requested_to_processing"
  | "processing_to_result";

export type LabDashboardTatFocus = LabDashboardTatMetricFocus | `type:${string}`;

export type LabDashboardAbnormalFocus = "all";

export type LabDashboardReagentFocus = "all" | `reagent:${string}`;

export type LabDashboardDetailFocus =
  | LabDashboardQueueFocus
  | LabDashboardTatFocus
  | LabDashboardAbnormalFocus
  | LabDashboardReagentFocus;

export interface LabDashboardSectionFreshness {
  source: LabDashboardSectionSource;
  generatedAt: string;
  dataDate?: string;
}

export interface LabDashboardMeta {
  generatedAt: string;
  asOfDate: string;
  source: "live";
  sectionFreshness: Record<LabDashboardSectionKey, LabDashboardSectionFreshness>;
  sectionErrors?: Partial<Record<LabDashboardSectionKey, string>>;
}

export interface LabDashboardQueue {
  waitingForSample: number;
  processing: number;
  completedToday: number;
}

export interface LabDashboardTatByType {
  key: string;
  name: string;
  minutes: number;
}

export interface LabDashboardTat {
  averageMinutes: number;
  medianMinutes: number;
  requestedToProcessingMinutes: number;
  processingToResultMinutes: number;
  byType: LabDashboardTatByType[];
}

export interface LabDashboardAbnormalRow {
  patientCode: string;
  testCode: string;
  testName: string;
  value: string;
  severity: LabDashboardAbnormalSeverity;
  resultAt: string;
}

export interface LabDashboardAbnormal {
  abnormalCount: number;
  totalResults: number;
  rows: LabDashboardAbnormalRow[];
}

export interface LabDashboardReagent {
  key: string;
  name: string;
  currentStock: number;
  targetStock: number;
  unit: string;
  status: LabDashboardReagentStatus;
}

export interface LabDashboardPayload {
  meta: LabDashboardMeta;
  queue: LabDashboardQueue;
  tat: LabDashboardTat;
  abnormal: LabDashboardAbnormal;
  reagents: LabDashboardReagent[];
}

export interface LabDashboardDetailSourceInfo {
  key: LabDashboardSectionKey;
  label: string;
  source: LabDashboardSectionSource;
  generatedAt: string;
  dataDate?: string;
  error?: string;
  calculationNotes: string[];
  summary?: string;
  displayedRowCount?: number;
  datasets?: LabDashboardDetailDatasetInfo[];
  pipeline?: LabDashboardDetailPipelineStep[];
  focusReason?: string;
  metricExplanation?: LabDashboardDetailMetricExplanation[];
}

export interface LabDashboardDetailDatasetInfo {
  key: string;
  label: string;
  role: string;
}

export interface LabDashboardDetailPipelineStep {
  key: string;
  label: string;
  ruleSummary: string;
  inputCount: number;
  outputCount: number;
}

export interface LabDashboardDetailMetricExplanation {
  label: string;
  description: string;
}

export interface LabDashboardDetailMeta {
  generatedAt: string;
  asOfDate: string;
  section: LabDashboardDetailSection;
  focus: LabDashboardDetailFocus;
  title: string;
  description: string;
  sourceDetails: LabDashboardDetailSourceInfo[];
}

export interface LabDashboardQueueDetailRow {
  kind: "queue";
  serviceDataId: number;
  patientCode: string;
  subgroupKey: string;
  subgroupName: string;
  stage: LabDashboardOrderStage;
  requestedAt: string;
  processingAt: string | null;
  resultAt: string | null;
  totalMinutes: number | null;
  requestedToProcessingMinutes: number | null;
  processingToResultMinutes: number | null;
}

export interface LabDashboardTatDetailRow {
  kind: "tat";
  serviceDataId: number;
  patientCode: string;
  subgroupKey: string;
  subgroupName: string;
  requestedAt: string;
  processingAt: string | null;
  resultAt: string | null;
  totalMinutes: number | null;
  requestedToProcessingMinutes: number | null;
  processingToResultMinutes: number | null;
}

export interface LabDashboardTimelineProvenanceRow {
  serviceDataId: number;
  patientCode: string;
  subgroupKey: string;
  subgroupName: string;
  requestedAt: string;
  processingAt: string | null;
  resultAt: string | null;
  totalMinutes: number | null;
  requestedToProcessingMinutes: number | null;
  processingToResultMinutes: number | null;
  stage: LabDashboardOrderStage;
}

export interface LabDashboardAbnormalDetailRow {
  kind: "abnormal";
  patientCode: string;
  testCode: string;
  testName: string;
  value: string;
  severity: LabDashboardAbnormalSeverity;
  resultAt: string;
  referenceRange: string | null;
  abnormalFlag: string | null;
}

export interface LabDashboardReagentDetailRow {
  kind: "reagent";
  reagentKey: string;
  reagentName: string;
  sourceName: string;
  medicineCode: string | null;
  warehouse: string | null;
  currentStock: number;
  unit: string;
  snapshotDate: string;
}

export type LabDashboardDetailRow =
  | LabDashboardQueueDetailRow
  | LabDashboardTatDetailRow
  | LabDashboardAbnormalDetailRow
  | LabDashboardReagentDetailRow;

export interface LabDashboardDetailPayload {
  meta: LabDashboardDetailMeta;
  rows: LabDashboardDetailRow[];
}
