/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  anomalyMatchesInventoryItem,
  buildInventoryItemKey,
  mapInventorySnapshotToItem,
  preferWarehouseSpecificInventoryItems,
} from '../../src/lib/inventory-identity';

test('maps pharmacy snapshots to display the real medicine code while keeping source identity', () => {
  const item = mapInventorySnapshotToItem({
    id: 'row-1',
    his_medicineid: 'S100',
    medicine_code: 'TH001',
    name: 'Paracetamol 500mg',
    category: 'Thuoc',
    warehouse: 'Kho Thuoc',
    current_stock: 12,
    unit: 'Vien',
    status: 'in_stock',
    batch_number: 'LO-01',
    expiry_date: '2026-12-31',
    snapshot_date: '2026-04-04',
    unit_price: 1500,
  });

  assert.equal(item.sku, 'TH001');
  assert.equal(item.medicineCode, 'TH001');
  assert.equal(item.sourceId, 'S100');
  assert.equal(item.inventoryKey, buildInventoryItemKey('S100', 'Kho Thuoc'));
});

test('anomaly matching prefers stable inventory identity over shared item name', () => {
  const anomaly = {
    id: 'a-1',
    materialId: 'Paracetamol 500mg',
    rule: 'low_stock',
    severity: 'high',
    description: 'Low stock',
    detectedAt: '2026-04-04T00:00:00.000Z',
    acknowledged: false,
    inventoryKey: buildInventoryItemKey('S100', 'Kho Thuoc'),
  } as const;

  const matchingItem = {
    id: 'row-1',
    name: 'Paracetamol 500mg',
    sku: 'TH001',
    category: 'Thuoc',
    warehouse: 'Kho Thuoc',
    currentStock: 2,
    unit: 'Vien',
    status: 'in_stock',
    lastUpdated: '2026-04-04',
    sourceId: 'S100',
    inventoryKey: buildInventoryItemKey('S100', 'Kho Thuoc'),
  } as const;

  const differentLotSameName = {
    ...matchingItem,
    id: 'row-2',
    sourceId: 'S200',
    inventoryKey: buildInventoryItemKey('S200', 'Kho Le'),
    warehouse: 'Kho Le',
  } as const;

  assert.equal(anomalyMatchesInventoryItem(anomaly, matchingItem), true);
  assert.equal(anomalyMatchesInventoryItem(anomaly, differentLotSameName), false);
});

test('legacy anomalies without identity still fall back to name matching', () => {
  const legacyAnomaly = {
    id: 'legacy-1',
    materialId: 'Paracetamol 500mg',
    rule: 'near_expiry',
    severity: 'medium',
    description: 'Near expiry',
    detectedAt: '2026-04-04T00:00:00.000Z',
    acknowledged: false,
    inventoryKey: null,
  };

  const item = {
    id: 'row-1',
    name: 'Paracetamol 500mg',
    sku: 'TH001',
    category: 'Thuoc',
    warehouse: 'Kho Thuoc',
    currentStock: 2,
    unit: 'Vien',
    status: 'in_stock',
    lastUpdated: '2026-04-04',
    sourceId: 'S100',
    inventoryKey: buildInventoryItemKey('S100', 'Kho Thuoc'),
  };

  assert.equal(anomalyMatchesInventoryItem(legacyAnomaly, item), true);
});

test('legacy supply anomaly keys tied to Khoi Vat Tu still match the same source item in real warehouses', () => {
  const anomaly = {
    id: 'supply-legacy-1',
    materialId: 'Bo xanh nu size M',
    rule: 'low_stock',
    severity: 'medium',
    description: 'Legacy grouped warehouse key',
    detectedAt: '2026-04-06T00:00:00.000Z',
    acknowledged: false,
    inventoryKey: buildInventoryItemKey('misa_AO018', 'Khoi Vat Tu'),
  };

  const item = {
    id: 'row-1',
    name: 'Bo xanh nu size M',
    sku: 'AO018',
    category: 'Vat tu',
    warehouse: 'Kho vat tu - Khac',
    currentStock: 170,
    unit: 'Bo',
    status: 'in_stock',
    lastUpdated: '2026-04-06',
    sourceId: 'misa_AO018__stock_1521',
    inventoryKey: buildInventoryItemKey('misa_AO018__stock_1521', 'Kho vat tu - Khac'),
  };

  assert.equal(anomalyMatchesInventoryItem(anomaly, item), true);
});

test('prefers warehouse-specific MISA rows over legacy Khoi Vat Tu rows for the same source item', () => {
  const filtered = preferWarehouseSpecificInventoryItems([
    {
      id: 'legacy-row',
      name: 'Bo xanh nu size M',
      sku: 'AO018',
      category: 'Vat tu',
      warehouse: 'Khoi Vat Tu',
      currentStock: 179,
      unit: 'Bo',
      status: 'in_stock',
      lastUpdated: '2026-04-06',
      sourceId: 'misa_AO018',
      inventoryKey: buildInventoryItemKey('misa_AO018', 'Khoi Vat Tu'),
    },
    {
      id: 'split-row-1',
      name: 'Bo xanh nu size M',
      sku: 'AO018',
      category: 'Vat tu',
      warehouse: 'Kho vat tu - Khac',
      currentStock: 170,
      unit: 'Bo',
      status: 'in_stock',
      lastUpdated: '2026-04-06',
      sourceId: 'misa_AO018__stock_1521',
      inventoryKey: buildInventoryItemKey('misa_AO018__stock_1521', 'Kho vat tu - Khac'),
    },
    {
      id: 'split-row-2',
      name: 'Bo xanh nu size M',
      sku: 'AO018',
      category: 'Vat tu',
      warehouse: 'Kho vat tu - Dich vu',
      currentStock: 9,
      unit: 'Bo',
      status: 'in_stock',
      lastUpdated: '2026-04-06',
      sourceId: 'misa_AO018__stock_1522',
      inventoryKey: buildInventoryItemKey('misa_AO018__stock_1522', 'Kho vat tu - Dich vu'),
    },
  ]);

  assert.deepEqual(filtered.map((item) => item.id), ['split-row-1', 'split-row-2']);
});
