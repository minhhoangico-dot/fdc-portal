/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type {
  LabDashboardAbnormalDetailRow,
  LabDashboardDetailPayload,
  LabDashboardDetailTab,
  LabDashboardQueueDetailRow,
  LabDashboardReagentDetailRow,
  LabDashboardTatDetailRow,
} from '@/types/labDashboard';

export interface LabDashboardDetailExportStateInput {
  activeTab: LabDashboardDetailTab;
  loading: boolean;
  payload: LabDashboardDetailPayload | null;
}

export interface LabDashboardDetailExportState {
  available: boolean;
  hidden: boolean;
  disabled: boolean;
  rowCount: number;
}

type LabDashboardDetailExportRow = Record<string, string>;
type LabDashboardDetailSection = LabDashboardDetailPayload['meta']['section'];

interface LabDashboardDetailSectionExportConfig {
  headers: string[];
  sheetName: string;
  rows: LabDashboardDetailExportRow[];
}

function sanitizeExportPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/:/g, '_')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDetailDateTime(value: string | null): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'HH:mm dd/MM', { locale: vi });
}

function formatDetailMinutes(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('vi-VN')}p`;
}

function getQueueStageLabel(stage: LabDashboardQueueDetailRow['stage']): string {
  if (stage === 'waiting') return 'Chờ lấy mẫu';
  if (stage === 'processing') return 'Đang xử lý';
  return 'Hoàn thành';
}

function getRowsForQueue(payload: LabDashboardDetailPayload): LabDashboardDetailExportRow[] {
  return (payload.rows as LabDashboardQueueDetailRow[]).map((row) => ({
    'Mã BN': row.patientCode,
    'Nhóm XN': row.subgroupName,
    'Trạng thái': getQueueStageLabel(row.stage),
    'Tiếp nhận': formatDetailDateTime(row.requestedAt),
    'Xử lý': formatDetailDateTime(row.processingAt),
    'Trả KQ': formatDetailDateTime(row.resultAt),
  }));
}

function getRowsForTat(payload: LabDashboardDetailPayload): LabDashboardDetailExportRow[] {
  return (payload.rows as LabDashboardTatDetailRow[]).map((row) => ({
    'Mã BN': row.patientCode,
    'Nhóm XN': row.subgroupName,
    'Tên test': row.testName,
    'Tiếp nhận': formatDetailDateTime(row.requestedAt),
    'Xử lý': formatDetailDateTime(row.processingAt),
    'Trả KQ': formatDetailDateTime(row.resultAt),
    'Tổng TAT': formatDetailMinutes(row.totalMinutes),
    'TN → XL': formatDetailMinutes(row.requestedToProcessingMinutes),
    'XL → KQ': formatDetailMinutes(row.processingToResultMinutes),
  }));
}

function getRowsForAbnormal(payload: LabDashboardDetailPayload): LabDashboardDetailExportRow[] {
  return (payload.rows as LabDashboardAbnormalDetailRow[]).map((row) => ({
    'Mã BN': row.patientCode,
    'Mã XN': row.testCode,
    'Tên xét nghiệm': row.testName,
    'Giá trị': row.value,
    'Cờ': row.abnormalFlag || row.severity,
    'Khoảng tham chiếu': row.referenceRange || '—',
    'Thời điểm': formatDetailDateTime(row.resultAt),
  }));
}

function getRowsForReagents(payload: LabDashboardDetailPayload): LabDashboardDetailExportRow[] {
  return (payload.rows as LabDashboardReagentDetailRow[]).map((row) => ({
    'Vật tư': row.reagentName,
    'Mã vật tư': row.medicineCode || '--',
    Kho: row.warehouse || '--',
    'Tồn': row.currentStock.toLocaleString('vi-VN'),
    'Đơn vị': row.unit,
    'Ngày snapshot': row.snapshotDate,
  }));
}

function getSectionExportConfig(payload: LabDashboardDetailPayload): LabDashboardDetailSectionExportConfig {
  switch (payload.meta.section) {
    case 'queue':
      return {
        headers: ['Mã BN', 'Nhóm XN', 'Trạng thái', 'Tiếp nhận', 'Xử lý', 'Trả KQ'],
        sheetName: 'queue',
        rows: getRowsForQueue(payload),
      };
    case 'tat':
      return {
        headers: ['Mã BN', 'Nhóm XN', 'Tên test', 'Tiếp nhận', 'Xử lý', 'Trả KQ', 'Tổng TAT', 'TN → XL', 'XL → KQ'],
        sheetName: 'tat',
        rows: getRowsForTat(payload),
      };
    case 'abnormal':
      return {
        headers: ['Mã BN', 'Mã XN', 'Tên xét nghiệm', 'Giá trị', 'Cờ', 'Khoảng tham chiếu', 'Thời điểm'],
        sheetName: 'abnormal',
        rows: getRowsForAbnormal(payload),
      };
    case 'reagents':
      return {
        headers: ['Vật tư', 'Mã vật tư', 'Kho', 'Tồn', 'Đơn vị', 'Ngày snapshot'],
        sheetName: 'reagents',
        rows: getRowsForReagents(payload),
      };
    default: {
      const section: never = payload.meta.section;
      throw new Error(`Unsupported lab dashboard detail section: ${section}`);
    }
  }
}

export function buildLabDashboardDetailExportFilename(
  section: string,
  focus: string,
  asOfDate: string,
): string {
  return ['lab-dashboard', sanitizeExportPart(section), sanitizeExportPart(focus), sanitizeExportPart(asOfDate)]
    .filter(Boolean)
    .join('-')
    .concat('.xlsx');
}

export function getLabDashboardDetailExportState({
  activeTab,
  loading,
  payload,
}: LabDashboardDetailExportStateInput): LabDashboardDetailExportState {
  const rowCount = payload?.rows.length ?? 0;
  const hidden = activeTab === 'source';
  const hasPayload = Boolean(payload);
  const hasRows = rowCount > 0;
  const disabled = hidden || !hasPayload || !hasRows || (loading && !hasPayload);
  const available = !hidden && hasPayload && hasRows && !disabled;

  return {
    available,
    hidden,
    disabled,
    rowCount,
  };
}

export function buildLabDashboardDetailExportRows(payload: LabDashboardDetailPayload): LabDashboardDetailExportRow[] {
  return getSectionExportConfig(payload).rows;
}

export async function exportLabDashboardDetailToWorkbook(payload: LabDashboardDetailPayload): Promise<any> {
  const xlsxModule = await import('xlsx');
  const xlsx = (xlsxModule as any).default ?? xlsxModule;
  const { headers, rows, sheetName } = getSectionExportConfig(payload);

  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(rows, { header: headers });

  xlsx.utils.book_append_sheet(workbook, sheet, sheetName);

  return workbook;
}
