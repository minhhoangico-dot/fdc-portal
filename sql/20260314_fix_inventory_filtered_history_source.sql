CREATE OR REPLACE FUNCTION get_inventory_filtered_history(
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(snapshot_date date, total_stock numeric, total_value numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.snapshot_date,
    SUM(s.current_stock)::numeric AS total_stock,
    SUM(s.current_stock * COALESCE(s.unit_price, 0))::numeric AS total_value
  FROM fdc_inventory_snapshots s
  WHERE s.his_medicineid LIKE 'misa_%'
    AND (p_category IS NULL OR s.category = p_category)
    AND (p_search IS NULL OR s.name ILIKE '%' || p_search || '%')
  GROUP BY s.snapshot_date
  ORDER BY s.snapshot_date;
END;
$$ LANGUAGE plpgsql;
