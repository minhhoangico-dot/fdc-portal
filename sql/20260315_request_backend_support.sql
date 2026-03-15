-- Backend support for attachments, cost center, reporting access, and push subscriptions.
-- This repo maps auth.uid() -> public.fdc_user_mapping.supabase_uid, so policies must
-- resolve the app-level user id through fdc_user_mapping instead of comparing auth.uid()
-- to public table UUIDs directly.

INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'request-attachments');

DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects;
CREATE POLICY "Authenticated users can read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'request-attachments');

DROP POLICY IF EXISTS "Uploader or admin can delete" ON storage.objects;
CREATE POLICY "Uploader or admin can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND (
    EXISTS (
      SELECT 1
      FROM public.fdc_approval_requests req
      JOIN public.fdc_user_mapping requester
        ON requester.id = req.requester_id
      WHERE req.id::text = (storage.foldername(name))[1]
        AND requester.supabase_uid = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.fdc_user_mapping um
      WHERE um.supabase_uid = auth.uid()
        AND um.role IN ('super_admin', 'director')
    )
  )
);

CREATE TABLE IF NOT EXISTS public.fdc_request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.fdc_approval_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES public.fdc_user_mapping(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_attachments_request_id
  ON public.fdc_request_attachments(request_id);

ALTER TABLE public.fdc_request_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read attachments" ON public.fdc_request_attachments;
CREATE POLICY "Authenticated can read attachments"
ON public.fdc_request_attachments FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Requester can insert attachments" ON public.fdc_request_attachments;
CREATE POLICY "Requester can insert attachments"
ON public.fdc_request_attachments FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = (
    SELECT id
    FROM public.fdc_user_mapping
    WHERE supabase_uid = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.fdc_approval_requests req
    JOIN public.fdc_user_mapping requester
      ON requester.id = req.requester_id
    WHERE req.id = request_id
      AND requester.supabase_uid = auth.uid()
  )
);

DROP POLICY IF EXISTS "Uploader or admin can delete attachments" ON public.fdc_request_attachments;
CREATE POLICY "Uploader or admin can delete attachments"
ON public.fdc_request_attachments FOR DELETE
TO authenticated
USING (
  uploaded_by = (
    SELECT id
    FROM public.fdc_user_mapping
    WHERE supabase_uid = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.fdc_user_mapping um
    WHERE um.supabase_uid = auth.uid()
      AND um.role IN ('super_admin', 'director')
  )
);

ALTER TABLE public.fdc_approval_requests
ADD COLUMN IF NOT EXISTS cost_center TEXT;

CREATE INDEX IF NOT EXISTS idx_approval_requests_cost_center
  ON public.fdc_approval_requests(cost_center);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'fdc_approval_requests'
      AND constraint_name = 'chk_cost_center'
  ) THEN
    ALTER TABLE public.fdc_approval_requests
    ADD CONSTRAINT chk_cost_center CHECK (
      cost_center IS NULL OR cost_center IN (
        'general', 'clinic', 'pharmacy', 'lab', 'imaging',
        'admin', 'facility', 'marketing', 'it'
      )
    );
  END IF;
END $$;

DROP POLICY IF EXISTS "fdc_reporting_roles_read_all" ON public.fdc_approval_requests;
CREATE POLICY "fdc_reporting_roles_read_all"
ON public.fdc_approval_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fdc_user_mapping um
    WHERE um.supabase_uid = auth.uid()
      AND um.role IN ('super_admin', 'director', 'chairman', 'accountant')
  )
);

CREATE TABLE IF NOT EXISTS public.fdc_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.fdc_user_mapping(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.fdc_push_subscriptions(user_id);

ALTER TABLE public.fdc_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.fdc_push_subscriptions;
CREATE POLICY "Users manage own subscriptions"
ON public.fdc_push_subscriptions FOR ALL
TO authenticated
USING (
  user_id = (
    SELECT id
    FROM public.fdc_user_mapping
    WHERE supabase_uid = auth.uid()
  )
)
WITH CHECK (
  user_id = (
    SELECT id
    FROM public.fdc_user_mapping
    WHERE supabase_uid = auth.uid()
  )
);
