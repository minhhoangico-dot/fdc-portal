-- Dynamic anomaly thresholds configuration
-- Allows admin to configure detection rules per module/category

-- 1. Create threshold config table
CREATE TABLE IF NOT EXISTS fdc_anomaly_thresholds (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_type text NOT NULL CHECK (module_type IN ('pharmacy', 'supply')),
  category text NOT NULL DEFAULT '__default__',
  rule_id text NOT NULL CHECK (rule_id IN ('near_expiry','expired','zero_stock','low_stock','stock_spike')),
  near_expiry_days int,
  near_expiry_high_days int,
  low_stock_days int,
  low_stock_high_days int,
  spike_multiplier numeric(5,2),
  spike_min_usage int,
  spike_min_avg_usage numeric(8,2),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (module_type, category, rule_id)
);

-- 2. Add module_type and inventory_item_key to anomalies table
ALTER TABLE fdc_analytics_anomalies
  ADD COLUMN IF NOT EXISTS module_type text,
  ADD COLUMN IF NOT EXISTS inventory_item_key text;

-- 3. Backfill module_type for existing anomalies
UPDATE fdc_analytics_anomalies a
SET module_type = CASE
  WHEN EXISTS (
    SELECT 1 FROM fdc_inventory_snapshots s
    WHERE s.name = a.material_name
      AND s.his_medicineid LIKE 'misa_%'
    LIMIT 1
  ) THEN 'supply'
  ELSE 'pharmacy'
END
WHERE a.module_type IS NULL;

-- 4. Seed default thresholds (mirrors current hardcoded values)
INSERT INTO fdc_anomaly_thresholds
  (module_type, category, rule_id, near_expiry_days, near_expiry_high_days, low_stock_days, low_stock_high_days, spike_multiplier, spike_min_usage, spike_min_avg_usage, enabled)
VALUES
  -- Pharmacy defaults
  ('pharmacy', '__default__', 'near_expiry',  90, 30, NULL, NULL, NULL, NULL, NULL, true),
  ('pharmacy', '__default__', 'expired',      NULL, NULL, NULL, NULL, NULL, NULL, NULL, true),
  ('pharmacy', '__default__', 'zero_stock',   NULL, NULL, NULL, NULL, NULL, NULL, NULL, true),
  ('pharmacy', '__default__', 'low_stock',    NULL, NULL, 7, 3, NULL, NULL, NULL, true),
  ('pharmacy', '__default__', 'stock_spike',  NULL, NULL, NULL, NULL, 1.50, 10, 2.0, true),
  -- Supply defaults (near_expiry/expired disabled — supply items rarely have expiry)
  ('supply', '__default__', 'near_expiry',    90, 30, NULL, NULL, NULL, NULL, NULL, false),
  ('supply', '__default__', 'expired',        NULL, NULL, NULL, NULL, NULL, NULL, NULL, false),
  ('supply', '__default__', 'zero_stock',     NULL, NULL, NULL, NULL, NULL, NULL, NULL, true),
  ('supply', '__default__', 'low_stock',      NULL, NULL, 7, 3, NULL, NULL, NULL, true),
  ('supply', '__default__', 'stock_spike',    NULL, NULL, NULL, NULL, 1.50, 10, 2.0, true)
ON CONFLICT (module_type, category, rule_id) DO NOTHING;
