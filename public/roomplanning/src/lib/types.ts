export type RoomType = 'medical' | 'lab' | 'reception' | 'pharmacy' | 'utility' | 'vaccine' | 'office' | 'waiting' | 'storage' | 'inpatient' | 'stairs';

export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type MaintenanceStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';
export type SupplyStatus = 'pending' | 'approved' | 'rejected' | 'purchased';

export interface Room {
  id: string;
  code: string;
  name: string;
  floor: number;
  wing: 'left' | 'right' | 'center' | null;
  room_type: RoomType;
  status: 'active' | 'maintenance' | 'closed';
  position_order: number;
  notes?: string;
}

export interface MaintenanceRequest {
  id: string;
  room_id: string;
  title: string;
  description?: string;
  request_type: 'maintenance' | 'incident' | 'repair';
  priority: Priority;
  status: MaintenanceStatus;
  reported_by?: string;
  assigned_to?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  images?: string[];
}

export interface SupplyRequestItem {
  id: string;
  supply_request_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  notes?: string;
}

export interface SupplyRequest {
  id: string;
  room_id: string;
  title: string;
  reason?: string;
  priority: Priority;
  status: SupplyStatus;
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_at: string;
  items: SupplyRequestItem[];
}
