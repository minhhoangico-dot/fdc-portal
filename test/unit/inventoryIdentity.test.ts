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
