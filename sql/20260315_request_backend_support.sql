-- Backend support for attachments, cost center, delegated approvals, and push subscriptions.
-- This script is intentionally idempotent so it can be re-run on environments that already
-- applied an earlier version with weaker policies.

CREATE OR REPLACE FUNCTION public.fdc_current_user_mapping_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT um.id
  FROM public.fdc_user_mapping um
  WHERE um.supabase_uid = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.fdc_can_view_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.fdc_approval_requests req
    JOIN public.fdc_user_mapping actor
      ON actor.supabase_uid = auth.uid()
    WHERE req.id = p_request_id
      AND (
        req.requester_id = actor.id
        OR actor.role IN ('super_admin', 'director', 'chairman', 'accountant')
        OR EXISTS (
          SELECT 1
          FROM public.fdc_approval_steps step
          WHERE step.request_id = req.id
            AND step.approver_id = actor.id
        )
        OR EXISTS (
          SELECT 1
          FROM public.fdc_approval_steps step
          JOIN public.fdc_delegations delegation
            ON delegation.delegator_id = step.approver_id
          WHERE step.request_id = req.id
            AND step.status = 'pending'
            AND delegation.delegate_id = actor.id
            AND current_date BETWEEN delegation.start_date AND delegation.end_date
            AND req.request_type = ANY (delegation.request_types)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.fdc_can_act_on_step(p_step_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.fdc_approval_steps step
    JOIN public.fdc_approval_requests req
      ON req.id = step.request_id
    JOIN public.fdc_user_mapping actor
      ON actor.supabase_uid = auth.uid()
    WHERE step.id = p_step_id
      AND step.status = 'pending'
      AND (
        actor.role = 'super_admin'
        OR step.approver_id = actor.id
        OR EXISTS (
          SELECT 1
          FROM public.fdc_delegations delegation
          WHERE delegation.delegator_id = step.approver_id
            AND delegation.delegate_id = actor.id
            AND current_date BETWEEN delegation.start_date AND delegation.end_date
            AND req.request_type = ANY (delegation.request_types)
        )
      )
  )
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', false)
ON CONFLICT (id) DO UPDATE
SET public = false;

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects;
DROP POLICY IF EXISTS "Uploader or admin can delete" ON storage.objects;
DROP POLICY IF EXISTS "Requester uploads own request attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authorized users read request attachments" ON storage.objects;
DROP POLICY IF EXISTS "Requester uploader or admin delete objects" ON storage.objects;

CREATE POLICY "Requester uploads own request attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'request-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.fdc_approval_requests req
    WHERE req.id::text = (storage.foldername(name))[1]
      AND req.requester_id = public.fdc_current_user_mapping_id()
  )
);

CREATE POLICY "Authorized users read request attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.fdc_request_attachments attachment
    WHERE attachment.storage_path = name
      AND public.fdc_can_view_request(attachment.request_id)
  )
);

CREATE POLICY "Requester uploader or admin delete objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.fdc_request_attachments attachment
    JOIN public.fdc_approval_requests req
      ON req.id = attachment.request_id
    JOIN public.fdc_user_mapping actor
      ON actor.supabase_uid = auth.uid()
    WHERE attachment.storage_path = name
      AND (
        attachment.uploaded_by = actor.id
        OR req.requester_id = actor.id
        OR actor.role IN ('super_admin', 'director')
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
  public_url TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.fdc_user_mapping(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fdc_request_attachments
  ALTER COLUMN public_url DROP NOT NULL;

UPDATE public.fdc_request_attachments
SET public_url = NULL
WHERE public_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_request_attachments_request_id
  ON public.fdc_request_attachments(request_id);

ALTER TABLE public.fdc_request_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read attachments" ON public.fdc_request_attachments;
DROP POLICY IF EXISTS "Requester can insert attachments" ON public.fdc_request_attachments;
DROP POLICY IF EXISTS "Uploader or admin can delete attachments" ON public.fdc_request_attachments;
DROP POLICY IF EXISTS "Authorized users read attachment metadata" ON public.fdc_request_attachments;
DROP POLICY IF EXISTS "Requester inserts attachment metadata" ON public.fdc_request_attachments;
DROP POLICY IF EXISTS "Requester uploader or admin delete attachment metadata" ON public.fdc_request_attachments;

CREATE POLICY "Authorized users read attachment metadata"
ON public.fdc_request_attachments FOR SELECT
TO authenticated
USING (public.fdc_can_view_request(request_id));

CREATE POLICY "Requester inserts attachment metadata"
ON public.fdc_request_attachments FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = public.fdc_current_user_mapping_id()
  AND EXISTS (
    SELECT 1
    FROM public.fdc_approval_requests req
    WHERE req.id = request_id
      AND req.requester_id = public.fdc_current_user_mapping_id()
  )
);

CREATE POLICY "Requester uploader or admin delete attachment metadata"
ON public.fdc_request_attachments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fdc_approval_requests req
    JOIN public.fdc_user_mapping actor
      ON actor.supabase_uid = auth.uid()
    WHERE req.id = request_id
      AND (
        uploaded_by = actor.id
        OR req.requester_id = actor.id
        OR actor.role IN ('super_admin', 'director')
      )
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

DROP POLICY IF EXISTS "fdc_approver_view" ON public.fdc_approval_requests;
DROP POLICY IF EXISTS "fdc_own_requests" ON public.fdc_approval_requests;
DROP POLICY IF EXISTS "fdc_reporting_roles_read_all" ON public.fdc_approval_requests;
DROP POLICY IF EXISTS "fdc_request_read_access" ON public.fdc_approval_requests;

CREATE POLICY "fdc_request_read_access"
ON public.fdc_approval_requests FOR SELECT
TO authenticated
USING (public.fdc_can_view_request(id));

DROP POLICY IF EXISTS "fdc_read_steps" ON public.fdc_approval_steps;
DROP POLICY IF EXISTS "fdc_update_steps" ON public.fdc_approval_steps;

CREATE POLICY "fdc_read_steps"
ON public.fdc_approval_steps FOR SELECT
TO authenticated
USING (public.fdc_can_view_request(request_id));

CREATE POLICY "fdc_update_steps"
ON public.fdc_approval_steps FOR UPDATE
TO authenticated
USING (public.fdc_can_act_on_step(id));

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
  user_id = public.fdc_current_user_mapping_id()
)
WITH CHECK (
  user_id = public.fdc_current_user_mapping_id()
);
