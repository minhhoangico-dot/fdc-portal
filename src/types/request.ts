import { ApprovalStep } from './approval';

export type RequestType = 'material_release' | 'purchase' | 'payment' | 'advance' | 'leave' | 'other';
export type RequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'escalated' | 'completed' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface RequestLineItem {
  name: string;
  qty: number;
  unit: string;
  price?: number;
}

export interface RequestMetadata {
  items?: RequestLineItem[];
  beneficiary?: string;
  method?: string;
  expectedDate?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  workflowKind?: 'room_material' | 'room_maintenance';
  roomId?: string;
  roomCode?: string;
  roomName?: string;
  floor?: number;
  reviewGroup?: string;
  sourceIntakeIds?: string[];
  originModule?: 'room_management';
}

export interface RequestAttachment {
  id: string;
  requestId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  downloadUrl?: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Request {
  id: string;
  requestNumber: string;
  type: RequestType;
  title: string;
  description?: string;
  requesterId: string;
  department: string;
  status: RequestStatus;
  priority: Priority;
  totalAmount?: number;
  costCenter?: string;
  metadata?: RequestMetadata;
  createdAt: string;
  updatedAt: string;
  approvalSteps: ApprovalStep[];
  attachments?: RequestAttachment[];
  requesterName?: string;
  requesterDept?: string;
  requesterAvatar?: string | null;
}
