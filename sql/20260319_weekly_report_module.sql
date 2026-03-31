-- Weekly clinic report module schema + seed data.
-- This script is intentionally idempotent so it can be re-run safely.

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

CREATE TABLE IF NOT EXISTS public.fdc_weekly_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_report_snapshots_year_week
  ON public.fdc_weekly_report_snapshots(year, week_number);

CREATE TABLE IF NOT EXISTS public.fdc_weekly_report_infectious_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icd_code TEXT NOT NULL,
  icd_pattern TEXT NOT NULL,
  disease_name_vi TEXT NOT NULL,
  disease_name_en TEXT,
  disease_group TEXT NOT NULL,
  color_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_report_infectious_codes_icd_code
  ON public.fdc_weekly_report_infectious_codes(icd_code);

CREATE INDEX IF NOT EXISTS idx_weekly_report_infectious_codes_group_order
  ON public.fdc_weekly_report_infectious_codes(disease_group, display_order);

CREATE TABLE IF NOT EXISTS public.fdc_weekly_report_service_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL,
  category_name_vi TEXT NOT NULL,
  display_group TEXT NOT NULL,
  match_type TEXT NOT NULL,
  match_value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_report_service_mappings_category_key
  ON public.fdc_weekly_report_service_mappings(category_key);

CREATE INDEX IF NOT EXISTS idx_weekly_report_service_mappings_group_order
  ON public.fdc_weekly_report_service_mappings(display_group, display_order);

CREATE TABLE IF NOT EXISTS public.fdc_weekly_report_age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key TEXT NOT NULL,
  group_name_vi TEXT NOT NULL,
  min_age INTEGER NOT NULL,
  max_age INTEGER NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_report_age_groups_group_key
  ON public.fdc_weekly_report_age_groups(group_key);

CREATE TABLE IF NOT EXISTS public.fdc_weekly_report_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  details JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_report_logs_started_at
  ON public.fdc_weekly_report_logs(started_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'fdc_weekly_report_logs'
      AND constraint_name = 'chk_weekly_report_logs_status'
  ) THEN
    ALTER TABLE public.fdc_weekly_report_logs
      ADD CONSTRAINT chk_weekly_report_logs_status
      CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_weekly_report_infectious_codes_updated_at
  ON public.fdc_weekly_report_infectious_codes;
CREATE TRIGGER trg_weekly_report_infectious_codes_updated_at
BEFORE UPDATE ON public.fdc_weekly_report_infectious_codes
FOR EACH ROW
EXECUTE FUNCTION public.fdc_touch_updated_at();

DROP TRIGGER IF EXISTS trg_weekly_report_service_mappings_updated_at
  ON public.fdc_weekly_report_service_mappings;
CREATE TRIGGER trg_weekly_report_service_mappings_updated_at
BEFORE UPDATE ON public.fdc_weekly_report_service_mappings
FOR EACH ROW
EXECUTE FUNCTION public.fdc_touch_updated_at();

ALTER TABLE public.fdc_weekly_report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdc_weekly_report_infectious_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdc_weekly_report_service_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdc_weekly_report_age_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fdc_weekly_report_logs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.fdc_weekly_report_age_groups (
  group_key,
  group_name_vi,
  min_age,
  max_age,
  display_order,
  is_active
)
VALUES
  ('age_0_2', '0-2 tuổi', 0, 2, 1, true),
  ('age_3_12', '3-12 tuổi', 3, 12, 2, true),
  ('age_13_18', '13-18 tuổi', 13, 18, 3, true),
  ('age_18_50', '18-50 tuổi', 18, 50, 4, true),
  ('age_over_50', '>50 tuổi', 51, 999, 5, true)
ON CONFLICT (group_key) DO UPDATE
SET
  group_name_vi = EXCLUDED.group_name_vi,
  min_age = EXCLUDED.min_age,
  max_age = EXCLUDED.max_age,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

INSERT INTO public.fdc_weekly_report_infectious_codes (
  icd_code,
  icd_pattern,
  disease_name_vi,
  disease_name_en,
  disease_group,
  color_code,
  is_active,
  display_order
)
VALUES
  ('J09', 'J09%', 'Cúm do virus cúm gia cầm', 'Avian influenza', 'cum', '#3B82F6', true, 1),
  ('J10', 'J10%', 'Cúm do virus cúm đã xác định', 'Influenza due to identified virus', 'cum', '#3B82F6', true, 2),
  ('J11', 'J11%', 'Cúm do virus không xác định', 'Influenza, virus not identified', 'cum', '#3B82F6', true, 3),
  ('J12.1', 'J12.1%', 'Viêm phổi do RSV', 'RSV pneumonia', 'rsv', '#10B981', true, 4),
  ('J20.5', 'J20.5%', 'Viêm phế quản cấp do RSV', 'Acute bronchitis due to RSV', 'rsv', '#10B981', true, 5),
  ('J21.0', 'J21.0%', 'Viêm tiểu phế quản cấp do RSV', 'Acute bronchiolitis due to RSV', 'rsv', '#10B981', true, 6),
  ('A08.0', 'A08.0%', 'Viêm ruột do Rotavirus', 'Rotaviral enteritis', 'rotavirus', '#F59E0B', true, 7),
  ('B08.4', 'B08.4%', 'Bệnh tay chân miệng', 'Hand, foot and mouth disease', 'tcm', '#EF4444', true, 8),
  ('B01', 'B01%', 'Thủy đậu', 'Varicella (chickenpox)', 'thuy_dau', '#8B5CF6', true, 9),
  ('B05', 'B05%', 'Sởi', 'Measles', 'soi', '#EC4899', true, 10),
  ('A90', 'A90%', 'Sốt xuất huyết Dengue', 'Dengue fever', 'sxh', '#F97316', true, 11),
  ('A91', 'A91%', 'Sốt xuất huyết Dengue có biến chứng', 'Dengue hemorrhagic fever', 'sxh', '#F97316', true, 12),
  ('U07.1', 'U07.1%', 'COVID-19 xác định', 'COVID-19, virus identified', 'covid', '#6366F1', true, 13),
  ('U07.2', 'U07.2%', 'COVID-19 nghi ngờ', 'COVID-19, virus not identified', 'covid', '#6366F1', true, 14),
  ('B26', 'B26%', 'Quai bị', 'Mumps', 'quai_bi', '#14B8A6', true, 15),
  ('B97.0', 'B97.0%', 'Nhiễm Adenovirus', 'Adenovirus infection', 'adenovirus', '#84CC16', true, 16),
  ('J12.0', 'J12.0%', 'Viêm phổi do Adenovirus', 'Adenoviral pneumonia', 'adenovirus', '#84CC16', true, 17)
ON CONFLICT (icd_code) DO UPDATE
SET
  icd_pattern = EXCLUDED.icd_pattern,
  disease_name_vi = EXCLUDED.disease_name_vi,
  disease_name_en = EXCLUDED.disease_name_en,
  disease_group = EXCLUDED.disease_group,
  color_code = EXCLUDED.color_code,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;

INSERT INTO public.fdc_weekly_report_service_mappings (
  category_key,
  category_name_vi,
  display_group,
  match_type,
  match_value,
  is_active,
  display_order
)
VALUES
  ('kham_nhi_tw', 'Khám Nhi (Ths, BS BV Nhi TW)', 'kham_benh', 'contains', 'Nhi TW', true, 1),
  ('kham_nhi_bhyt', 'Khám Nhi [BHYT]', 'kham_benh', 'regex', 'Nhi.*BHYT', true, 2),
  ('kham_noi_cki', 'Khám Nội khoa (Ths, CK I)', 'kham_benh', 'regex', 'nội.*CK|Nội.*CK', true, 3),
  ('kham_noi_bhyt', 'Khám Nội [BHYT]', 'kham_benh', 'regex', 'Nội.*BHYT', true, 4),
  ('kham_truc_trua', 'Khám trực trưa', 'kham_benh', 'contains', 'trực trưa', true, 5),
  ('tai_kham_nhi_tt', 'Tái khám nhi tại trung tâm', 'kham_benh', 'regex', 'Tái khám nhi.*trung tâm', true, 6),
  ('tai_kham_noi_tt', 'Tái khám nội tại trung tâm', 'kham_benh', 'regex', 'Tái khám nội.*trung tâm', true, 7),
  ('kham_suc_khoe', 'Khám sức khỏe và tư vấn', 'kham_benh', 'contains', 'sức khỏe', true, 8),
  ('kham_khac', 'Khám khác (TMH, Sản, Mắt, Da...)', 'kham_benh', 'regex', 'TMH|Sản|Mắt|Da|cấp cứu', true, 9),
  ('kham_noi_tai_nha', 'Khám nội tại nhà', 'kham_benh', 'contains', 'nội tại nhà', true, 10),
  ('kham_nhi_tai_nha', 'Khám nhi tại nhà', 'kham_benh', 'contains', 'nhi tại nhà', true, 11),
  ('kham_tim', 'Khám tim', 'kham_benh', 'contains', 'Khám tim', true, 12),
  ('tai_kham_tim_mach', 'Tái khám tim mạch', 'kham_benh', 'contains', 'Tái khám tim', true, 13),
  ('tu_van_noi', 'Tư vấn nội', 'kham_benh', 'contains', 'Tư vấn nội', true, 14),
  ('tu_van_nhi', 'Tư vấn nhi', 'kham_benh', 'contains', 'Tư vấn nhi', true, 15),
  ('xn_gui_ngoai', 'Xét nghiệm gửi [G]', 'xet_nghiem', 'contains', '[G]', true, 1),
  ('xn_dich_vu', 'Xét nghiệm dịch vụ', 'xet_nghiem', 'special', 'xet_nghiem_not_bhyt_not_g', true, 2),
  ('xn_bhyt', 'Xét nghiệm BHYT', 'xet_nghiem', 'special', 'xet_nghiem_bhyt', true, 3),
  ('xquang_dv', 'X-quang dịch vụ', 'cdha', 'regex', 'X-quang|Xquang|X quang', true, 1),
  ('xquang_bhyt', 'X-quang BHYT', 'cdha', 'regex', '(X-quang|Xquang).*BHYT', true, 2),
  ('sieu_am_dv', 'Siêu âm dịch vụ', 'cdha', 'contains', 'Siêu âm', true, 3),
  ('sieu_am_bhyt', 'Siêu âm BHYT', 'cdha', 'regex', 'Siêu âm.*BHYT', true, 4),
  ('noi_soi', 'Nội soi', 'cdha', 'contains', 'Nội soi', true, 5),
  ('dien_tim', 'Điện tim', 'cdha', 'contains', 'Điện tim', true, 6),
  ('do_huyet_dong', 'Đo Huyết động', 'cdha', 'contains', 'Huyết động', true, 7),
  ('tiem_vac_xin', 'Tiêm Vắc xin', 'chuyen_khoa', 'regex', 'Vắc xin|Vaccine|vắc-xin|vacxin', true, 1),
  ('thu_thuat_tmh', 'Thủ thuật tai mũi họng', 'chuyen_khoa', 'regex', 'tai mũi họng|TMH', true, 2),
  ('thu_thuat_tai_nha', 'Thủ thuật tại nhà', 'chuyen_khoa', 'regex', 'thủ thuật.*tại nhà|Thủ thuật.*tại nhà', true, 3),
  ('thu_thuat_tai_tt', 'Thủ thuật tại trung tâm', 'chuyen_khoa', 'regex', 'thủ thuật.*trung tâm|Thủ thuật.*trung tâm', true, 4)
ON CONFLICT (category_key) DO UPDATE
SET
  category_name_vi = EXCLUDED.category_name_vi,
  display_group = EXCLUDED.display_group,
  match_type = EXCLUDED.match_type,
  match_value = EXCLUDED.match_value,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;
