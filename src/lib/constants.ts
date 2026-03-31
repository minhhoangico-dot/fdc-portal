import { DEFAULT_ROLE_LABELS } from '@/lib/role-catalog';

export const REQUEST_TYPES = {
  material_release: 'Xuất vật tư',
  purchase: 'Mua sắm',
  payment: 'Chi tiền',
  advance: 'Tạm ứng',
  leave: 'Nghỉ phép',
  other: 'Khác',
} as const;

export const REQUEST_STATUS = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  escalated: 'Chuyển cấp',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
} as const;

export const PRIORITY = {
  low: 'Thấp',
  normal: 'Bình thường',
  high: 'Cao',
  urgent: 'Khẩn cấp',
} as const;

export const ROLES = DEFAULT_ROLE_LABELS;

export const COST_CENTERS = {
  general: 'Chung',
  clinic: 'Phòng khám',
  pharmacy: 'Nhà thuốc',
  lab: 'Xét nghiệm',
  imaging: 'Chẩn đoán hình ảnh',
  admin: 'Hành chính',
  facility: 'Cơ sở vật chất',
  marketing: 'Marketing',
  it: 'Công nghệ thông tin',
} as const;
