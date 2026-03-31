-- TV screen management for clinic displays.
-- Each row maps a slug to a content URL (external iframe or internal route).

CREATE TABLE IF NOT EXISTS public.fdc_tv_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  content_type TEXT NOT NULL DEFAULT 'url'
    CHECK (content_type IN ('url', 'internal')),
  content_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  refresh_interval_seconds INTEGER NOT NULL DEFAULT 300,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_fdc_tv_screens_updated_at ON public.fdc_tv_screens;
CREATE TRIGGER trg_fdc_tv_screens_updated_at
BEFORE UPDATE ON public.fdc_tv_screens
FOR EACH ROW EXECUTE FUNCTION public.fdc_touch_updated_at();

ALTER TABLE public.fdc_tv_screens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active TV screens" ON public.fdc_tv_screens;
CREATE POLICY "Anyone can read active TV screens"
  ON public.fdc_tv_screens FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage TV screens" ON public.fdc_tv_screens;
CREATE POLICY "Super admins can manage TV screens"
  ON public.fdc_tv_screens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.fdc_user_mapping
      WHERE supabase_uid = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fdc_user_mapping
      WHERE supabase_uid = auth.uid() AND role = 'super_admin'
    )
  );
