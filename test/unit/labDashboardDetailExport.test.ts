/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLabDashboardDetailExportFilename,
  buildLabDashboardDetailExportRows,
  exportLabDashboardDetailToWorkbook,
  getLabDashboardDetailExportState,
} from '../../src/lib/labDashboardDetailExport';
import type {
  LabDashboardAbnormalDetailRow,
  LabDashboardDetailPayload,
  LabDashboardQueueDetailRow,
} from '../../src/types/labDashboard';

const queuePayload: LabDashboardDetailPayload = {
  meta: {
    generatedAt: '2026-03-23T09:37:00.000Z',
    asOfDate: '2026-03-23',
    section: 'queue',
    focus: 'waiting',
    title: 'Hang cho lay mau',
    description: 'Danh sach chi tiet cho hang cho lay mau',
    sourceDetails: [],
  },
  rows: [
    {
      kind: 'queue',
      serviceDataId: 101,
      patientCode: 'BN-001',
      subgroupKey: 'hoa-sinh',
      subgroupName: 'Hoa sinh',
      stage: 'waiting',
      requestedAt: '2026-03-23T08:01:00.000Z',
      processingAt: null,
      resultAt: null,
      totalMinutes: null,
      requestedToProcessingMinutes: null,
      processingToResultMinutes: null,
    },
  ],
};

const tatPayload: LabDashboardDetailPayload = {
  meta: {
    generatedAt: '2026-03-23T09:37:00.000Z',
    asOfDate: '2026-03-23',
    section: 'tat',
    focus: 'type:hoa-sinh',
    title: 'TAT hoa sinh',
    description: 'Danh sach chi tiet cho TAT hoa sinh',
    sourceDetails: [],
  },
  rows: [
    {
      kind: 'tat',
      serviceDataId: 201,
      patientCode: 'BN-002',
      subgroupKey: 'hoa-sinh',
      subgroupName: 'Hoa sinh',
      testName: 'Dinh luong Glucose',
      requestedAt: '2026-03-23T08:01:00.000Z',
      processingAt: '2026-03-23T08:38:00.000Z',
      resultAt: '2026-03-23T09:15:00.000Z',
      totalMinutes: 74,
      requestedToProcessingMinutes: 37,
      processingToResultMinutes: 37,
    },
  ],
};

const abnormalPayload: LabDashboardDetailPayload = {
  meta: {
    generatedAt: '2026-03-23T09:37:00.000Z',
    asOfDate: '2026-03-23',
    section: 'abnormal',
    focus: 'all',
    title: 'Ket qua bat thuong',
    description: 'Danh sach chi tiet cac ket qua bat thuong',
    sourceDetails: [],
  },
  rows: [
    {
      kind: 'abnormal',
      patientCode: 'BN-003',
      testCode: 'LDL-C',
      testName: 'Dinh luong LDL-C',
      value: '190',
      severity: 'high',
      resultAt: '2026-03-23T09:30:00.000Z',
      referenceRange: '0 - 130',
      abnormalFlag: 'H',
    },
  ],
};

const reagentPayload: LabDashboardDetailPayload = {
  meta: {
    generatedAt: '2026-03-23T09:37:00.000Z',
    asOfDate: '2026-03-23',
    section: 'reagents',
    focus: 'all',
    title: 'Ton kho vat tu',
    description: 'Danh sach chi tiet vat tu ton kho',
    sourceDetails: [],
  },
  rows: [
    {
      kind: 'reagent',
      reagentKey: 'med-001',
      reagentName: 'Hoa chat xet nghiem Glucose',
      sourceName: 'Hoa chat xet nghiem Glucose',
      medicineCode: 'MED-001',
      warehouse: 'Khoa Xet Nghiem',
      currentStock: 1200,
      unit: 'Cai',
      snapshotDate: '2026-03-23',
    },
  ],
};

const unsupportedPayload = {
  meta: {
    generatedAt: '2026-03-23T09:37:00.000Z',
    asOfDate: '2026-03-23',
    section: 'source' as never,
    focus: 'all',
    title: 'Unsupported',
    description: 'Unsupported',
    sourceDetails: [],
  },
  rows: [],
} as LabDashboardDetailPayload;

test('builds sanitized export filenames', () => {
  assert.equal(
    buildLabDashboardDetailExportFilename('type:hoa-sinh', 'reagent:glucose', '2026/03/23 09:45'),
    'lab-dashboard-type_hoa-sinh-reagent_glucose-2026-03-23-09_45.xlsx',
  );
});

test('derives export availability from tab, loading, and payload state', () => {
  assert.deepEqual(
    getLabDashboardDetailExportState({ activeTab: 'source', loading: false, payload: queuePayload }),
    { available: false, hidden: true, disabled: true, rowCount: 1 },
  );

  assert.deepEqual(
    getLabDashboardDetailExportState({ activeTab: 'list', loading: true, payload: null }),
    { available: false, hidden: false, disabled: true, rowCount: 0 },
  );

  assert.deepEqual(
    getLabDashboardDetailExportState({ activeTab: 'list', loading: true, payload: queuePayload }),
    { available: true, hidden: false, disabled: false, rowCount: 1 },
  );

  assert.deepEqual(
    getLabDashboardDetailExportState({
      activeTab: 'list',
      loading: false,
      payload: { ...queuePayload, rows: [] },
    }),
    { available: false, hidden: false, disabled: true, rowCount: 0 },
  );
});

test('maps current detail payload rows using the rendered display format', () => {
  const queueRows = buildLabDashboardDetailExportRows(queuePayload);
  const tatRows = buildLabDashboardDetailExportRows(tatPayload);
  const abnormalRows = buildLabDashboardDetailExportRows(abnormalPayload);
  const reagentRows = buildLabDashboardDetailExportRows(reagentPayload);

  assert.deepEqual(queueRows, [
    {
      'Mã BN': 'BN-001',
      'Nhóm XN': 'Hoa sinh',
      'Trạng thái': 'Chờ lấy mẫu',
      'Tiếp nhận': '15:01 23/03',
      'Xử lý': '—',
      'Trả KQ': '—',
    },
  ]);

  assert.deepEqual(tatRows, [
    {
      'Mã BN': 'BN-002',
      'Nhóm XN': 'Hoa sinh',
      'Tên test': 'Dinh luong Glucose',
      'Tiếp nhận': '15:01 23/03',
      'Xử lý': '15:38 23/03',
      'Trả KQ': '16:15 23/03',
      'Tổng TAT': '74p',
      'TN → XL': '37p',
      'XL → KQ': '37p',
    },
  ]);

  assert.deepEqual(abnormalRows, [
    {
      'Mã BN': 'BN-003',
      'Mã XN': 'LDL-C',
      'Tên xét nghiệm': 'Dinh luong LDL-C',
      'Giá trị': '190',
      'Cờ': 'H',
      'Khoảng tham chiếu': '0 - 130',
      'Thời điểm': '16:30 23/03',
    },
  ]);

  const abnormalFallbackRows = buildLabDashboardDetailExportRows({
    ...abnormalPayload,
    rows: [{ ...abnormalPayload.rows[0], abnormalFlag: null } as LabDashboardAbnormalDetailRow],
  });

  assert.equal(abnormalFallbackRows[0]['Cờ'], 'high');

  assert.deepEqual(reagentRows, [
    {
      'Vật tư': 'Hoa chat xet nghiem Glucose',
      'Mã vật tư': 'MED-001',
      Kho: 'Khoa Xet Nghiem',
      'Tồn': '1.200',
      'Đơn vị': 'Cai',
      'Ngày snapshot': '2026-03-23',
    },
  ]);

  assert.ok(queueRows.every((row) => !Object.keys(row).some((key) => key.toLowerCase().includes('patient'))));
  assert.ok(tatRows.every((row) => !Object.keys(row).some((key) => key.toLowerCase().includes('patient'))));
  assert.ok(abnormalRows.every((row) => !Object.keys(row).some((key) => key.toLowerCase().includes('patient'))));
  assert.ok(reagentRows.every((row) => !Object.keys(row).some((key) => key.toLowerCase().includes('patient'))));
});

test('passes through invalid dates unchanged', () => {
  const queueRows = buildLabDashboardDetailExportRows({
    ...queuePayload,
    rows: [{ ...queuePayload.rows[0], requestedAt: 'not-a-date' } as LabDashboardQueueDetailRow],
  });

  assert.equal(queueRows[0]['Tiếp nhận'], 'not-a-date');
});

test('creates a workbook with a section-derived sheet name', async () => {
  const queueWorkbook = await exportLabDashboardDetailToWorkbook(queuePayload);
  const abnormalWorkbook = await exportLabDashboardDetailToWorkbook(abnormalPayload);

  assert.equal(queueWorkbook.SheetNames.length, 1);
  assert.equal(queueWorkbook.SheetNames[0], 'queue');
  assert.equal(abnormalWorkbook.SheetNames.length, 1);
  assert.equal(abnormalWorkbook.SheetNames[0], 'abnormal');

  const sheet = queueWorkbook.Sheets[queueWorkbook.SheetNames[0]];
  assert.equal(sheet['A1'].v, 'Mã BN');
  assert.equal(sheet['A2'].v, 'BN-001');
});

test('throws for unsupported sections instead of falling back to reagents', async () => {
  assert.throws(() => buildLabDashboardDetailExportRows(unsupportedPayload), /Unsupported lab dashboard detail section: source/);
  await assert.rejects(
    exportLabDashboardDetailToWorkbook(unsupportedPayload),
    /Unsupported lab dashboard detail section: source/,
  );
});
