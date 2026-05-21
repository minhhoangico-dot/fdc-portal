-- Attendance module schema
-- Adds Hikvision employee roster, schedule settings, per-employee exceptions, and
-- extends fdc_emp_attendance for idempotent aggregation by the bridge.

-- 1. Hikvision roster cache, linked back to portal users
CREATE TABLE IF NOT EXISTS fdc_attendance_employees (
  employee_no    text PRIMARY KEY,
  name           text NOT NULL,
  card_no        text,
  user_type      text DEFAULT 'normal',
  valid          boolean NOT NULL DEFAULT true,
  hidden         boolean NOT NULL DEFAULT false,
  user_id        uuid REFERENCES fdc_user_mapping(id),
  department     text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fdc_attendance_employees_user_id
  ON fdc_attendance_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_fdc_attendance_employees_department
  ON fdc_attendance_employees(department);

-- 2. Global + per-key attendance settings
CREATE TABLE IF NOT EXISTS fdc_attendance_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES fdc_user_mapping(id)
);

-- Seed the global schedule row
INSERT INTO fdc_attendance_settings (key, value)
VALUES (
  'global_schedule',
  jsonb_build_object(
    'startTime', '08:00',
    'endTime', '17:30',
    'allowedLateMinutes', 5
  )
)
ON CONFLICT (key) DO NOTHING;

-- 3. Per-employee schedule overrides
CREATE TABLE IF NOT EXISTS fdc_attendance_schedule_exceptions (
  employee_no          text PRIMARY KEY REFERENCES fdc_attendance_employees(employee_no) ON DELETE CASCADE,
  start_time           text NOT NULL,
  end_time             text NOT NULL,
  allowed_late_minutes int  NOT NULL DEFAULT 0,
  note                 text,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           uuid REFERENCES fdc_user_mapping(id)
);

-- 4. Extend fdc_emp_attendance so the bridge can upsert daily aggregates safely
ALTER TABLE fdc_emp_attendance
  ADD COLUMN IF NOT EXISTS employee_no     text,
  ADD COLUMN IF NOT EXISTS schedule_source text DEFAULT 'global';

CREATE UNIQUE INDEX IF NOT EXISTS uq_fdc_emp_attendance_emp_date
  ON fdc_emp_attendance(employee_no, date)
  WHERE employee_no IS NOT NULL;

-- 5. Row-level security on the new tables (defense-in-depth)
ALTER TABLE fdc_attendance_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdc_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fdc_attendance_schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read employees (UI applies department scope client-side
-- and via the matching policy on fdc_emp_attendance below).
DROP POLICY IF EXISTS attendance_employees_read ON fdc_attendance_employees;
CREATE POLICY attendance_employees_read ON fdc_attendance_employees
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS attendance_settings_read ON fdc_attendance_settings;
CREATE POLICY attendance_settings_read ON fdc_attendance_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS attendance_settings_write ON fdc_attendance_settings;
CREATE POLICY attendance_settings_write ON fdc_attendance_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fdc_user_mapping
      WHERE supabase_uid = auth.uid()
        AND role IN ('super_admin','director','chairman')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fdc_user_mapping
      WHERE supabase_uid = auth.uid()
        AND role IN ('super_admin','director','chairman')
    )
  );

DROP POLICY IF EXISTS attendance_exceptions_read ON fdc_attendance_schedule_exceptions;
CREATE POLICY attendance_exceptions_read ON fdc_attendance_schedule_exceptions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS attendance_exceptions_write ON fdc_attendance_schedule_exceptions;
CREATE POLICY attendance_exceptions_write ON fdc_attendance_schedule_exceptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM fdc_user_mapping
      WHERE supabase_uid = auth.uid()
        AND role IN ('super_admin','director','chairman','head_nurse','accountant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM fdc_user_mapping
      WHERE supabase_uid = auth.uid()
        AND role IN ('super_admin','director','chairman','head_nurse','accountant')
    )
  );

-- 6. Add a read policy on fdc_emp_attendance scoped to role + department.
-- If fdc_emp_attendance already has a permissive policy, this is additive.
DROP POLICY IF EXISTS attendance_emp_self_or_role ON fdc_emp_attendance;
CREATE POLICY attendance_emp_self_or_role ON fdc_emp_attendance
  FOR SELECT TO authenticated
  USING (
    -- Self
    user_id = (
      SELECT id FROM fdc_user_mapping WHERE supabase_uid = auth.uid()
    )
    -- Org-wide roles
    OR EXISTS (
      SELECT 1 FROM fdc_user_mapping
      WHERE supabase_uid = auth.uid()
        AND role IN ('super_admin','director','chairman','accountant','internal_accountant')
    )
    -- Team-scoped roles (head_nurse, *_head)
    OR EXISTS (
      SELECT 1
      FROM fdc_user_mapping um
      JOIN fdc_attendance_employees e ON e.department = um.department_name
      WHERE um.supabase_uid = auth.uid()
        AND um.role IN ('head_nurse','pharmacy_head','lab_head','business_head')
        AND e.employee_no = fdc_emp_attendance.employee_no
    )
  );
