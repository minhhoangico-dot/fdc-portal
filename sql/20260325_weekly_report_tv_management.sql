-- Backfill weekly report TV rows so TV management can identify them via settings.featureKey
-- and point them at the new /tv-management/weekly-report/tv namespace.
-- If no weekly report row exists yet, seed a default internal TV screen entry.

UPDATE public.fdc_tv_screens
SET
  content_url = '/tv-management/weekly-report/tv',
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{featureKey}',
    '"weekly_report"'::jsonb,
    true
  ),
  updated_at = now()
WHERE content_type = 'internal'
  AND content_url IN ('/weekly-report/tv', '/tv-management/weekly-report/tv');

INSERT INTO public.fdc_tv_screens (
  slug,
  name,
  location,
  content_type,
  content_url,
  is_active,
  refresh_interval_seconds,
  settings
)
SELECT
  'weekly-report',
  U&'TV B\00E1o c\00E1o giao ban',
  NULL,
  'internal',
  '/tv-management/weekly-report/tv',
  true,
  300,
  '{"featureKey":"weekly_report"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM public.fdc_tv_screens
  WHERE slug = 'weekly-report'
     OR settings->>'featureKey' = 'weekly_report'
     OR (
       content_type = 'internal'
       AND content_url IN ('/weekly-report/tv', '/tv-management/weekly-report/tv')
     )
);
