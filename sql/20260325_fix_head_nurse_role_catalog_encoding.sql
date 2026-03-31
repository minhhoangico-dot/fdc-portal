-- Repair mojibake role-catalog text for the head_nurse seed.
-- Safe to re-run.

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
