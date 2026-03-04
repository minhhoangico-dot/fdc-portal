export type InventoryCategory = 'y_te' | 'van_phong' | 'thiet_bi';
export type Warehouse = 'kho_chinh' | 'nha_thuoc';
export type AnomalyRule = 'spike' | 'ratio' | 'single_day';
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: InventoryCategory;
  warehouse: Warehouse;
  currentStock: number;
  approvedExport: number;
  unit: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  minQuantity: number;
  lastUpdated: string;
}

export interface InventoryAnomaly {
  id: string;
  materialId: string;
  rule: AnomalyRule;
  severity: AnomalySeverity;
  description: string;
  detectedAt: string;
  acknowledged: boolean;
}

export interface UsageTrend {
  date: string;
  usage: number;
  patientCount: number;
}

export interface TopMaterial {
  materialId: string;
  name: string;
  consumption: number;
  unit: string;
}
