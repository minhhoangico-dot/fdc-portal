/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLabDashboardSourceDetails } from '../../src/lib/labDashboardSourceDetails';
import type { LabDashboardDetailSourceInfo } from '../../src/types/labDashboard';

const structuredSourceInfo: LabDashboardDetailSourceInfo = {
  key: 'tat',
  label: 'TAT',
  source: 'his',
  generatedAt: '2026-03-23T02:10:00.000Z',
  dataDate: '2026-03-23',
  summary: 'Danh sách này lấy từ các hồ sơ xét nghiệm đã hoàn thành trong ngày 2026-03-23 để đối soát thời gian xử lý và trả kết quả.',
  displayedRowCount: 1,
  datasets: [
    {
      key: 'lab_root_orders',
      label: 'Hồ sơ xét nghiệm gốc',
      role: 'Là tập hồ sơ đầu vào để tính các mốc thời gian TAT.',
    },
  ],
  pipeline: [
    {
      key: 'focus_average',
      label: 'Giữ danh sách TAT tổng',
      ruleSummary: 'Giữ toàn bộ hồ sơ hoàn thành có tổng TAT hợp lệ rồi sắp theo tổng TAT giảm dần để phục vụ đối soát.',
      inputCount: 1,
      outputCount: 1,
    },
  ],
  focusReason: 'Mục này giữ toàn bộ hồ sơ hoàn thành có tổng TAT hợp lệ và sắp các hồ sơ có thời gian dài hơn lên trước để hỗ trợ đối soát.',
  metricExplanation: [
    {
      label: 'Tổng TAT',
      description: 'Tổng TAT được tính bằng thời điểm trả kết quả trừ thời điểm tiếp nhận.',
    },
  ],
  calculationNotes: [
    'Dùng các hồ sơ xét nghiệm gốc có requested_at trong ngày.',
    'TAT = result_at - requested_at.',
  ],
};

test('prefers structured provenance over legacy notes', () => {
  const details = buildLabDashboardSourceDetails(structuredSourceInfo);

  assert.equal(details.error, undefined);
  assert.deepEqual(
    details.blocks.map((block) => block.kind),
    ['summary', 'pipeline', 'focusReason', 'metricExplanation', 'datasets'],
  );

  const [summaryBlock] = details.blocks;
  assert.equal(summaryBlock?.kind, 'summary');
  if (!summaryBlock || summaryBlock.kind !== 'summary') {
    throw new Error('Expected a summary block');
  }

  assert.equal(summaryBlock.displayedRowCount, 1);
  assert.equal(summaryBlock.summary, structuredSourceInfo.summary);
});

test('falls back to legacy notes when structured provenance is absent', () => {
  const details = buildLabDashboardSourceDetails({
    key: 'queue',
    label: 'Hàng chờ',
    source: 'his',
    generatedAt: '2026-03-23T03:10:00.000Z',
    dataDate: '2026-03-23',
    calculationNotes: ['Giữ các hồ sơ chưa có mốc xử lý.', 'Sắp theo thời điểm tiếp nhận tăng dần.'],
  });

  assert.equal(details.error, undefined);
  assert.deepEqual(details.blocks.map((block) => block.kind), ['legacyNotes']);

  const [fallbackBlock] = details.blocks;
  assert.equal(fallbackBlock?.kind, 'legacyNotes');
  if (!fallbackBlock || fallbackBlock.kind !== 'legacyNotes') {
    throw new Error('Expected a legacy notes block');
  }

  assert.deepEqual(fallbackBlock.notes, ['Giữ các hồ sơ chưa có mốc xử lý.', 'Sắp theo thời điểm tiếp nhận tăng dần.']);
});

test('preserves the error while keeping structured provenance blocks', () => {
  const details = buildLabDashboardSourceDetails({
    ...structuredSourceInfo,
    error: 'Không thể đọc bổ sung một phần nguồn dữ liệu.',
  });

  assert.equal(details.error, 'Không thể đọc bổ sung một phần nguồn dữ liệu.');
  assert.deepEqual(
    details.blocks.map((block) => block.kind),
    ['summary', 'pipeline', 'focusReason', 'metricExplanation', 'datasets'],
  );
});
