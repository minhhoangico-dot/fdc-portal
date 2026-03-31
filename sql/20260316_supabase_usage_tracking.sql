-- Aggregate-only helper for the admin Supabase quota dashboard.
-- This function is intentionally scoped to service_role so the client never reads
-- auth.users or storage.objects directly.

CREATE OR REPLACE FUNCTION public.fdc_get_supabase_usage_snapshot()
RETURNS TABLE (
  database_size_bytes bigint,
  storage_size_bytes bigint,
  auth_users_total bigint,
  mau_calendar_month_estimate bigint,
  generated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH auth_summary AS (
    SELECT
      count(*)::bigint AS auth_users_total,
      count(*) FILTER (
        WHERE au.last_sign_in_at >= date_trunc('month', now())
      )::bigint AS mau_calendar_month_estimate
    FROM auth.users au
  ),
  storage_summary AS (
    SELECT
      coalesce(
        sum(
          coalesce(nullif(obj.metadata ->> 'size', '')::bigint, 0)
        ),
        0
      )::bigint AS storage_size_bytes
    FROM storage.objects obj
  )
  SELECT
    pg_database_size(current_database())::bigint AS database_size_bytes,
    storage_summary.storage_size_bytes,
    auth_summary.auth_users_total,
    auth_summary.mau_calendar_month_estimate,
    now() AS generated_at
  FROM auth_summary, storage_summary
$$;

REVOKE ALL ON FUNCTION public.fdc_get_supabase_usage_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fdc_get_supabase_usage_snapshot() FROM anon;
REVOKE ALL ON FUNCTION public.fdc_get_supabase_usage_snapshot() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fdc_get_supabase_usage_snapshot() TO service_role;
