import { Request, RequestAttachment, RequestLineItem, RequestMetadata, RequestType } from '@/types/request';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ISO_DATE_PATTERN = /\d{4}-\d{2}-\d{2}/g;

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Nghi phep nam',
  sick: 'Nghi om',
  unpaid: 'Nghi khong luong',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Chuyen khoan',
  cash: 'Tien mat',
};

const normalizeItems = (rawItems: unknown): RequestLineItem[] => {
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((item) => {
      const next = item as Partial<RequestLineItem> | null | undefined;

      return {
        name: typeof next?.name === 'string' ? next.name.trim() : '',
        qty: Number(next?.qty ?? 0) || 0,
        unit: typeof next?.unit === 'string' ? next.unit.trim() : '',
        price: next?.price == null ? undefined : Number(next.price) || 0,
      };
    })
    .filter((item) => item.name);
};

export const normalizeRequestMetadata = (
  type: RequestType,
  rawMetadata?: Record<string, unknown> | null,
): RequestMetadata => {
  const metadata = (rawMetadata ?? {}) as Record<string, unknown>;

  return {
    items: ['material_release', 'purchase'].includes(type) ? normalizeItems(metadata.items) : [],
    beneficiary: typeof metadata.beneficiary === 'string' ? metadata.beneficiary : undefined,
    method: typeof metadata.method === 'string' ? metadata.method : undefined,
    expectedDate: typeof metadata.expectedDate === 'string' ? metadata.expectedDate : undefined,
    leaveType: typeof metadata.leaveType === 'string' ? metadata.leaveType : undefined,
    startDate: typeof metadata.startDate === 'string' ? metadata.startDate : undefined,
    endDate: typeof metadata.endDate === 'string' ? metadata.endDate : undefined,
    workflowKind: metadata.workflowKind === 'room_material' || metadata.workflowKind === 'room_maintenance'
      ? metadata.workflowKind
      : undefined,
    roomId: typeof metadata.roomId === 'string' ? metadata.roomId : undefined,
    roomCode: typeof metadata.roomCode === 'string' ? metadata.roomCode : undefined,
    roomName: typeof metadata.roomName === 'string' ? metadata.roomName : undefined,
    floor: typeof metadata.floor === 'number' ? metadata.floor : undefined,
    reviewGroup: typeof metadata.reviewGroup === 'string' ? metadata.reviewGroup : undefined,
    sourceIntakeIds: Array.isArray(metadata.sourceIntakeIds)
      ? metadata.sourceIntakeIds.filter((value): value is string => typeof value === 'string')
      : undefined,
    originModule: metadata.originModule === 'room_management' ? 'room_management' : undefined,
  };
};

export const getInclusiveDayCount = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  return Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
};

export const requiresDirectorApproval = (startDate?: string, endDate?: string) => {
  const leaveDays = getInclusiveDayCount(startDate, endDate);
  if (leaveDays <= 0 || !startDate) return false;

  const start = new Date(`${startDate}T00:00:00`);
  return leaveDays > 1 || start.getDay() === 1;
};

export const getLeaveDates = (request: Pick<Request, 'description' | 'metadata'>) => {
  if (request.metadata?.startDate && request.metadata?.endDate) {
    return {
      startDate: request.metadata.startDate,
      endDate: request.metadata.endDate,
    };
  }

  if (!request.description) return null;

  const matches = request.description.match(ISO_DATE_PATTERN);
  if (!matches || matches.length < 2) return null;

  return {
    startDate: matches[0],
    endDate: matches[1],
  };
};

export const buildRequestTotalAmount = (
  type: RequestType,
  metadata: RequestMetadata,
  explicitAmount?: number,
) => {
  if (type === 'purchase') {
    return (metadata.items || []).reduce((sum, item) => sum + item.qty * (item.price || 0), 0);
  }

  if (['payment', 'advance'].includes(type)) {
    return explicitAmount;
  }

  return undefined;
};

export const mapRequestAttachment = (attachment: any): RequestAttachment => ({
  id: attachment.id,
  requestId: attachment.request_id,
  fileName: attachment.file_name,
  fileSize: attachment.file_size,
  mimeType: attachment.mime_type,
  storagePath: attachment.storage_path,
  downloadUrl: null,
  uploadedBy: attachment.uploaded_by,
  uploadedAt: attachment.uploaded_at || attachment.created_at,
});

export const mapRequestRecord = (dbReq: any): Request => ({
  id: dbReq.id,
  requestNumber: dbReq.request_number,
  type: dbReq.request_type as RequestType,
  title: dbReq.title,
  description: dbReq.description,
  requesterId: dbReq.requester_id,
  department: dbReq.department_name,
  status: dbReq.status,
  priority: dbReq.priority,
  totalAmount: dbReq.total_amount == null ? undefined : Number(dbReq.total_amount),
  costCenter: dbReq.cost_center || undefined,
  metadata: normalizeRequestMetadata(dbReq.request_type as RequestType, dbReq.metadata),
  createdAt: dbReq.created_at,
  updatedAt: dbReq.updated_at,
  requesterName: dbReq.requester?.full_name || 'Unknown',
  requesterDept: dbReq.requester?.department_name || '',
  requesterAvatar: dbReq.requester?.avatar_url || null,
  approvalSteps: (dbReq.approvalSteps || []).map((step: any) => ({
    id: step.id,
    stepOrder: step.step_order,
    approverRole: step.approver_role,
    approverId: step.approver_id,
    status: step.status,
    comment: step.comment,
    actedAt: step.acted_at,
    approverName: step.approver?.full_name || null,
    approverAvatar: step.approver?.avatar_url || null,
  })),
  attachments: (dbReq.attachments || []).map(mapRequestAttachment),
});
