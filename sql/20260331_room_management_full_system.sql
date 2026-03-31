-- Room Management full-system rollout:
-- - add new portal roles
-- - add room workflow tables
-- - add downstream request handoffs
-- - extend request visibility helpers for the new finance role
-- This migration is additive and idempotent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_schema = tc.constraint_schema
     AND ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'CHECK'
      AND tc.table_name = 'fdc_role_catalog'
      AND ccu.column_name = 'role_key'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.fdc_role_catalog DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;

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
        'pharmacy_head',
        'accounting_supervisor',
        'lab_head',
        'chief_accountant',
        'internal_accountant',
        'hr_records',
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
VALUES
  ('pharmacy_head', 'Truong phong duoc', 'Review va tong hop de xuat cho khu nha thuoc.', 7, true),
  ('accounting_supervisor', 'Phu trach ke toan', 'Review va tong hop de xuat cho phong 304.', 8, true),
  ('lab_head', 'Truong phong xet nghiem', 'Review va tong hop de xuat cho khu xet nghiem.', 9, true),
  ('chief_accountant', 'Ke toan truong', 'Phe duyet tai chinh va forward thu cong khi can.', 10, true),
  ('internal_accountant', 'Ke toan noi bo', 'Nhan handoff xu ly tai chinh sau phe duyet.', 11, true),
  ('hr_records', 'Nhan su ho so', 'Nhan handoff luu tru va xu ly ho so.', 12, true)
ON CONFLICT (role_key) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

DO $$
DECLARE
  constraint_name text;
BEGIN
  IF to_regclass('public.fdc_user_mapping') IS NOT NULL THEN
    FOR constraint_name IN
      SELECT con.conname
      FROM pg_constraint con
      WHERE con.conrelid = 'public.fdc_user_mapping'::regclass
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) ILIKE '%role%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.fdc_user_mapping DROP CONSTRAINT %I',
        constraint_name
      );
    END LOOP;

    ALTER TABLE public.fdc_user_mapping
      ADD CONSTRAINT chk_fdc_user_mapping_role
      CHECK (
        role IN (
          'super_admin',
          'head_nurse',
          'director',
          'chairman',
          'dept_head',
          'accountant',
          'pharmacy_head',
          'accounting_supervisor',
          'lab_head',
          'chief_accountant',
          'internal_accountant',
          'hr_records',
          'staff',
          'doctor'
        )
      );
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  IF to_regclass('public.fdc_approval_steps') IS NOT NULL THEN
    FOR constraint_name IN
      SELECT con.conname
      FROM pg_constraint con
      WHERE con.conrelid = 'public.fdc_approval_steps'::regclass
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) ILIKE '%approver_role%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.fdc_approval_steps DROP CONSTRAINT %I',
        constraint_name
      );
    END LOOP;

    ALTER TABLE public.fdc_approval_steps
      ADD CONSTRAINT chk_fdc_approval_steps_approver_role
      CHECK (
        approver_role IN (
          'super_admin',
          'head_nurse',
          'director',
          'chairman',
          'dept_head',
          'accountant',
          'pharmacy_head',
          'accounting_supervisor',
          'lab_head',
          'chief_accountant',
          'internal_accountant',
          'hr_records',
          'staff',
          'doctor'
        )
      );
  END IF;
END $$;

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
        OR actor.role IN (
          'super_admin',
          'head_nurse',
          'director',
          'chairman',
          'accountant',
          'chief_accountant'
        )
        OR EXISTS (
          SELECT 1
          FROM public.fdc_approval_steps step
          WHERE step.request_id = req.id
            AND step.approver_id = actor.id
        )
        OR EXISTS (
          SELECT 1
          FROM public.fdc_delegations delegation
          JOIN public.fdc_approval_steps step
            ON step.approver_id = delegation.delegator_id
          WHERE step.request_id = req.id
            AND step.status = 'pending'
            AND delegation.delegate_id = actor.id
            AND current_date BETWEEN delegation.start_date AND delegation.end_date
            AND req.request_type = ANY (delegation.request_types)
        )
        OR EXISTS (
          SELECT 1
          FROM public.fdc_request_handoffs handoff
          WHERE handoff.request_id = req.id
            AND handoff.assignee_id = actor.id
        )
      )
  )
$function$;

CREATE TABLE IF NOT EXISTS public.fdc_room_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key TEXT NOT NULL UNIQUE,
  room_code TEXT NOT NULL UNIQUE,
  room_name TEXT NOT NULL,
  floor INTEGER NOT NULL CHECK (floor IN (1, 2, 3)),
  wing TEXT NOT NULL CHECK (wing IN ('left', 'right', 'center')),
  room_type TEXT NOT NULL,
  review_group TEXT NOT NULL CHECK (review_group IN ('pharmacy', 'accounting_304', 'lab', 'general_care')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fdc_room_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key TEXT NOT NULL,
  room_code TEXT NOT NULL,
  room_name TEXT NOT NULL,
  floor INTEGER NOT NULL CHECK (floor IN (1, 2, 3)),
  requester_id UUID NOT NULL REFERENCES public.fdc_user_mapping(id) ON DELETE RESTRICT,
  intake_type TEXT NOT NULL CHECK (intake_type IN ('material', 'maintenance')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  review_group TEXT NOT NULL CHECK (review_group IN ('pharmacy', 'accounting_304', 'lab', 'general_care')),
  reviewer_role TEXT NOT NULL CHECK (
    reviewer_role IN ('head_nurse', 'pharmacy_head', 'accounting_supervisor', 'lab_head')
  ),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'in_review', 'consolidated', 'promoted', 'approved', 'rejected', 'cancelled')
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fdc_room_intake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.fdc_room_intakes(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_price NUMERIC
);

CREATE TABLE IF NOT EXISTS public.fdc_room_intake_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id UUID NOT NULL REFERENCES public.fdc_room_intakes(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.fdc_approval_requests(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('consolidated', 'promoted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (intake_id, request_id, link_type)
);

CREATE TABLE IF NOT EXISTS public.fdc_request_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.fdc_approval_requests(id) ON DELETE CASCADE,
  source_step_id UUID REFERENCES public.fdc_approval_steps(id) ON DELETE SET NULL,
  assignee_id UUID NOT NULL REFERENCES public.fdc_user_mapping(id) ON DELETE RESTRICT,
  assignee_role TEXT NOT NULL CHECK (assignee_role IN ('internal_accountant', 'hr_records')),
  assigned_by UUID REFERENCES public.fdc_user_mapping(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'completed', 'cancelled')),
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_catalog_review_group
  ON public.fdc_room_catalog(review_group);

CREATE INDEX IF NOT EXISTS idx_room_intakes_requester_id
  ON public.fdc_room_intakes(requester_id);

CREATE INDEX IF NOT EXISTS idx_room_intakes_review_group
  ON public.fdc_room_intakes(review_group, reviewer_role, status);

CREATE INDEX IF NOT EXISTS idx_room_intake_links_request_id
  ON public.fdc_room_intake_links(request_id);

CREATE INDEX IF NOT EXISTS idx_request_handoffs_request_id
  ON public.fdc_request_handoffs(request_id);

CREATE INDEX IF NOT EXISTS idx_request_handoffs_assignee_id
  ON public.fdc_request_handoffs(assignee_id, status);

ALTER TABLE public.fdc_room_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdc_room_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdc_room_intake_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdc_room_intake_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdc_request_handoffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read room catalog" ON public.fdc_room_catalog;
CREATE POLICY "Authenticated users read room catalog"
ON public.fdc_room_catalog FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users read allowed room intakes" ON public.fdc_room_intakes;
CREATE POLICY "Users read allowed room intakes"
ON public.fdc_room_intakes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fdc_user_mapping actor
    WHERE actor.supabase_uid = auth.uid()
      AND (
        requester_id = actor.id
        OR reviewer_role = actor.role
        OR actor.role IN ('super_admin', 'chief_accountant', 'director', 'chairman')
      )
  )
);

DROP POLICY IF EXISTS "Users create own room intakes" ON public.fdc_room_intakes;
CREATE POLICY "Users create own room intakes"
ON public.fdc_room_intakes FOR INSERT
TO authenticated
WITH CHECK (
  requester_id = public.fdc_current_user_mapping_id()
);

DROP POLICY IF EXISTS "Reviewers update room intakes" ON public.fdc_room_intakes;
CREATE POLICY "Reviewers update room intakes"
ON public.fdc_room_intakes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fdc_user_mapping actor
    WHERE actor.supabase_uid = auth.uid()
      AND (
        reviewer_role = actor.role
        OR actor.role IN ('super_admin', 'chief_accountant')
      )
  )
);

DROP POLICY IF EXISTS "Users read intake items for visible intakes" ON public.fdc_room_intake_items;
CREATE POLICY "Users read intake items for visible intakes"
ON public.fdc_room_intake_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.fdc_room_intakes intake
    WHERE intake.id = intake_id
      AND (
        intake.requester_id = public.fdc_current_user_mapping_id()
        OR EXISTS (
          SELECT 1
          FROM public.fdc_user_mapping actor
          WHERE actor.supabase_uid = auth.uid()
            AND (
              intake.reviewer_role = actor.role
              OR actor.role IN ('super_admin', 'chief_accountant', 'director', 'chairman')
            )
        )
      )
  )
);

DROP POLICY IF EXISTS "Users insert items for own intakes" ON public.fdc_room_intake_items;
CREATE POLICY "Users insert items for own intakes"
ON public.fdc_room_intake_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.fdc_room_intakes intake
    WHERE intake.id = intake_id
      AND intake.requester_id = public.fdc_current_user_mapping_id()
  )
);

DROP POLICY IF EXISTS "Users read intake links for visible requests" ON public.fdc_room_intake_links;
CREATE POLICY "Users read intake links for visible requests"
ON public.fdc_room_intake_links FOR SELECT
TO authenticated
USING (public.fdc_can_view_request(request_id));

DROP POLICY IF EXISTS "Users read assigned handoffs" ON public.fdc_request_handoffs;
CREATE POLICY "Users read assigned handoffs"
ON public.fdc_request_handoffs FOR SELECT
TO authenticated
USING (
  assignee_id = public.fdc_current_user_mapping_id()
  OR EXISTS (
    SELECT 1
    FROM public.fdc_user_mapping actor
    WHERE actor.supabase_uid = auth.uid()
      AND actor.role IN ('super_admin', 'chief_accountant', 'director', 'chairman')
  )
);

DROP POLICY IF EXISTS "Privileged users create handoffs" ON public.fdc_request_handoffs;
CREATE POLICY "Privileged users create handoffs"
ON public.fdc_request_handoffs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.fdc_user_mapping actor
    WHERE actor.supabase_uid = auth.uid()
      AND actor.role IN ('super_admin', 'chief_accountant', 'director', 'chairman')
  )
);

DROP POLICY IF EXISTS "Assignees or privileged users update handoffs" ON public.fdc_request_handoffs;
CREATE POLICY "Assignees or privileged users update handoffs"
ON public.fdc_request_handoffs FOR UPDATE
TO authenticated
USING (
  assignee_id = public.fdc_current_user_mapping_id()
  OR EXISTS (
    SELECT 1
    FROM public.fdc_user_mapping actor
    WHERE actor.supabase_uid = auth.uid()
      AND actor.role IN ('super_admin', 'chief_accountant')
  )
);
