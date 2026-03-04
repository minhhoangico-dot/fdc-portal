import { Request } from '@/types/request';

export const mockRequests: Request[] = [
  // 4x material_release (xuất vật tư)
  {
    id: 'req-1',
    requestNumber: 'REQ-202603-0001',
    type: 'material_release',
    title: 'Xin xuất găng tay y tế',
    description: 'Xuất 5 hộp găng tay y tế cho phòng khám 1',
    requesterId: 'u2', // Dr. Hương
    department: 'Phòng khám',
    status: 'approved',
    priority: 'normal',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
    approvalSteps: [
      { id: 'as-1', stepOrder: 1, approverRole: 'dept_head', approverId: 'u3', status: 'approved', comment: 'Đồng ý', actedAt: '2026-03-01T09:00:00Z' },
      { id: 'as-2', stepOrder: 2, approverRole: 'super_admin', approverId: 'u1', status: 'approved', actedAt: '2026-03-01T10:00:00Z' }
    ]
  },
  {
    id: 'req-2',
    requestNumber: 'REQ-202603-0002',
    type: 'material_release',
    title: 'Xin xuất bông băng',
    description: 'Bổ sung bông băng cho phòng tiểu phẫu',
    requesterId: 'u2',
    department: 'Phòng khám',
    status: 'approved',
    priority: 'high',
    createdAt: '2026-03-02T08:00:00Z',
    updatedAt: '2026-03-02T09:00:00Z',
    approvalSteps: [
      { id: 'as-3', stepOrder: 1, approverRole: 'dept_head', approverId: 'u3', status: 'approved', actedAt: '2026-03-02T09:00:00Z' }
    ]
  },
  {
    id: 'req-3',
    requestNumber: 'REQ-202603-0003',
    type: 'material_release',
    title: 'Xin xuất cồn y tế',
    description: 'Cồn sát khuẩn hết hạn cần thay mới',
    requesterId: 'u2',
    department: 'Phòng khám',
    status: 'pending',
    priority: 'normal',
    createdAt: '2026-03-03T07:00:00Z',
    updatedAt: '2026-03-03T07:00:00Z',
    approvalSteps: [
      { id: 'as-4', stepOrder: 1, approverRole: 'dept_head', status: 'pending' }
    ]
  },
  {
    id: 'req-4',
    requestNumber: 'REQ-202603-0004',
    type: 'material_release',
    title: 'Xin xuất khẩu trang N95',
    description: 'Dự phòng dịch bệnh',
    requesterId: 'u2',
    department: 'Phòng khám',
    status: 'rejected',
    priority: 'low',
    createdAt: '2026-03-01T14:00:00Z',
    updatedAt: '2026-03-01T15:00:00Z',
    approvalSteps: [
      { id: 'as-5', stepOrder: 1, approverRole: 'dept_head', approverId: 'u3', status: 'rejected', comment: 'Hiện tại chưa cần thiết', actedAt: '2026-03-01T15:00:00Z' }
    ]
  },

  // 4x purchase (mua sắm)
  {
    id: 'req-5',
    requestNumber: 'REQ-202603-0005',
    type: 'purchase',
    title: 'Mua máy đo huyết áp mới',
    description: 'Máy cũ bị hỏng không sửa được',
    requesterId: 'u3', // Lan
    department: 'Phòng khám',
    status: 'pending',
    priority: 'high',
    totalAmount: 1500000,
    createdAt: '2026-03-02T10:00:00Z',
    updatedAt: '2026-03-02T10:00:00Z',
    approvalSteps: [
      { id: 'as-6', stepOrder: 1, approverRole: 'accountant', status: 'pending' },
      { id: 'as-7', stepOrder: 2, approverRole: 'director', status: 'pending' }
    ]
  },
  {
    id: 'req-6',
    requestNumber: 'REQ-202603-0006',
    type: 'purchase',
    title: 'Mua văn phòng phẩm tháng 3',
    description: 'Giấy in, bút, kẹp file',
    requesterId: 'u4', // Thảo
    department: 'Kế toán',
    status: 'approved',
    priority: 'normal',
    totalAmount: 500000,
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-01T14:00:00Z',
    approvalSteps: [
      { id: 'as-8', stepOrder: 1, approverRole: 'director', approverId: 'u5', status: 'approved', actedAt: '2026-03-01T14:00:00Z' }
    ]
  },
  {
    id: 'req-7',
    requestNumber: 'REQ-202603-0007',
    type: 'purchase',
    title: 'Mua ghế ngồi chờ bệnh nhân',
    description: 'Thay 5 ghế hỏng ở sảnh',
    requesterId: 'u3',
    department: 'Hành chính',
    status: 'rejected',
    priority: 'low',
    totalAmount: 2500000,
    createdAt: '2026-02-28T10:00:00Z',
    updatedAt: '2026-02-28T16:00:00Z',
    approvalSteps: [
      { id: 'as-9', stepOrder: 1, approverRole: 'accountant', approverId: 'u4', status: 'approved', actedAt: '2026-02-28T11:00:00Z' },
      { id: 'as-10', stepOrder: 2, approverRole: 'director', approverId: 'u5', status: 'rejected', comment: 'Chưa có ngân sách tháng này', actedAt: '2026-02-28T16:00:00Z' }
    ]
  },
  {
    id: 'req-8',
    requestNumber: 'REQ-202603-0008',
    type: 'purchase',
    title: 'Mua phần mềm quản lý mới',
    description: 'Nâng cấp hệ thống HIS',
    requesterId: 'u1', // Minh
    department: 'IT',
    status: 'escalated',
    priority: 'urgent',
    totalAmount: 50000000,
    createdAt: '2026-03-03T08:00:00Z',
    updatedAt: '2026-03-03T09:00:00Z',
    approvalSteps: [
      { id: 'as-11', stepOrder: 1, approverRole: 'director', approverId: 'u5', status: 'forwarded', comment: 'Số tiền lớn, chuyển CT HĐQT', actedAt: '2026-03-03T09:00:00Z' },
      { id: 'as-12', stepOrder: 2, approverRole: 'chairman', status: 'pending' }
    ]
  },

  // 4x payment (chi tiền)
  {
    id: 'req-9',
    requestNumber: 'REQ-202603-0009',
    type: 'payment',
    title: 'Thanh toán tiền điện tháng 2',
    description: 'Hóa đơn điện lực',
    requesterId: 'u4',
    department: 'Kế toán',
    status: 'approved',
    priority: 'high',
    totalAmount: 12500000,
    createdAt: '2026-03-02T08:00:00Z',
    updatedAt: '2026-03-02T10:00:00Z',
    approvalSteps: [
      { id: 'as-13', stepOrder: 1, approverRole: 'director', approverId: 'u5', status: 'approved', actedAt: '2026-03-02T10:00:00Z' }
    ]
  },
  {
    id: 'req-10',
    requestNumber: 'REQ-202603-0010',
    type: 'payment',
    title: 'Thanh toán tiền nước tháng 2',
    description: 'Hóa đơn nước',
    requesterId: 'u4',
    department: 'Kế toán',
    status: 'pending',
    priority: 'normal',
    totalAmount: 2100000,
    createdAt: '2026-03-03T08:00:00Z',
    updatedAt: '2026-03-03T08:00:00Z',
    approvalSteps: [
      { id: 'as-14', stepOrder: 1, approverRole: 'director', status: 'pending' }
    ]
  },
  {
    id: 'req-11',
    requestNumber: 'REQ-202603-0011',
    type: 'payment',
    title: 'Thanh toán hợp đồng marketing',
    description: 'Chi phí quảng cáo Facebook',
    requesterId: 'u3',
    department: 'Marketing',
    status: 'escalated',
    priority: 'normal',
    totalAmount: 30000000,
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-02T09:00:00Z',
    approvalSteps: [
      { id: 'as-15', stepOrder: 1, approverRole: 'accountant', approverId: 'u4', status: 'approved', actedAt: '2026-03-01T10:00:00Z' },
      { id: 'as-16', stepOrder: 2, approverRole: 'director', approverId: 'u5', status: 'forwarded', comment: 'Vượt thẩm quyền, trình CT HĐQT', actedAt: '2026-03-02T09:00:00Z' },
      { id: 'as-17', stepOrder: 3, approverRole: 'chairman', status: 'pending' }
    ]
  },
  {
    id: 'req-12',
    requestNumber: 'REQ-202603-0012',
    type: 'payment',
    title: 'Thanh toán sửa chữa điều hòa',
    description: 'Bảo dưỡng 3 máy lạnh',
    requesterId: 'u3',
    department: 'Hành chính',
    status: 'completed',
    priority: 'normal',
    totalAmount: 1500000,
    createdAt: '2026-02-25T09:00:00Z',
    updatedAt: '2026-02-26T14:00:00Z',
    approvalSteps: [
      { id: 'as-18', stepOrder: 1, approverRole: 'accountant', approverId: 'u4', status: 'approved', actedAt: '2026-02-25T10:00:00Z' },
      { id: 'as-19', stepOrder: 2, approverRole: 'director', approverId: 'u5', status: 'approved', actedAt: '2026-02-26T14:00:00Z' }
    ]
  },

  // 4x advance (tạm ứng)
  {
    id: 'req-13',
    requestNumber: 'REQ-202603-0013',
    type: 'advance',
    title: 'Tạm ứng đi công tác',
    description: 'Công tác Hà Nội 3 ngày',
    requesterId: 'u2',
    department: 'Phòng khám',
    status: 'pending',
    priority: 'high',
    totalAmount: 5000000,
    createdAt: '2026-03-03T09:00:00Z',
    updatedAt: '2026-03-03T09:00:00Z',
    approvalSteps: [
      { id: 'as-20', stepOrder: 1, approverRole: 'dept_head', status: 'pending' },
      { id: 'as-21', stepOrder: 2, approverRole: 'accountant', status: 'pending' },
      { id: 'as-22', stepOrder: 3, approverRole: 'director', status: 'pending' }
    ]
  },
  {
    id: 'req-14',
    requestNumber: 'REQ-202603-0014',
    type: 'advance',
    title: 'Tạm ứng mua quà tặng đối tác',
    description: 'Quà 8/3 cho đối tác',
    requesterId: 'u3',
    department: 'Hành chính',
    status: 'approved',
    priority: 'normal',
    totalAmount: 3000000,
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-02T10:00:00Z',
    approvalSteps: [
      { id: 'as-23', stepOrder: 1, approverRole: 'accountant', approverId: 'u4', status: 'approved', actedAt: '2026-03-01T14:00:00Z' },
      { id: 'as-24', stepOrder: 2, approverRole: 'director', approverId: 'u5', status: 'approved', actedAt: '2026-03-02T10:00:00Z' }
    ]
  },
  {
    id: 'req-15',
    requestNumber: 'REQ-202603-0015',
    type: 'advance',
    title: 'Tạm ứng chi phí liên hoan',
    description: 'Liên hoan khoa',
    requesterId: 'u2',
    department: 'Phòng khám',
    status: 'rejected',
    priority: 'low',
    totalAmount: 10000000,
    createdAt: '2026-02-28T09:00:00Z',
    updatedAt: '2026-02-28T15:00:00Z',
    approvalSteps: [
      { id: 'as-25', stepOrder: 1, approverRole: 'dept_head', approverId: 'u3', status: 'approved', actedAt: '2026-02-28T10:00:00Z' },
      { id: 'as-26', stepOrder: 2, approverRole: 'director', approverId: 'u5', status: 'rejected', comment: 'Chi phí quá cao', actedAt: '2026-02-28T15:00:00Z' }
    ]
  },
  {
    id: 'req-16',
    requestNumber: 'REQ-202603-0016',
    type: 'advance',
    title: 'Tạm ứng mua vật tư gấp',
    description: 'Mua cồn y tế gấp',
    requesterId: 'u2',
    department: 'Phòng khám',
    status: 'completed',
    priority: 'urgent',
    totalAmount: 500000,
    createdAt: '2026-02-20T08:00:00Z',
    updatedAt: '2026-02-22T10:00:00Z',
    approvalSteps: [
      { id: 'as-27', stepOrder: 1, approverRole: 'dept_head', approverId: 'u3', status: 'approved', actedAt: '2026-02-20T08:30:00Z' },
      { id: 'as-28', stepOrder: 2, approverRole: 'accountant', approverId: 'u4', status: 'approved', actedAt: '2026-02-20T09:00:00Z' }
    ]
  },

  // 2x leave (nghỉ phép)
  {
    id: 'req-17',
    requestNumber: 'REQ-202603-0017',
    type: 'leave',
    title: 'Xin nghỉ phép 1 ngày',
    description: 'Nghỉ ốm',
    requesterId: 'u2',
    department: 'Phòng khám',
    status: 'approved',
    priority: 'normal',
    createdAt: '2026-03-02T07:00:00Z',
    updatedAt: '2026-03-02T08:00:00Z',
    approvalSteps: [
      { id: 'as-29', stepOrder: 1, approverRole: 'dept_head', approverId: 'u3', status: 'approved', actedAt: '2026-03-02T08:00:00Z' }
    ]
  },
  {
    id: 'req-18',
    requestNumber: 'REQ-202603-0018',
    type: 'leave',
    title: 'Xin nghỉ phép 5 ngày',
    description: 'Nghỉ du lịch gia đình',
    requesterId: 'u3',
    department: 'Phòng khám',
    status: 'pending',
    priority: 'normal',
    createdAt: '2026-03-03T09:00:00Z',
    updatedAt: '2026-03-03T09:00:00Z',
    approvalSteps: [
      { id: 'as-30', stepOrder: 1, approverRole: 'director', status: 'pending' }
    ]
  },

  // 2x other
  {
    id: 'req-19',
    requestNumber: 'REQ-202603-0019',
    type: 'other',
    title: 'Đề xuất thay đổi ca trực',
    description: 'Đổi ca trực ngày 10/3 với BS. Tuấn',
    requesterId: 'u2',
    department: 'Phòng khám',
    status: 'pending',
    priority: 'normal',
    createdAt: '2026-03-03T10:00:00Z',
    updatedAt: '2026-03-03T10:00:00Z',
    approvalSteps: [
      { id: 'as-31', stepOrder: 1, approverRole: 'dept_head', status: 'pending' }
    ]
  },
  {
    id: 'req-20',
    requestNumber: 'REQ-202603-0020',
    type: 'other',
    title: 'Đề xuất tổ chức khám sức khỏe định kỳ',
    description: 'Khám sức khỏe cho nhân viên',
    requesterId: 'u3',
    department: 'Hành chính',
    status: 'approved',
    priority: 'normal',
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-02-20T14:00:00Z',
    approvalSteps: [
      { id: 'as-32', stepOrder: 1, approverRole: 'director', approverId: 'u5', status: 'approved', actedAt: '2026-02-20T14:00:00Z' }
    ]
  }
];
