import { Room, MaintenanceRequest, SupplyRequest } from './types';

export const seedRooms: Room[] = [
  // T1 Left
  { id: 'r1', code: 'T1-TIEPDON', name: 'Khu Tiếp Đón', floor: 1, wing: 'left', room_type: 'reception', status: 'active', position_order: 1 },
  { id: 'r2', code: 'T1-CHO', name: 'Phòng Chờ', floor: 1, wing: 'left', room_type: 'waiting', status: 'active', position_order: 2 },
  { id: 'r3', code: 'T1-THUNGAN', name: 'Quầy Thu Ngân', floor: 1, wing: 'left', room_type: 'reception', status: 'active', position_order: 3 },
  { id: 'r4', code: 'P110', name: 'Phòng Khám P110', floor: 1, wing: 'left', room_type: 'medical', status: 'active', position_order: 4 },
  { id: 'r5', code: 'T1-KHO', name: 'Kho T1', floor: 1, wing: 'left', room_type: 'storage', status: 'active', position_order: 5 },
  { id: 'r6', code: 'P109', name: 'Phòng Khám P109', floor: 1, wing: 'left', room_type: 'medical', status: 'active', position_order: 6 },
  { id: 'r7', code: 'P108', name: 'Phòng Khám P108', floor: 1, wing: 'left', room_type: 'medical', status: 'active', position_order: 7 },
  { id: 'r8', code: 'T1-XQUANG', name: 'Khu X-Quang', floor: 1, wing: 'left', room_type: 'lab', status: 'active', position_order: 8 },
  { id: 'r9', code: 'T1-THUTHUAT', name: 'Khu Thủ Thuật', floor: 1, wing: 'left', room_type: 'medical', status: 'active', position_order: 9 },
  
  // T1 Right
  { id: 'r10', code: 'T1-LAYMAU', name: 'Khu Lấy Máu', floor: 1, wing: 'right', room_type: 'lab', status: 'active', position_order: 1 },
  { id: 'r11', code: 'T1-NHATHUOC', name: 'Nhà Thuốc', floor: 1, wing: 'right', room_type: 'pharmacy', status: 'active', position_order: 2 },
  { id: 'r12', code: 'P111', name: 'Phòng Khám P111', floor: 1, wing: 'right', room_type: 'medical', status: 'active', position_order: 3 },
  { id: 'r13', code: 'T1-SERVER', name: 'Phòng Server', floor: 1, wing: 'right', room_type: 'utility', status: 'active', position_order: 4 },
  { id: 'r14', code: 'P104', name: 'Phòng Khám P104', floor: 1, wing: 'right', room_type: 'medical', status: 'active', position_order: 5 },
  { id: 'r15', code: 'T1-VESINH', name: 'Khu Vệ Sinh', floor: 1, wing: 'right', room_type: 'utility', status: 'active', position_order: 6 },
  { id: 'r16', code: 'T1-KHUKHUAN', name: 'Khu Khử Khuẩn', floor: 1, wing: 'right', room_type: 'utility', status: 'active', position_order: 7 },
  { id: 'r17', code: 'T1-KHIDUNG', name: 'Khu Khí Dung', floor: 1, wing: 'right', room_type: 'medical', status: 'active', position_order: 8 },

  // T2 Left
  { id: 'r18', code: 'T2-TIEMCHUNG', name: 'Tiêm Chủng', floor: 2, wing: 'left', room_type: 'vaccine', status: 'active', position_order: 1 },
  { id: 'r19', code: 'T2-THUNGAN-TC', name: 'Thu Ngân Tiêm Chủng', floor: 2, wing: 'left', room_type: 'reception', status: 'active', position_order: 2 },
  { id: 'r20', code: 'T2-XETNGHIEM', name: 'Xét Nghiệm', floor: 2, wing: 'left', room_type: 'lab', status: 'active', position_order: 3 },
  { id: 'r21', code: 'T2-THANG-T1', name: 'Cầu thang từ T1', floor: 2, wing: 'left', room_type: 'stairs', status: 'active', position_order: 4 },
  { id: 'r22', code: 'P205', name: 'Phòng Khám P205', floor: 2, wing: 'left', room_type: 'medical', status: 'active', position_order: 5 },
  { id: 'r23', code: 'P204', name: 'Phòng Khám P204', floor: 2, wing: 'left', room_type: 'medical', status: 'active', position_order: 6 },
  { id: 'r24', code: 'T2-PHUSAN', name: 'Phụ Sản', floor: 2, wing: 'left', room_type: 'medical', status: 'active', position_order: 7 },
  { id: 'r25', code: 'T2-THANG-T3', name: 'Thang lên T3', floor: 2, wing: 'left', room_type: 'stairs', status: 'active', position_order: 8 },

  // T2 Right
  { id: 'r26', code: 'T2-GIAMDOC', name: 'P. Giám Đốc', floor: 2, wing: 'right', room_type: 'office', status: 'active', position_order: 1 },
  { id: 'r27', code: 'T2-RHM', name: 'Răng Hàm Mặt', floor: 2, wing: 'right', room_type: 'medical', status: 'active', position_order: 2 },
  { id: 'r28', code: 'T2-LUUBN', name: 'Lưu Bệnh Nhân', floor: 2, wing: 'right', room_type: 'inpatient', status: 'active', position_order: 3 },
  { id: 'r29', code: 'P203', name: 'Phòng Khám P203', floor: 2, wing: 'right', room_type: 'medical', status: 'active', position_order: 4 },
  { id: 'r30', code: 'T2-VESINH', name: 'Khu Vệ Sinh T2', floor: 2, wing: 'right', room_type: 'utility', status: 'active', position_order: 5 },
  { id: 'r31', code: 'T2-KHO', name: 'Kho T2', floor: 2, wing: 'right', room_type: 'storage', status: 'active', position_order: 6 },

  // T3 (No wings, just one row)
  { id: 'r32', code: 'T3-PHONGHOP', name: 'Phòng Họp', floor: 3, wing: null, room_type: 'office', status: 'active', position_order: 1 },
  { id: 'r33', code: 'P304', name: 'Phòng Khám P304', floor: 3, wing: null, room_type: 'medical', status: 'active', position_order: 2 },
  { id: 'r34', code: 'P303', name: 'Phòng Khám P303', floor: 3, wing: null, room_type: 'medical', status: 'active', position_order: 3 },
  { id: 'r35', code: 'P302', name: 'Phòng Khám P302', floor: 3, wing: null, room_type: 'medical', status: 'active', position_order: 4 },
  { id: 'r36', code: 'P301', name: 'Phòng Khám P301', floor: 3, wing: null, room_type: 'medical', status: 'active', position_order: 5 },
  { id: 'r37', code: 'T3-KHO', name: 'Kho T3', floor: 3, wing: null, room_type: 'storage', status: 'active', position_order: 6 },
  { id: 'r38', code: 'T3-THANG-T2', name: 'Cầu thang từ T2', floor: 3, wing: null, room_type: 'stairs', status: 'active', position_order: 7 },
];

export const seedMaintenance: MaintenanceRequest[] = [
  {
    id: 'm1',
    room_id: 'r4', // P110
    title: 'Hỏng điều hòa',
    description: 'Điều hòa không mát, kêu to',
    request_type: 'incident',
    priority: 'high',
    status: 'new',
    reported_by: 'Nguyễn Văn A',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'm2',
    room_id: 'r15', // T1-VESINH
    title: 'Tắc bồn cầu',
    request_type: 'repair',
    priority: 'urgent',
    status: 'in_progress',
    reported_by: 'Trần Thị B',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  }
];

export const seedSupply: SupplyRequest[] = [
  {
    id: 's1',
    room_id: 'r11', // Nhà thuốc
    title: 'Bổ sung túi nilon',
    reason: 'Sắp hết túi đựng thuốc cho bệnh nhân',
    priority: 'medium',
    status: 'pending',
    requested_by: 'Lê Văn C',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    items: [
      { id: 'si1', supply_request_id: 's1', item_name: 'Túi nilon nhỏ', unit: 'kg', quantity: 5 },
      { id: 'si2', supply_request_id: 's1', item_name: 'Túi nilon to', unit: 'kg', quantity: 2 },
    ]
  }
];
