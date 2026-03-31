-- Seed TV screen for the laboratory dashboard launcher/public route pair.

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
VALUES (
  'xet-nghiem',
  'TV Xét nghiệm',
  'Khoa Xét nghiệm',
  'internal',
  '/lab-dashboard/tv',
  true,
  60,
  '{}'::jsonb
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  content_type = EXCLUDED.content_type,
  content_url = EXCLUDED.content_url,
  is_active = EXCLUDED.is_active,
  refresh_interval_seconds = EXCLUDED.refresh_interval_seconds,
  settings = EXCLUDED.settings,
  updated_at = now();
