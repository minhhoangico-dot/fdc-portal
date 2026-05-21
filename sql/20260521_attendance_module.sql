-- Attendance module: Hikvision employee roster
--
-- The FDC database already has:
--   * fdc_attendance_records       (raw events, employee_id text + check_time)
--   * fdc_emp_attendance           (daily summaries keyed by user_id+date)
--   * fdc_attendance_schedule      (list of shift definitions, one is_default)
--   * fdc_attendance_schedule_override (per-user date-range overrides)
--   * function process_daily_attendance(target_date date)
--
-- All this migration adds is the employee roster cache, used by the new
-- /attendance EmployeesTab (sync, hide/show, see linkage to portal user).
-- Aggregation continues to be handled by process_daily_attendance(), which
-- joins fdc_attendance_records to fdc_user_mapping directly via
-- hikvision_employee_id / his_nhanvienid.

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

ALTER TABLE fdc_attendance_employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_employees_read ON fdc_attendance_employees;
CREATE POLICY attendance_employees_read ON fdc_attendance_employees
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS attendance_employees_write ON fdc_attendance_employees;
CREATE POLICY attendance_employees_write ON fdc_attendance_employees
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
