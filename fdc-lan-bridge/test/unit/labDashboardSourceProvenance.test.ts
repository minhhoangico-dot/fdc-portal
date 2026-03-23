/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  buildAbnormalSourceProvenance,
  buildQueueSourceProvenance,
  buildReagentSourceProvenance,
  buildTatSourceProvenance,
} from '../../src/labDashboard/sourceProvenance';
import {
  LabDashboardAbnormalDetailRow,
  LabDashboardQueueDetailRow,
  LabDashboardReagentDetailRow,
  LabDashboardTatDetailRow,
} from '../../src/labDashboard/types';

function collectStructuredStrings(sourceInfo: {
  summary?: string;
  focusReason?: string;
  datasets?: Array<{ label: string; role: string }>;
  pipeline?: Array<{ label: string; ruleSummary: string }>;
  metricExplanation?: Array<{ label: string; description: string }>;
}): string[] {
  return [
    sourceInfo.summary,
    sourceInfo.focusReason,
    ...(sourceInfo.datasets || []).flatMap((dataset) => [dataset.label, dataset.role]),
    ...(sourceInfo.pipeline || []).flatMap((step) => [step.label, step.ruleSummary]),
    ...(sourceInfo.metricExplanation || []).flatMap((item) => [item.label, item.description]),
  ].filter((value): value is string => Boolean(value));
}

describe('lab dashboard source provenance builders', () => {
  const timelineRows = [
    {
      serviceDataId: 100,
      patientCode: 'BN100',
      patientName: 'Nguyen Van A',
      subgroupKey: 'hoa-sinh',
      subgroupName: 'Hóa sinh',
      requestedAt: '2026-03-23T06:00:00.000Z',
      processingAt: null,
      resultAt: null,
      totalMinutes: null,
      requestedToProcessingMinutes: null,
      processingToResultMinutes: null,
      stage: 'waiting' as const,
    },
    {
      serviceDataId: 101,
      patientCode: 'BN101',
      patientName: 'Tran Thi B',
      subgroupKey: 'huyet-hoc',
      subgroupName: 'Huyết học',
      requestedAt: '2026-03-23T06:05:00.000Z',
      processingAt: '2026-03-23T06:15:00.000Z',
      resultAt: null,
      totalMinutes: null,
      requestedToProcessingMinutes: 10,
      processingToResultMinutes: null,
      stage: 'processing' as const,
    },
    {
      serviceDataId: 102,
      patientCode: 'BN102',
      patientName: 'Le Van C',
      subgroupKey: 'hoa-sinh',
      subgroupName: 'Hóa sinh',
      requestedAt: '2026-03-23T05:00:00.000Z',
      processingAt: '2026-03-23T05:20:00.000Z',
      resultAt: '2026-03-23T06:40:00.000Z',
      totalMinutes: 100,
      requestedToProcessingMinutes: 20,
      processingToResultMinutes: 80,
      stage: 'completed' as const,
    },
    {
      serviceDataId: 103,
      patientCode: 'BN103',
      patientName: 'Pham Thi D',
      subgroupKey: 'mien-dich',
      subgroupName: 'Miễn dịch',
      requestedAt: '2026-03-23T05:10:00.000Z',
      processingAt: '2026-03-23T05:25:00.000Z',
      resultAt: '2026-03-23T08:25:00.000Z',
      totalMinutes: 195,
      requestedToProcessingMinutes: 15,
      processingToResultMinutes: 180,
      stage: 'completed' as const,
    },
    {
      serviceDataId: 104,
      patientCode: 'BN104',
      patientName: 'Vo Thi E',
      subgroupKey: 'hoa-sinh',
      subgroupName: 'Hóa sinh',
      requestedAt: '2026-03-23T07:00:00.000Z',
      processingAt: '2026-03-23T07:10:00.000Z',
      resultAt: '2026-03-23T07:35:00.000Z',
      totalMinutes: 35,
      requestedToProcessingMinutes: 10,
      processingToResultMinutes: 25,
      stage: 'completed' as const,
    },
  ] as const;

  const waitingRows: LabDashboardQueueDetailRow[] = [
    {
      kind: 'queue',
      serviceDataId: 100,
      patientCode: 'BN100',
      subgroupKey: 'hoa-sinh',
      subgroupName: 'Hóa sinh',
      stage: 'waiting',
      requestedAt: '2026-03-23T06:00:00.000Z',
      processingAt: null,
      resultAt: null,
      totalMinutes: null,
      requestedToProcessingMinutes: null,
      processingToResultMinutes: null,
    },
  ];

  const tatProcessingRows: LabDashboardTatDetailRow[] = [
    {
      kind: 'tat',
      serviceDataId: 103,
      patientCode: 'BN103',
      subgroupKey: 'mien-dich',
      subgroupName: 'Miễn dịch',
      requestedAt: '2026-03-23T05:10:00.000Z',
      processingAt: '2026-03-23T05:25:00.000Z',
      resultAt: '2026-03-23T08:25:00.000Z',
      totalMinutes: 195,
      requestedToProcessingMinutes: 15,
      processingToResultMinutes: 180,
    },
    {
      kind: 'tat',
      serviceDataId: 102,
      patientCode: 'BN102',
      subgroupKey: 'hoa-sinh',
      subgroupName: 'Hóa sinh',
      requestedAt: '2026-03-23T05:00:00.000Z',
      processingAt: '2026-03-23T05:20:00.000Z',
      resultAt: '2026-03-23T06:40:00.000Z',
      totalMinutes: 100,
      requestedToProcessingMinutes: 20,
      processingToResultMinutes: 80,
    },
    {
      kind: 'tat',
      serviceDataId: 104,
      patientCode: 'BN104',
      subgroupKey: 'hoa-sinh',
      subgroupName: 'Hóa sinh',
      requestedAt: '2026-03-23T07:00:00.000Z',
      processingAt: '2026-03-23T07:10:00.000Z',
      resultAt: '2026-03-23T07:35:00.000Z',
      totalMinutes: 35,
      requestedToProcessingMinutes: 10,
      processingToResultMinutes: 25,
    },
  ];

  const tatHoaSinhRows = tatProcessingRows.filter((row) => row.subgroupKey === 'hoa-sinh');

  const abnormalRows: LabDashboardAbnormalDetailRow[] = [
    {
      kind: 'abnormal',
      patientCode: 'BN201',
      testCode: 'GLU',
      testName: 'Glucose',
      value: '15.2 mmol/L',
      severity: 'critical',
      resultAt: '2026-03-23T08:00:00.000Z',
      referenceRange: '4.0 - 6.0',
      abnormalFlag: 'H',
    },
    {
      kind: 'abnormal',
      patientCode: 'BN202',
      testCode: 'HGB',
      testName: 'Hemoglobin',
      value: '10.0 g/dL',
      severity: 'low',
      resultAt: '2026-03-23T08:30:00.000Z',
      referenceRange: '12.0 - 16.0',
      abnormalFlag: 'L',
    },
  ];

  const positiveSnapshotRows = [
    {
      sourceName: 'Combo Glucose đầu ngày',
      medicineCode: 'GLU-CRE-COMBO',
      warehouse: 'Khoa Xét nghiệm',
      currentStock: 2,
      snapshotDate: '2026-03-23',
      patientName: 'Nguyen Van A',
    },
    {
      sourceName: 'Creatinine kit',
      medicineCode: 'CRE-200',
      warehouse: 'Khoa Xét nghiệm',
      currentStock: 1,
      snapshotDate: '2026-03-23',
    },
    {
      sourceName: 'Glucose riêng',
      medicineCode: 'GLU-500',
      warehouse: 'Khoa Xét nghiệm',
      currentStock: 3,
      snapshotDate: '2026-03-23',
    },
    {
      sourceName: 'Urine 10 thông số',
      medicineCode: 'URI-10',
      warehouse: 'Kho tổng hợp',
      currentStock: 4,
      snapshotDate: '2026-03-23',
    },
  ] as const;

  const labScopedSnapshotRows = positiveSnapshotRows.filter((row) => row.warehouse === 'Khoa Xét nghiệm');
  const matchedSnapshotRows = labScopedSnapshotRows;

  const claimedReagentRows: LabDashboardReagentDetailRow[] = [
    {
      kind: 'reagent',
      reagentKey: 'glucose',
      reagentName: 'Glucose',
      sourceName: 'Combo Glucose đầu ngày',
      medicineCode: 'GLU-CRE-COMBO',
      warehouse: 'Khoa Xét nghiệm',
      currentStock: 2,
      unit: 'hộp',
      snapshotDate: '2026-03-23',
    },
    {
      kind: 'reagent',
      reagentKey: 'creatinine',
      reagentName: 'Creatinine',
      sourceName: 'Creatinine kit',
      medicineCode: 'CRE-200',
      warehouse: 'Khoa Xét nghiệm',
      currentStock: 1,
      unit: 'hộp',
      snapshotDate: '2026-03-23',
    },
    {
      kind: 'reagent',
      reagentKey: 'glucose',
      reagentName: 'Glucose',
      sourceName: 'Glucose riêng',
      medicineCode: 'GLU-500',
      warehouse: 'Khoa Xét nghiệm',
      currentStock: 3,
      unit: 'hộp',
      snapshotDate: '2026-03-23',
    },
  ];

  const pipelineKeys = (pipeline?: Array<{ key: string }>) => pipeline?.map((step: { key: string }) => step.key);
  const findPipelineStep = (pipeline: Array<{ key: string }> | undefined, key: string) =>
    pipeline?.find((step: { key: string }) => step.key === key);

  it('builds queue waiting provenance with summary, datasets, funnel, and focus reason', () => {
    const sourceInfo = buildQueueSourceProvenance({
      asOfDate: '2026-03-23',
      generatedAt: '2026-03-23T03:10:00.000Z',
      focus: 'waiting',
      timelineRows: timelineRows as never,
      displayedRows: waitingRows,
    });

    expect(sourceInfo.summary).toContain('hồ sơ xét nghiệm gốc');
    expect(sourceInfo.displayedRowCount).toBe(waitingRows.length);
    expect(sourceInfo.datasets).toEqual([
      expect.objectContaining({ key: 'lab_root_orders', label: 'Hồ sơ xét nghiệm gốc' }),
      expect.objectContaining({ key: 'patient_codes' }),
      expect.objectContaining({ key: 'processing_timestamps' }),
      expect.objectContaining({ key: 'result_timestamps' }),
    ]);
    expect(pipelineKeys(sourceInfo.pipeline)).toEqual([
      'raw_day_orders',
      'valid_requested_at',
      'attach_patient_codes',
      'derive_stage',
      'focus_waiting',
    ]);
    expect(sourceInfo.pipeline?.at(-1)).toEqual(
      expect.objectContaining({
        key: 'focus_waiting',
        inputCount: timelineRows.length,
        outputCount: waitingRows.length,
      }),
    );
    expect(sourceInfo.focusReason).toContain('chưa có mốc xử lý');
    expect(sourceInfo.calculationNotes).not.toHaveLength(0);
  });

  it('builds tat processing_to_result provenance with focus-specific metric wording and final filter count', () => {
    const sourceInfo = buildTatSourceProvenance({
      asOfDate: '2026-03-23',
      generatedAt: '2026-03-23T03:10:00.000Z',
      focus: 'processing_to_result',
      timelineRows: timelineRows as never,
      displayedRows: tatProcessingRows,
    });

    expect(sourceInfo.displayedRowCount).toBe(tatProcessingRows.length);
    expect(sourceInfo.pipeline?.at(-1)).toEqual(
      expect.objectContaining({
        key: 'focus_processing_to_result',
        outputCount: tatProcessingRows.length,
      }),
    );
    expect(sourceInfo.metricExplanation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Thời gian xử lý → trả kết quả',
          description: expect.stringContaining('trả kết quả trừ thời điểm bắt đầu xử lý'),
        }),
      ]),
    );
  });

  it('builds tat type provenance that explains subgroup filtering', () => {
    const sourceInfo = buildTatSourceProvenance({
      asOfDate: '2026-03-23',
      generatedAt: '2026-03-23T03:10:00.000Z',
      focus: 'type:hoa-sinh',
      timelineRows: timelineRows as never,
      displayedRows: tatHoaSinhRows,
    });

    expect(sourceInfo.pipeline?.at(-1)).toEqual(
      expect.objectContaining({
        key: 'focus_type',
        outputCount: tatHoaSinhRows.length,
      }),
    );
    expect(sourceInfo.focusReason).toContain('Hóa sinh');
    expect(sourceInfo.metricExplanation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Lọc theo nhóm xét nghiệm',
          description: expect.stringContaining('Hóa sinh'),
        }),
      ]),
    );
  });

  it('builds abnormal provenance with a single all focus reason and readable severity explanation', () => {
    const sourceInfo = buildAbnormalSourceProvenance({
      asOfDate: '2026-03-23',
      generatedAt: '2026-03-23T03:10:00.000Z',
      focus: 'all',
      abnormalRows,
      displayedRows: abnormalRows,
    });

    expect(sourceInfo.displayedRowCount).toBe(abnormalRows.length);
    expect(sourceInfo.focusReason).toContain('toàn bộ kết quả bất thường');
    expect(pipelineKeys(sourceInfo.pipeline)).toEqual([
      'abnormal_results',
      'derive_severity',
      'focus_all',
    ]);
    expect(sourceInfo.metricExplanation).toEqual([
      expect.objectContaining({
        label: 'Mức độ cảnh báo',
        description: expect.stringContaining('cao, thấp hoặc nguy kịch'),
      }),
    ]);
  });

  it('builds reagent provenance for all and reagent focus while preserving first-match claim order semantics', () => {
    const allSourceInfo = buildReagentSourceProvenance({
      generatedAt: '2026-03-23T03:10:00.000Z',
      snapshotDate: '2026-03-23',
      focus: 'all',
      positiveSnapshotRows: positiveSnapshotRows as never,
      labScopedRows: labScopedSnapshotRows as never,
      matchedRows: matchedSnapshotRows as never,
      claimedRows: claimedReagentRows,
      displayedRows: claimedReagentRows,
      claimOrder: ['glucose', 'creatinine', 'urine'],
    });

    const glucoseRows = claimedReagentRows.filter((row) => row.reagentKey === 'glucose');
    const glucoseSourceInfo = buildReagentSourceProvenance({
      generatedAt: '2026-03-23T03:10:00.000Z',
      snapshotDate: '2026-03-23',
      focus: 'reagent:glucose',
      positiveSnapshotRows: positiveSnapshotRows as never,
      labScopedRows: labScopedSnapshotRows as never,
      matchedRows: matchedSnapshotRows as never,
      claimedRows: claimedReagentRows,
      displayedRows: glucoseRows,
      claimOrder: ['glucose', 'creatinine', 'urine'],
    });

    expect(pipelineKeys(allSourceInfo.pipeline)).toEqual([
      'positive_stock_snapshot',
      'lab_warehouse_scope',
      'reagent_keyword_match',
      'claim_first_match',
      'focus_all',
    ]);
    expect(findPipelineStep(allSourceInfo.pipeline, 'claim_first_match')).toEqual(
      expect.objectContaining({
        inputCount: matchedSnapshotRows.length,
        outputCount: claimedReagentRows.length,
        ruleSummary: expect.stringContaining('theo thứ tự cấu hình hiện tại'),
      }),
    );
    expect(allSourceInfo.focusReason).toContain('toàn bộ các dòng snapshot đã được claim');
    expect(glucoseSourceInfo.pipeline?.at(-1)).toEqual(
      expect.objectContaining({
        key: 'focus_reagent',
        inputCount: claimedReagentRows.length,
        outputCount: glucoseRows.length,
      }),
    );
    expect(glucoseSourceInfo.focusReason).toContain('Glucose');
    expect(glucoseSourceInfo.metricExplanation).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Thứ tự claim reagent',
          description: expect.stringContaining('dòng khớp trước sẽ được giữ cho reagent đó'),
        }),
      ]),
    );
  });

  it('never exposes unsupported patientName in structured provenance strings', () => {
    const outputs = [
      buildQueueSourceProvenance({
        asOfDate: '2026-03-23',
        generatedAt: '2026-03-23T03:10:00.000Z',
        focus: 'waiting',
        timelineRows: timelineRows as never,
        displayedRows: waitingRows,
      }),
      buildTatSourceProvenance({
        asOfDate: '2026-03-23',
        generatedAt: '2026-03-23T03:10:00.000Z',
        focus: 'type:hoa-sinh',
        timelineRows: timelineRows as never,
        displayedRows: tatHoaSinhRows,
      }),
      buildAbnormalSourceProvenance({
        asOfDate: '2026-03-23',
        generatedAt: '2026-03-23T03:10:00.000Z',
        focus: 'all',
        abnormalRows,
        displayedRows: abnormalRows,
      }),
      buildReagentSourceProvenance({
        generatedAt: '2026-03-23T03:10:00.000Z',
        snapshotDate: '2026-03-23',
        focus: 'all',
        positiveSnapshotRows: positiveSnapshotRows as never,
        labScopedRows: labScopedSnapshotRows as never,
        matchedRows: matchedSnapshotRows as never,
        claimedRows: claimedReagentRows,
        displayedRows: claimedReagentRows,
        claimOrder: ['glucose', 'creatinine', 'urine'],
      }),
    ];

    for (const output of outputs) {
      expect(collectStructuredStrings(output).join(' ')).not.toContain('Nguyen Van A');
    }
  });
});
