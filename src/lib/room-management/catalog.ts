/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  RoomCatalogEntry,
  RoomFloor,
  RoomFloorDefinition,
  RoomFloorGrouping,
  RoomLayoutDefinition,
  RoomMaintenanceReport,
  RoomSupplyRequest,
  RoomType,
} from '@/types/roomManagement';

export const ROOM_FLOORS: readonly RoomFloorDefinition[] = [
  {
    id: 'floor-1',
    floor: 1,
    label: 'Tầng 1',
    title: 'Sơ đồ tầng 1',
    description: 'Khu tiếp đón, cận lâm sàng và các phòng khám vận hành chính.',
    kind: 'dual-wing',
    corridorLabel: 'Hành lang giữa',
    primaryWingLabel: 'Cánh trái',
    secondaryWingLabel: 'Cánh phải',
  },
  {
    id: 'floor-2',
    floor: 2,
    label: 'Tầng 2',
    title: 'Sơ đồ tầng 2',
    description: 'Khu chuyên môn, văn phòng quản lý và các phòng điều trị hỗ trợ.',
    kind: 'dual-wing',
    corridorLabel: 'Hành lang giữa',
    primaryWingLabel: 'Cánh trái',
    secondaryWingLabel: 'Cánh phải',
  },
  {
    id: 'floor-3',
    floor: 3,
    label: 'Tầng 3',
    title: 'Sơ đồ tầng 3',
    description: 'Khu họp, kho và dãy phòng khám tầng kỹ thuật.',
    kind: 'single-wing',
    corridorLabel: 'Hành lang',
    primaryWingLabel: 'Dãy phòng',
  },
] as const;

export const ROOM_LAYOUTS: Record<RoomFloor, RoomLayoutDefinition> = {
  1: {
    kind: 'dual-wing',
    corridorLabel: 'Hành lang giữa',
    primaryWingLabel: 'Cánh trái',
    secondaryWingLabel: 'Cánh phải',
  },
  2: {
    kind: 'dual-wing',
    corridorLabel: 'Hành lang giữa',
    primaryWingLabel: 'Cánh trái',
    secondaryWingLabel: 'Cánh phải',
  },
  3: {
    kind: 'single-wing',
    corridorLabel: 'Hành lang',
    primaryWingLabel: 'Dãy phòng',
  },
};

export const ROOM_CATALOG: readonly RoomCatalogEntry[] = [
  { id: 'r1', code: 'T1-TIEPDON', name: 'Khu Tiếp Đón', floor: 1, wing: 'left', roomType: 'reception', status: 'active', positionOrder: 1 },
  { id: 'r2', code: 'T1-CHO', name: 'Phòng Chờ', floor: 1, wing: 'left', roomType: 'waiting', status: 'active', positionOrder: 2 },
  { id: 'r3', code: 'T1-THUNGAN', name: 'Quầy Thu Ngân', floor: 1, wing: 'left', roomType: 'reception', status: 'active', positionOrder: 3 },
  { id: 'r4', code: 'P110', name: 'Phòng Khám P110', floor: 1, wing: 'left', roomType: 'medical', status: 'active', positionOrder: 4 },
  { id: 'r5', code: 'T1-KHO', name: 'Kho T1', floor: 1, wing: 'left', roomType: 'storage', status: 'active', positionOrder: 5 },
  { id: 'r6', code: 'P109', name: 'Phòng Khám P109', floor: 1, wing: 'left', roomType: 'medical', status: 'active', positionOrder: 6 },
  { id: 'r7', code: 'P108', name: 'Phòng Khám P108', floor: 1, wing: 'left', roomType: 'medical', status: 'active', positionOrder: 7 },
  { id: 'r8', code: 'T1-XQUANG', name: 'Khu X-Quang', floor: 1, wing: 'left', roomType: 'lab', status: 'active', positionOrder: 8 },
  { id: 'r9', code: 'T1-THUTHUAT', name: 'Khu Thủ Thuật', floor: 1, wing: 'left', roomType: 'medical', status: 'active', positionOrder: 9 },
  { id: 'r10', code: 'T1-LAYMAU', name: 'Khu Lấy Máu', floor: 1, wing: 'right', roomType: 'lab', status: 'active', positionOrder: 1 },
  { id: 'r11', code: 'T1-NHATHUOC', name: 'Nhà Thuốc', floor: 1, wing: 'right', roomType: 'pharmacy', status: 'active', positionOrder: 2 },
  { id: 'r12', code: 'P111', name: 'Phòng Khám P111', floor: 1, wing: 'right', roomType: 'medical', status: 'active', positionOrder: 3 },
  { id: 'r13', code: 'T1-SERVER', name: 'Phòng Server', floor: 1, wing: 'right', roomType: 'utility', status: 'active', positionOrder: 4 },
  { id: 'r14', code: 'P104', name: 'Phòng Khám P104', floor: 1, wing: 'right', roomType: 'medical', status: 'active', positionOrder: 5 },
  { id: 'r15', code: 'T1-VESINH', name: 'Khu Vệ Sinh', floor: 1, wing: 'right', roomType: 'utility', status: 'active', positionOrder: 6 },
  { id: 'r16', code: 'T1-KHUKHUAN', name: 'Khu Khử Khuẩn', floor: 1, wing: 'right', roomType: 'utility', status: 'active', positionOrder: 7 },
  { id: 'r17', code: 'T1-KHIDUNG', name: 'Khu Khí Dung', floor: 1, wing: 'right', roomType: 'medical', status: 'active', positionOrder: 8 },
  { id: 'r18', code: 'T2-TIEMCHUNG', name: 'Tiêm Chủng', floor: 2, wing: 'left', roomType: 'vaccine', status: 'active', positionOrder: 1 },
  { id: 'r19', code: 'T2-THUNGAN-TC', name: 'Thu Ngân Tiêm Chủng', floor: 2, wing: 'left', roomType: 'reception', status: 'active', positionOrder: 2 },
  { id: 'r20', code: 'T2-XETNGHIEM', name: 'Xét Nghiệm', floor: 2, wing: 'left', roomType: 'lab', status: 'active', positionOrder: 3 },
  { id: 'r21', code: 'T2-THANG-T1', name: 'Cầu thang từ T1', floor: 2, wing: 'left', roomType: 'stairs', status: 'active', positionOrder: 4 },
  { id: 'r22', code: 'P205', name: 'Phòng Khám P205', floor: 2, wing: 'left', roomType: 'medical', status: 'active', positionOrder: 5 },
  { id: 'r23', code: 'P204', name: 'Phòng Khám P204', floor: 2, wing: 'left', roomType: 'medical', status: 'active', positionOrder: 6 },
  { id: 'r24', code: 'T2-PHUSAN', name: 'Phụ Sản', floor: 2, wing: 'left', roomType: 'medical', status: 'active', positionOrder: 7 },
  { id: 'r25', code: 'T2-THANG-T3', name: 'Thang lên T3', floor: 2, wing: 'left', roomType: 'stairs', status: 'active', positionOrder: 8 },
  { id: 'r26', code: 'T2-GIAMDOC', name: 'Phòng Giám Đốc', floor: 2, wing: 'right', roomType: 'office', status: 'active', positionOrder: 1 },
  { id: 'r27', code: 'T2-RHM', name: 'Răng Hàm Mặt', floor: 2, wing: 'right', roomType: 'medical', status: 'active', positionOrder: 2 },
  { id: 'r28', code: 'T2-LUUBN', name: 'Lưu Bệnh Nhân', floor: 2, wing: 'right', roomType: 'inpatient', status: 'active', positionOrder: 3 },
  { id: 'r29', code: 'P203', name: 'Phòng Khám P203', floor: 2, wing: 'right', roomType: 'medical', status: 'active', positionOrder: 4 },
  { id: 'r30', code: 'T2-VESINH', name: 'Khu Vệ Sinh T2', floor: 2, wing: 'right', roomType: 'utility', status: 'active', positionOrder: 5 },
  { id: 'r31', code: 'T2-KHO', name: 'Kho T2', floor: 2, wing: 'right', roomType: 'storage', status: 'active', positionOrder: 6 },
  { id: 'r32', code: 'T3-PHONGHOP', name: 'Phòng Họp', floor: 3, wing: 'center', roomType: 'office', status: 'active', positionOrder: 1 },
  { id: 'r33', code: 'P304', name: 'Phòng Khám P304', floor: 3, wing: 'center', roomType: 'medical', status: 'active', positionOrder: 2 },
  { id: 'r34', code: 'P303', name: 'Phòng Khám P303', floor: 3, wing: 'center', roomType: 'medical', status: 'active', positionOrder: 3 },
  { id: 'r35', code: 'P302', name: 'Phòng Khám P302', floor: 3, wing: 'center', roomType: 'medical', status: 'active', positionOrder: 4 },
  { id: 'r36', code: 'P301', name: 'Phòng Khám P301', floor: 3, wing: 'center', roomType: 'medical', status: 'active', positionOrder: 5 },
  { id: 'r37', code: 'T3-KHO', name: 'Kho T3', floor: 3, wing: 'center', roomType: 'storage', status: 'active', positionOrder: 6 },
  { id: 'r38', code: 'T3-THANG-T2', name: 'Cầu thang từ T2', floor: 3, wing: 'center', roomType: 'stairs', status: 'active', positionOrder: 7 },
] as const;

export const ROOM_TYPE_META: Record<
  RoomType,
  { label: string; badgeClassName: string; surfaceClassName: string }
> = {
  reception: {
    label: 'Tiếp đón',
    badgeClassName: 'bg-sky-100 text-sky-700 border-sky-200',
    surfaceClassName: 'border-sky-200 bg-sky-50/60',
  },
  waiting: {
    label: 'Chờ khám',
    badgeClassName: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    surfaceClassName: 'border-indigo-200 bg-indigo-50/60',
  },
  medical: {
    label: 'Khám bệnh',
    badgeClassName: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    surfaceClassName: 'border-emerald-200 bg-emerald-50/60',
  },
  storage: {
    label: 'Kho',
    badgeClassName: 'bg-amber-100 text-amber-700 border-amber-200',
    surfaceClassName: 'border-amber-200 bg-amber-50/60',
  },
  lab: {
    label: 'Cận lâm sàng',
    badgeClassName: 'bg-violet-100 text-violet-700 border-violet-200',
    surfaceClassName: 'border-violet-200 bg-violet-50/60',
  },
  pharmacy: {
    label: 'Nhà thuốc',
    badgeClassName: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    surfaceClassName: 'border-fuchsia-200 bg-fuchsia-50/60',
  },
  utility: {
    label: 'Hậu cần',
    badgeClassName: 'bg-slate-100 text-slate-700 border-slate-200',
    surfaceClassName: 'border-slate-200 bg-slate-50/60',
  },
  vaccine: {
    label: 'Tiêm chủng',
    badgeClassName: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    surfaceClassName: 'border-cyan-200 bg-cyan-50/60',
  },
  stairs: {
    label: 'Cầu thang',
    badgeClassName: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    surfaceClassName: 'border-zinc-200 bg-zinc-50/60',
  },
  office: {
    label: 'Văn phòng',
    badgeClassName: 'bg-orange-100 text-orange-700 border-orange-200',
    surfaceClassName: 'border-orange-200 bg-orange-50/60',
  },
  inpatient: {
    label: 'Lưu bệnh',
    badgeClassName: 'bg-rose-100 text-rose-700 border-rose-200',
    surfaceClassName: 'border-rose-200 bg-rose-50/60',
  },
};

export const MAINTENANCE_SEED: readonly RoomMaintenanceReport[] = [
  {
    id: 'm1',
    roomId: 'r4',
    title: 'Hỏng điều hòa',
    description: 'Điều hòa không mát và có tiếng ồn lớn vào cuối ca.',
    requestType: 'incident',
    severity: 'high',
    status: 'new',
    reportedBy: 'Nguyễn Văn A',
    createdAt: '2026-03-31T06:00:00.000Z',
    updatedAt: '2026-03-31T06:00:00.000Z',
  },
  {
    id: 'm2',
    roomId: 'r15',
    title: 'Tắc bồn cầu',
    description: 'Cần xử lý trong ngày để đảm bảo khu vệ sinh hoạt động ổn định.',
    requestType: 'repair',
    severity: 'urgent',
    status: 'in_progress',
    reportedBy: 'Trần Thị B',
    createdAt: '2026-03-30T09:30:00.000Z',
    updatedAt: '2026-03-31T02:15:00.000Z',
  },
] as const;

export const SUPPLY_SEED: readonly RoomSupplyRequest[] = [
  {
    id: 's1',
    roomId: 'r11',
    title: 'Bổ sung túi nilon',
    reason: 'Tồn kho dùng cho thuốc phát trong ngày đang xuống thấp.',
    priority: 'medium',
    status: 'pending',
    requestedBy: 'Lê Văn C',
    createdAt: '2026-03-31T04:30:00.000Z',
    updatedAt: '2026-03-31T04:30:00.000Z',
    items: [
      { id: 'si1', itemName: 'Túi nilon nhỏ', quantity: 5, unit: 'kg' },
      { id: 'si2', itemName: 'Túi nilon lớn', quantity: 2, unit: 'kg' },
    ],
  },
] as const;

export const MAINTENANCE_STATUS_LABELS = {
  new: 'Mới ghi nhận',
  triaged: 'Đã tiếp nhận',
  in_progress: 'Đang xử lý',
  waiting_material: 'Chờ vật tư',
  resolved: 'Hoàn tất',
  cancelled: 'Đã hủy',
} as const;

export const MAINTENANCE_STATUS_CLASSNAMES = {
  new: 'border-amber-200 bg-amber-50 text-amber-700',
  triaged: 'border-sky-200 bg-sky-50 text-sky-700',
  in_progress: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  waiting_material: 'border-violet-200 bg-violet-50 text-violet-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-700',
} as const;

export const MAINTENANCE_SEVERITY_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
} as const;

export const MAINTENANCE_SEVERITY_CLASSNAMES = {
  low: 'border-slate-200 bg-slate-50 text-slate-700',
  medium: 'border-blue-200 bg-blue-50 text-blue-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  urgent: 'border-red-200 bg-red-50 text-red-700',
} as const;

export const SUPPLY_STATUS_LABELS = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  fulfilled: 'Đã cấp',
  cancelled: 'Đã hủy',
} as const;

export const SUPPLY_STATUS_CLASSNAMES = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  fulfilled: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-700',
} as const;

export const SUPPLY_PRIORITY_LABELS = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
} as const;

export const SUPPLY_PRIORITY_CLASSNAMES = {
  low: 'border-slate-200 bg-slate-50 text-slate-700',
  medium: 'border-blue-200 bg-blue-50 text-blue-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  urgent: 'border-red-200 bg-red-50 text-red-700',
} as const;

export function getRoomById(roomId: string) {
  return ROOM_CATALOG.find((room) => room.id === roomId) ?? null;
}

export function getRoomsForFloor(floor: RoomFloor): RoomFloorGrouping {
  const floorRooms = ROOM_CATALOG.filter((room) => room.floor === floor).sort(
    (left, right) => left.positionOrder - right.positionOrder,
  );

  return {
    left: floorRooms.filter((room) => room.wing === 'left'),
    right: floorRooms.filter((room) => room.wing === 'right'),
    center: floorRooms.filter((room) => room.wing === 'center'),
  };
}
