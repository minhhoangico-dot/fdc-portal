/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * khoTabs — static configuration for the parked Kho & Dược workspace:
 * the warehouse switcher (Thuốc | Vật tư) and the per-warehouse sub-tab set.
 *
 * Pure config: no JSX (this is a .ts file — icons are passed as lucide
 * component references and rendered by KhoWorkspace), no supabase, no
 * viewmodels. Labels are the Vietnamese strings from the direction doc.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  BarChart2,
  ClipboardCheck,
  DollarSign,
  List,
  Package,
  Pill,
} from 'lucide-react';

export type WarehouseKey = 'thuoc' | 'vat-tu';

export type KhoTabKey =
  | 'tong-quan'
  | 'danh-sach'
  | 'tieu-thu'
  | 'nhap-xuat'
  | 'kiem-ke'
  | 'gia-tri'
  | 'bat-thuong';

export interface WarehouseDef {
  key: WarehouseKey;
  label: string;
  icon: LucideIcon;
}

export interface KhoTabDef {
  key: KhoTabKey;
  label: string;
  icon: LucideIcon;
}

/** Warehouse switcher options (order = display order). */
export const WAREHOUSES: readonly WarehouseDef[] = [
  { key: 'thuoc', label: 'Thuốc', icon: Pill },
  { key: 'vat-tu', label: 'Vật tư', icon: Package },
];

/** Thuốc sub-tabs: the four shared surfaces only. */
export const THUOC_TABS: readonly KhoTabDef[] = [
  { key: 'tong-quan', label: 'Tổng quan', icon: BarChart2 },
  { key: 'danh-sach', label: 'Danh sách', icon: List },
  { key: 'gia-tri', label: 'Giá trị', icon: DollarSign },
  { key: 'bat-thuong', label: 'Bất thường', icon: AlertTriangle },
];

/** Vật tư sub-tabs: the four shared surfaces plus the three Vật tư-only tabs. */
export const VAT_TU_TABS: readonly KhoTabDef[] = [
  { key: 'tong-quan', label: 'Tổng quan', icon: BarChart2 },
  { key: 'danh-sach', label: 'Danh sách', icon: List },
  { key: 'tieu-thu', label: 'Tiêu thụ', icon: Activity },
  { key: 'nhap-xuat', label: 'Nhập xuất', icon: ArrowUpDown },
  { key: 'kiem-ke', label: 'Kiểm kê', icon: ClipboardCheck },
  { key: 'gia-tri', label: 'Giá trị', icon: DollarSign },
  { key: 'bat-thuong', label: 'Bất thường', icon: AlertTriangle },
];

/** Sub-tab set for a given warehouse. */
export function getKhoTabs(warehouse: WarehouseKey): readonly KhoTabDef[] {
  return warehouse === 'thuoc' ? THUOC_TABS : VAT_TU_TABS;
}

/** Default sub-tab (present in both warehouses). */
export const DEFAULT_TAB: KhoTabKey = 'tong-quan';

/** Narrow an arbitrary string to a valid warehouse, falling back to Thuốc. */
export function coerceWarehouse(value: string | null): WarehouseKey {
  return value === 'vat-tu' ? 'vat-tu' : 'thuoc';
}

/** Narrow an arbitrary string to a tab valid for the given warehouse. */
export function coerceTab(warehouse: WarehouseKey, value: string | null): KhoTabKey {
  const tabs = getKhoTabs(warehouse);
  const match = tabs.find((tab) => tab.key === value);
  return match ? match.key : DEFAULT_TAB;
}
