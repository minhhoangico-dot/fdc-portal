/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLabDashboardSummaryModel } from '../../src/lib/labDashboardDisplayModel';
import type { LabDashboardPayload } from '../../src/types/labDashboard';

const payload: LabDashboardPayload = {
  meta: {
    generatedAt: '2026-03-23T09:45:00.000Z',
    asOfDate: '2026-03-23',
    source: 'live',
    sectionFreshness: {
      queue: {
        source: 'his',
        generatedAt: '2026-03-23T09:45:00.000Z',
      },
      tat: {
        source: 'his',
        generatedAt: '2026-03-23T09:45:00.000Z',
      },
      abnormal: {
        source: 'his',
        generatedAt: '2026-03-23T09:45:00.000Z',
      },
      reagents: {
        source: 'supabase',
        generatedAt: '2026-03-23T09:45:00.000Z',
        dataDate: '2026-03-23',
      },
    },
  },
  queue: {
    waitingForSample: 25,
    processing: 0,
    completedToday: 134,
  },
  tat: {
    averageMinutes: 110,
    medianMinutes: 37,
    requestedToProcessingMinutes: 28,
    processingToResultMinutes: 87,
    byType: [
      { key: 'huyet-hoc', name: 'Huyet hoc', minutes: 28 },
      { key: 'vi-sinh', name: 'Vi sinh', minutes: 56 },
      { key: 'hoa-sinh', name: 'Hoa sinh', minutes: 87 },
      { key: 'mien-dich', name: 'Mien dich', minutes: 205 },
    ],
  },
  abnormal: {
    abnormalCount: 178,
    totalResults: 1336,
    rows: [
      {
        patientCode: 'BN-001',
        testCode: 'LDL-C',
        testName: 'Dinh luong LDL - C',
        value: '190',
        severity: 'high',
        resultAt: '2026-03-23T09:30:00.000Z',
      },
    ],
  },
  reagents: [
    {
      key: 's9751',
      name: 'Hoa chat xet nghiem HBA1C',
      medicineCode: 'S9751',
      currentStock: 1,
      unit: 'Cai',
      status: 'critical',
    },
    {
      key: 'tsh092',
      name: 'Test Magluni TSH',
      medicineCode: 'TSH092',
      currentStock: 92,
      unit: 'Cai',
      status: 'ok',
    },
  ],
};

test('builds compact reagent chips for the real inventory summary row', () => {
  const model = buildLabDashboardSummaryModel(payload);

  assert.equal(model.reagentLayout, 'compact');
  assert.equal(model.shouldLoopReagentChips, true);
  assert.equal(model.reagentChips.length, 2);
  assert.equal(model.loopedReagentChips.length, 4);
  assert.deepEqual(model.reagentChips[0], {
    key: 's9751',
    name: 'Hoa chat xet nghiem HBA1C',
    medicineCode: 'S9751',
    focus: 'reagent:s9751',
    status: 'critical',
    percentage: 12,
    quantityLabel: '1 Cai',
  });
  assert.equal(model.reagentChips[1].name, 'Test Magluni TSH');
  assert.equal(model.reagentChips[1].quantityLabel, '92 Cai');
});

test('keeps the four TV summary KPI cards in the expected order', () => {
  const model = buildLabDashboardSummaryModel(payload);

  assert.deepEqual(
    model.tatCards.map((card) => card.focus),
    ['average', 'median', 'requested_to_processing', 'processing_to_result'],
  );
  assert.deepEqual(
    model.tatCards.map((card) => card.label),
    ['TAT trung bình', 'TAT trung vị', 'Tiếp nhận → xử lý', 'Xử lý → trả KQ'],
  );
});
