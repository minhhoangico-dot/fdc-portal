/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from "node:test";
import assert from "node:assert/strict";

import { buildInventoryItemKey } from "../../src/lib/inventory-identity";
import {
  buildSupplyInventoryKpiDetail,
  type SupplyInventoryKpiModalState,
} from "../../src/lib/supplyInventoryKpiDetails";
import type {
  InventoryAnomaly,
  InventoryItem,
  SupplyDailyConsumptionRow,
  SupplyMonthlyStatRow,
} from "../../src/types/inventory";

const inventoryItem = (overrides: Partial<InventoryItem>): InventoryItem => ({
  id: "item-1",
  name: "Gac y te",
  sku: "VT-001",
  sourceId: "misa_VT-001",
  inventoryKey: buildInventoryItemKey("misa_VT-001", "Kho chinh") || undefined,
  category: "Vat tu y te",
  warehouse: "Kho chinh",
  currentStock: 100,
  unit: "Cai",
  status: "in_stock",
  lastUpdated: "2026-04-05",
  unitPrice: 5000,
  ...overrides,
});

const anomaly = (overrides: Partial<InventoryAnomaly>): InventoryAnomaly => ({
  id: "anomaly-1",
  materialId: "Gac y te",
  inventoryKey: buildInventoryItemKey("misa_VT-001", "Kho chinh"),
  rule: "low_stock",
  severity: "high",
  description: "Ton kho dang giam",
  detectedAt: "2026-04-05T00:00:00.000Z",
  acknowledged: false,
  ...overrides,
});

const monthlyRow = (overrides: Partial<SupplyMonthlyStatRow>): SupplyMonthlyStatRow => ({
  report_month: "2026-04",
  account: "all",
  consumption_amount: 12_000_000,
  consumption_qty: 120,
  consumption_amount_ly: 10_000_000,
  consumption_qty_ly: 100,
  patient_volume: 800,
  ...overrides,
});

const dailyRow = (overrides: Partial<SupplyDailyConsumptionRow>): SupplyDailyConsumptionRow => ({
  report_date: "2026-04-01",
  account: "1522",
  outward_amount: 2_000_000,
  outward_qty: 20,
  patient_visits: 100,
  ...overrides,
});

const buildDetail = (state: SupplyInventoryKpiModalState) =>
  buildSupplyInventoryKpiDetail(state, {
    inventory: [
      inventoryItem(),
      inventoryItem({
        id: "item-2",
        name: "Kim tiem",
        sku: "VT-002",
        sourceId: "misa_VT-002",
        inventoryKey: buildInventoryItemKey("misa_VT-002", "Kho chinh") || undefined,
        category: "Vat tu y te",
        currentStock: 40,
        unitPrice: 15_000,
        status: "low_stock",
      }),
      inventoryItem({
        id: "item-3",
        name: "Giay in",
        sku: "VT-003",
        sourceId: "misa_VT-003",
        inventoryKey: buildInventoryItemKey("misa_VT-003", "Kho hanh chinh") || undefined,
        category: "Van phong pham",
        warehouse: "Kho hanh chinh",
        currentStock: 10,
        unitPrice: 90_000,
        status: "out_of_stock",
      }),
    ],
    anomalies: [
      anomaly(),
      anomaly({
        id: "anomaly-2",
        materialId: "Kim tiem",
        inventoryKey: buildInventoryItemKey("misa_VT-002", "Kho chinh"),
        rule: "zero_stock",
        severity: "medium",
        description: "Sap het hang",
        acknowledged: true,
      }),
      anomaly({
        id: "anomaly-3",
        materialId: "Giay in",
        inventoryKey: buildInventoryItemKey("misa_VT-003", "Kho hanh chinh"),
        rule: "stock_spike",
        severity: "critical",
        description: "Bien dong dot bien",
      }),
    ],
    monthlyData: [
      monthlyRow(),
      monthlyRow({
        report_month: "2026-03",
        account: "1522",
        consumption_amount: 9_000_000,
        consumption_amount_ly: 8_000_000,
        patient_volume: 600,
      }),
      monthlyRow({
        report_month: "2026-02",
        account: "1521",
        consumption_amount: 4_000_000,
        consumption_amount_ly: 3_000_000,
        patient_volume: 500,
      }),
    ],
    dailyData: [
      dailyRow(),
      dailyRow({
        report_date: "2026-04-02",
        account: "1522",
        outward_amount: 1_500_000,
        patient_visits: 75,
      }),
      dailyRow({
        report_date: "2026-04-03",
        account: "1521",
        outward_amount: 500_000,
        patient_visits: 25,
      }),
    ],
    // Fixed clock so the daily/monthly windows are relative to the April 2026
    // fixtures, not wall-clock. buildSupplyChartData threads this `now` through
    // for exactly this determinism; without it the 1M window drifts and the
    // cost-per-visit rows empty out on any run past May 2026.
    now: new Date("2026-04-15T00:00:00.000Z"),
  });

test("builds total-item KPI detail with category summary and status filter", () => {
  const detail = buildDetail({
    kind: "total-items",
    filters: { category: "Vat tu y te", status: "in_stock" },
  });

  assert.equal(detail.dataSource, "MISA");
  assert.equal(detail.title, "Tổng loại vật tư");
  assert.match(detail.dataNote, /fdc_inventory_snapshots/);
  assert.equal(detail.rows.length, 1);
  assert.equal(detail.rows[0]?.[1], "Gac y te");
  assert.ok(detail.summaryRows.some((row) => row.label.includes("Vat tu y te")));
});

test("builds alert KPI detail with active-only default and optional all visibility", () => {
  const activeOnly = buildDetail({
    kind: "alerts",
    filters: { severity: "all", visibility: "active" },
  });
  assert.equal(activeOnly.dataSource, "MISA + Analytics");
  assert.equal(activeOnly.title, "Cảnh báo bất thường");
  assert.match(activeOnly.dataNote, /fdc_analytics_anomalies/);
  assert.equal(activeOnly.rows.length, 2);

  const allAlerts = buildDetail({
    kind: "alerts",
    filters: { severity: "all", visibility: "all" },
  });
  assert.equal(allAlerts.rows.length, 3);
  assert.ok(allAlerts.summaryRows.some((row) => row.label.includes("Rule")));
});

test("builds inventory-value KPI detail with warehouse/category summaries and descending value rows", () => {
  const detail = buildDetail({
    kind: "inventory-value",
    filters: { warehouse: "all", category: "all" },
  });

  assert.equal(detail.dataSource, "MISA");
  assert.equal(detail.title, "Giá trị tồn kho");
  assert.match(detail.dataNote, /Giá trị được tính trực tiếp/i);
  assert.equal(detail.rows.length, 3);
  assert.equal(detail.rows[0]?.[1], "Giay in");
  assert.ok(detail.summaryRows.some((row) => row.label.includes("Kho")));
  assert.ok(detail.summaryRows.some((row) => row.label.includes("Loại")));
});

test("builds cost-per-visit KPI detail from daily data for short ranges and monthly data for long ranges", () => {
  const dailyDetail = buildDetail({
    kind: "cost-per-visit",
    filters: { timeRange: "1M", accountFilter: "1522" },
  });
  assert.equal(dailyDetail.dataSource, "MISA + HIS");
  assert.equal(dailyDetail.title, "Chi phí / lượt khám");
  assert.equal(dailyDetail.rows[0]?.[0], "2026-04-01");

  const monthlyDetail = buildDetail({
    kind: "cost-per-visit",
    filters: { timeRange: "1Y", accountFilter: "1522" },
  });
  assert.equal(monthlyDetail.rows[0]?.[0], "2026-03");
  assert.ok(monthlyDetail.summaryRows.some((row) => row.label.includes("Chi phí / lượt")));
});
