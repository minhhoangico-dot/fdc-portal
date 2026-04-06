import { supabase } from "../db/supabase";
import { logger } from "./logger";

export type AnomalyRule = "near_expiry" | "expired" | "zero_stock" | "low_stock" | "stock_spike";
export type ModuleType = "pharmacy" | "supply";

export interface AnomalyThresholdConfig {
  nearExpiryDays: number;
  nearExpiryHighDays: number;
  lowStockDays: number;
  lowStockHighDays: number;
  spikeMultiplier: number;
  spikeMinUsage: number;
  spikeMinAvgUsage: number;
  enabledRules: Set<AnomalyRule>;
}

const HARDCODED_DEFAULTS: Omit<AnomalyThresholdConfig, "enabledRules"> = {
  nearExpiryDays: 90,
  nearExpiryHighDays: 30,
  lowStockDays: 7,
  lowStockHighDays: 3,
  spikeMultiplier: 1.5,
  spikeMinUsage: 10,
  spikeMinAvgUsage: 2,
};

const ALL_RULES: AnomalyRule[] = ["near_expiry", "expired", "zero_stock", "low_stock", "stock_spike"];

interface ThresholdRow {
  rule_id: AnomalyRule;
  near_expiry_days: number | null;
  near_expiry_high_days: number | null;
  low_stock_days: number | null;
  low_stock_high_days: number | null;
  spike_multiplier: number | null;
  spike_min_usage: number | null;
  spike_min_avg_usage: number | null;
  enabled: boolean;
}

type ThresholdMap = Map<string, ThresholdRow[]>;

function buildKey(moduleType: string, category: string): string {
  return `${moduleType}::${category}`;
}

function mergeRows(rows: ThresholdRow[]): AnomalyThresholdConfig {
  const enabledRules = new Set<AnomalyRule>();
  let nearExpiryDays = HARDCODED_DEFAULTS.nearExpiryDays;
  let nearExpiryHighDays = HARDCODED_DEFAULTS.nearExpiryHighDays;
  let lowStockDays = HARDCODED_DEFAULTS.lowStockDays;
  let lowStockHighDays = HARDCODED_DEFAULTS.lowStockHighDays;
  let spikeMultiplier = HARDCODED_DEFAULTS.spikeMultiplier;
  let spikeMinUsage = HARDCODED_DEFAULTS.spikeMinUsage;
  let spikeMinAvgUsage = HARDCODED_DEFAULTS.spikeMinAvgUsage;

  for (const row of rows) {
    if (row.enabled) {
      enabledRules.add(row.rule_id);
    }

    if (row.rule_id === "near_expiry") {
      if (row.near_expiry_days != null) nearExpiryDays = row.near_expiry_days;
      if (row.near_expiry_high_days != null) nearExpiryHighDays = row.near_expiry_high_days;
    } else if (row.rule_id === "low_stock") {
      if (row.low_stock_days != null) lowStockDays = row.low_stock_days;
      if (row.low_stock_high_days != null) lowStockHighDays = row.low_stock_high_days;
    } else if (row.rule_id === "stock_spike") {
      if (row.spike_multiplier != null) spikeMultiplier = Number(row.spike_multiplier);
      if (row.spike_min_usage != null) spikeMinUsage = row.spike_min_usage;
      if (row.spike_min_avg_usage != null) spikeMinAvgUsage = Number(row.spike_min_avg_usage);
    }
  }

  return {
    nearExpiryDays,
    nearExpiryHighDays,
    lowStockDays,
    lowStockHighDays,
    spikeMultiplier,
    spikeMinUsage,
    spikeMinAvgUsage,
    enabledRules,
  };
}

export async function fetchThresholdConfigs(): Promise<ThresholdMap> {
  const { data, error } = await supabase
    .from("fdc_anomaly_thresholds")
    .select("module_type, category, rule_id, near_expiry_days, near_expiry_high_days, low_stock_days, low_stock_high_days, spike_multiplier, spike_min_usage, spike_min_avg_usage, enabled");

  if (error) {
    logger.warn("Failed to fetch anomaly thresholds, using hardcoded defaults", error);
    return new Map();
  }

  const map: ThresholdMap = new Map();
  for (const row of data || []) {
    const key = buildKey(row.module_type, row.category);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row as ThresholdRow);
  }

  return map;
}

export function resolveThresholds(
  thresholdMap: ThresholdMap,
  moduleType: ModuleType,
  category: string,
): AnomalyThresholdConfig {
  // Priority: exact (module::category) → default (module::__default__) → hardcoded
  const exactKey = buildKey(moduleType, category);
  const defaultKey = buildKey(moduleType, "__default__");

  const exactRows = thresholdMap.get(exactKey);
  if (exactRows && exactRows.length > 0) {
    return mergeRows(exactRows);
  }

  const defaultRows = thresholdMap.get(defaultKey);
  if (defaultRows && defaultRows.length > 0) {
    return mergeRows(defaultRows);
  }

  // Hardcoded fallback — all rules enabled
  return {
    ...HARDCODED_DEFAULTS,
    enabledRules: new Set(ALL_RULES),
  };
}

export function buildInventoryItemKey(
  sourceId: string | null | undefined,
  warehouse: string | null | undefined,
): string | null {
  const s = sourceId?.trim().toLowerCase() || "";
  const w = warehouse?.trim().toLowerCase() || "";
  if (!s || !w) return null;
  return `${s}::${w}`;
}

export function detectModuleType(hisMedicineId: string | null | undefined): ModuleType {
  return hisMedicineId?.startsWith("misa_") ? "supply" : "pharmacy";
}
