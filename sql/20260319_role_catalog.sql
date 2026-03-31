-- Fixed role catalog metadata for frontend role labels and assignment dropdowns.
-- Permission matrix stays in application code; this table only stores role metadata.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.fdc_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.fdc_role_catalog (
  role_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'fdc_role_catalog'
      AND constraint_name = 'chk_fdc_role_catalog_role_key'
  ) THEN
    ALTER TABLE public.fdc_role_catalog
      ADD CONSTRAINT chk_fdc_role_catalog_role_key
      CHECK (
        role_key IN (
          'super_admin',
          'director',
          'chairman',
          'dept_head',
          'accountant',
          'staff',
          'doctor'
        )
      );
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_fdc_role_catalog_updated_at
  ON public.fdc_role_catalog;
CREATE TRIGGER trg_fdc_role_catalog_updated_at
BEFORE UPDATE ON public.fdc_role_catalog
FOR EACH ROW
EXECUTE FUNCTION public.fdc_touch_updated_at();

ALTER TABLE public.fdc_role_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read role catalog"
  ON public.fdc_role_catalog;
CREATE POLICY "Authenticated users can read role catalog"
  ON public.fdc_role_catalog FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Super admins can manage role catalog"
  ON public.fdc_role_catalog;
CREATE POLICY "Super admins can manage role catalog"
  ON public.fdc_role_catalog FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.fdc_user_mapping
      WHERE supabase_uid = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.fdc_user_mapping
      WHERE supabase_uid = auth.uid() AND role = 'super_admin'
    )
  );

INSERT INTO public.fdc_role_catalog (
  role_key,
  display_name,
  description,
  sort_order,
  is_active
)
VALUES
  (
    'super_admin',
    'KTT / Admin',
    'Toàn quyền cấu hình hệ thống và quản trị người dùng.',
    1,
    true
  ),
  (
    'director',
    'Giám đốc',
    'Phê duyệt cấp giám đốc và theo dõi vận hành chung.',
    2,
    true
  ),
  (
    'chairman',
    'CT HĐQT',
    'Phê duyệt cấp chủ tịch hội đồng quản trị.',
    3,
    true
  ),
  (
    'dept_head',
    'Trưởng phòng',
    'Quản lý phòng ban và phê duyệt cấp trưởng phòng.',
    4,
    true
  ),
  (
    'accountant',
    'Kế toán',
    'Xử lý nghiệp vụ tài chính và phê duyệt kế toán.',
    5,
    true
  ),
  (
    'staff',
    'Nhân viên',
    'Sử dụng các chức năng cơ bản của portal.',
    6,
    true
  ),
  (
    'doctor',
    'Bác sĩ',
    'Nhân sự y tế với các chức năng nghiệp vụ cơ bản.',
    7,
    true
  )
ON CONFLICT (role_key) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
