/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  LabDashboardAbnormalRow,
  LabDashboardAbnormalSeverity,
  LabDashboardPayload,
  LabDashboardQueueFocus,
  LabDashboardReagentStatus,
  LabDashboardTatByType,
  LabDashboardTatFocus,
} from '@/types/labDashboard';

export type LabDashboardTatTone = 'good' | 'warn' | 'bad';

export interface LabDashboardSummaryQueueCard {
  key: 'waiting' | 'processing' | 'done';
  label: string;
  value: number;
  subLabel: string;
  focus: LabDashboardQueueFocus;
}

export interface LabDashboardSummaryTatCard {
  key: 'average' | 'median' | 'requested' | 'result';
  label: string;
  value: number;
  target: number;
  focus: LabDashboardTatFocus;
  tone: LabDashboardTatTone;
  percentage: number;
}

export interface LabDashboardSummaryTypeRow {
  key: string;
  name: string;
  minutes: number;
  displayValue: string;
  focus: LabDashboardTatFocus;
  tone: LabDashboardTatTone;
  percentage: number;
}

export interface LabDashboardSummaryReagentChip {
  key: string;
  name: string;
  medicineCode: string | null;
  focus: `reagent:${string}`;
  status: LabDashboardReagentStatus;
  percentage: number;
  quantityLabel: string;
}

export interface LabDashboardSummaryModel {
  queueCards: LabDashboardSummaryQueueCard[];
  tatCards: LabDashboardSummaryTatCard[];
  typeRows: LabDashboardSummaryTypeRow[];
  shouldLoopAbnormalRows: boolean;
  loopedAbnormalRows: LabDashboardAbnormalRow[];
  reagentLayout: 'compact';
  shouldLoopReagentChips: boolean;
  loopedReagentChips: LabDashboardSummaryReagentChip[];
  reagentChips: LabDashboardSummaryReagentChip[];
}

export function formatCompactMinutes(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}p` : `${hours}h`;
  }

  return `${minutes}p`;
}

export function getTatTone(value: number, target: number): LabDashboardTatTone {
  if (value <= target * 0.75) return 'good';
  if (value <= target) return 'warn';
  return 'bad';
}

export function getAbnormalSeverityLabel(severity: LabDashboardAbnormalSeverity): string {
  if (severity === 'critical') return 'Nguy hiểm';
  if (severity === 'high') return 'Cao';
  return 'Thấp';
}

export function getReagentStatusLabel(status: LabDashboardReagentStatus): LabDashboardReagentStatus {
  if (status === 'critical') return 'critical';
  if (status === 'low') return 'low';
  return 'ok';
}

function getTatTypeTarget(key: string): number {
  const targets: Record<string, number> = {
    'hoa-sinh': 60,
    'huyet-hoc': 45,
    'dong-mau': 50,
    'nuoc-tieu': 35,
    'mien-dich': 75,
  };

  return targets[key] || 90;
}

function getPercentage(value: number, total: number): number {
  if (total <= 0) {
    return value > 0 ? 100 : 0;
  }

  return Math.min(Math.round((value / total) * 100), 100);
}

function buildTypeRows(byType: LabDashboardTatByType[]): LabDashboardSummaryTypeRow[] {
  const maxMinutes = Math.max(90, ...byType.map((item) => item.minutes));

  return byType.map((item) => {
    const target = getTatTypeTarget(item.key);
    return {
      key: item.key,
      name: item.name,
      minutes: item.minutes,
      displayValue: formatCompactMinutes(item.minutes),
      focus: `type:${item.key}`,
      tone: getTatTone(item.minutes, target),
      percentage: getPercentage(item.minutes, maxMinutes),
    };
  });
}

function getReagentPercentage(currentStock: number, maxStock: number): number {
  if (maxStock <= 0) {
    return currentStock > 0 ? 100 : 0;
  }

  return Math.min(Math.max(Math.round((currentStock / maxStock) * 100), currentStock > 0 ? 12 : 0), 100);
}

export function buildLabDashboardSummaryModel(payload: LabDashboardPayload): LabDashboardSummaryModel {
  const shouldLoopAbnormalRows = payload.abnormal.rows.length > 6;
  const maxReagentStock = Math.max(1, ...payload.reagents.map((reagent) => reagent.currentStock));
  const reagentChips = payload.reagents.map((reagent) => ({
    key: reagent.key,
    name: reagent.name,
    medicineCode: reagent.medicineCode,
    focus: `reagent:${reagent.key}` as const,
    status: reagent.status,
    percentage: getReagentPercentage(reagent.currentStock, maxReagentStock),
    quantityLabel: `${reagent.currentStock.toLocaleString('vi-VN')} ${reagent.unit}`,
  }));
  const shouldLoopReagentChips = reagentChips.length > 0;

  return {
    queueCards: [
      {
        key: 'waiting',
        label: 'Chờ lấy mẫu',
        value: payload.queue.waitingForSample,
        subLabel: 'Chưa có mốc xử lý',
        focus: 'waiting',
      },
      {
        key: 'processing',
        label: 'Đã lấy mẫu',
        value: payload.queue.processing,
        subLabel: 'Đang chạy hoặc chờ kết quả',
        focus: 'processing',
      },
      {
        key: 'done',
        label: 'Hoàn thành',
        value: payload.queue.completedToday,
        subLabel: 'Đã trả kết quả trong ngày',
        focus: 'completed',
      },
    ],
    tatCards: [
      {
        key: 'average',
        label: 'TAT trung bình',
        value: payload.tat.averageMinutes,
        target: 75,
        focus: 'average',
        tone: getTatTone(payload.tat.averageMinutes, 75),
        percentage: getPercentage(payload.tat.averageMinutes, 75),
      },
      {
        key: 'median',
        label: 'TAT trung vị',
        value: payload.tat.medianMinutes,
        target: 65,
        focus: 'median',
        tone: getTatTone(payload.tat.medianMinutes, 65),
        percentage: getPercentage(payload.tat.medianMinutes, 65),
      },
      {
        key: 'requested',
        label: 'Tiếp nhận → xử lý',
        value: payload.tat.requestedToProcessingMinutes,
        target: 20,
        focus: 'requested_to_processing',
        tone: getTatTone(payload.tat.requestedToProcessingMinutes, 20),
        percentage: getPercentage(payload.tat.requestedToProcessingMinutes, 20),
      },
      {
        key: 'result',
        label: 'Xử lý → trả KQ',
        value: payload.tat.processingToResultMinutes,
        target: 45,
        focus: 'processing_to_result',
        tone: getTatTone(payload.tat.processingToResultMinutes, 45),
        percentage: getPercentage(payload.tat.processingToResultMinutes, 45),
      },
    ],
    typeRows: buildTypeRows(payload.tat.byType),
    shouldLoopAbnormalRows,
    loopedAbnormalRows: shouldLoopAbnormalRows
      ? [...payload.abnormal.rows, ...payload.abnormal.rows]
      : payload.abnormal.rows,
    reagentLayout: 'compact',
    shouldLoopReagentChips,
    loopedReagentChips: shouldLoopReagentChips ? [...reagentChips, ...reagentChips] : reagentChips,
    reagentChips,
  };
}
