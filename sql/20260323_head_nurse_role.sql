-- Add head_nurse as a fixed non-admin full-access operational role.
-- This migration is idempotent and can be re-run safely.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'fdc_role_catalog'
      AND constraint_name = 'chk_fdc_role_catalog_role_key'
  ) THEN
    ALTER TABLE public.fdc_role_catalog
      DROP CONSTRAINT chk_fdc_role_catalog_role_key;
  END IF;

  ALTER TABLE public.fdc_role_catalog
    ADD CONSTRAINT chk_fdc_role_catalog_role_key
    CHECK (
      role_key IN (
        'super_admin',
        'head_nurse',
        'director',
        'chairman',
        'dept_head',
        'accountant',
        'staff',
        'doctor'
      )
    );
END $$;

INSERT INTO public.fdc_role_catalog (
  role_key,
  display_name,
  description,
  sort_order,
  is_active
)
VALUES (
  'head_nurse',
  U&'\0110i\1EC1u d\01B0\1EE1ng tr\01B0\1EDFng',
  U&'To\00E0n quy\1EC1n nghi\1EC7p v\1EE5 tr\00EAn portal, ngo\1EA1i tr\1EEB c\00E1c ch\1EE9c n\0103ng qu\1EA3n tr\1ECB h\1EC7 th\1ED1ng.',
  2,
  true
)
ON CONFLICT (role_key) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

CREATE OR REPLACE FUNCTION public.fdc_can_view_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.fdc_approval_requests req
    JOIN public.fdc_user_mapping actor
      ON actor.supabase_uid = auth.uid()
    WHERE req.id = p_request_id
      AND (
        req.requester_id = actor.id
        OR actor.role IN ('super_admin', 'head_nurse', 'director', 'chairman', 'accountant')
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
$function$;

CREATE OR REPLACE FUNCTION public.fdc_can_act_on_step(p_step_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
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
        actor.role IN ('super_admin', 'head_nurse')
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
$function$;

DROP POLICY IF EXISTS "Requester uploader or admin delete objects" ON storage.objects;
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
        OR actor.role IN ('super_admin', 'head_nurse', 'director')
      )
  )
);

DROP POLICY IF EXISTS "Requester uploader or admin delete attachment metadata" ON public.fdc_request_attachments;
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
        OR actor.role IN ('super_admin', 'head_nurse', 'director')
      )
  )
);
