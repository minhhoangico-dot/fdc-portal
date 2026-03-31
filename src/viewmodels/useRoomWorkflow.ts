/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoomById } from '@/lib/room-management/catalog';
import { getReviewGroupForRoom, getReviewerRoleForGroup } from '@/lib/room-management/routing';
import { buildRoomWorkflowCollections } from '@/lib/room-management/workflow';
import { supabase } from '@/lib/supabase';
import type {
  CreateMaintenanceReportInput,
  CreateSupplyRequestInput,
  MaintenanceStatus,
  RoomMaintenanceReport,
  RoomSupplyRequest,
} from '@/types/roomManagement';

interface RoomIntakeRow {
  id: string;
  room_key: string | null;
  room_code: string | null;
  room_name: string | null;
  floor: number | null;
  intake_type: 'material' | 'maintenance';
  title: string;
  description: string | null;
  priority: string | null;
  review_group?: string | null;
  reviewer_role?: string | null;
  requester_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
  requester?: {
    full_name: string | null;
  } | null;
}

interface RoomIntakeItemRow {
  id: string;
  intake_id: string;
  item_name: string;
  quantity: number;
  unit: string;
}

function mapSeverityToPriority(
  value: CreateMaintenanceReportInput['severity'],
): 'low' | 'normal' | 'high' | 'urgent' {
  switch (value) {
    case 'low':
      return 'low';
    case 'high':
      return 'high';
    case 'urgent':
      return 'urgent';
    case 'medium':
    default:
      return 'normal';
  }
}

function mapMaintenanceStatusToIntakeStatus(status: MaintenanceStatus) {
  switch (status) {
    case 'new':
      return 'submitted';
    case 'triaged':
      return 'in_review';
    case 'in_progress':
    case 'waiting_material':
      return 'promoted';
    case 'resolved':
      return 'approved';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'submitted';
  }
}

export function useRoomWorkflow() {
  const { user } = useAuth();
  const [maintenanceReports, setMaintenanceReports] = React.useState<RoomMaintenanceReport[]>([]);
  const [supplyRequests, setSupplyRequests] = React.useState<RoomSupplyRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!user) {
      setMaintenanceReports([]);
      setSupplyRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data: intakeRows, error: intakeError } = await supabase
      .from('fdc_room_intakes')
      .select(`
        *,
        requester:fdc_user_mapping!requester_id(full_name)
      `)
      .order('created_at', { ascending: false });

    if (intakeError) {
      console.error('Failed to fetch room intakes:', intakeError);
      setMaintenanceReports([]);
      setSupplyRequests([]);
      setError(intakeError.message);
      setIsLoading(false);
      return;
    }

    const intakes = (intakeRows || []) as RoomIntakeRow[];
    const materialIntakeIds = intakes
      .filter((row) => row.intake_type === 'material')
      .map((row) => row.id);

    let items: RoomIntakeItemRow[] = [];
    if (materialIntakeIds.length > 0) {
      const { data: itemRows, error: itemError } = await supabase
        .from('fdc_room_intake_items')
        .select('*')
        .in('intake_id', materialIntakeIds);

      if (itemError) {
        console.error('Failed to fetch room intake items:', itemError);
        setError(itemError.message);
      } else {
        items = (itemRows || []) as RoomIntakeItemRow[];
      }
    }

    const collections = buildRoomWorkflowCollections(
      intakes.map((row) => ({
        ...row,
        requester_name: row.requester?.full_name || null,
      })),
      items,
    );
    setMaintenanceReports(collections.maintenanceReports);
    setSupplyRequests(collections.supplyRequests);
    setIsLoading(false);
  }, [user]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const createMaintenanceReport = React.useCallback(
    async (input: CreateMaintenanceReportInput) => {
      if (!user) return;

      const room = getRoomById(input.roomId);
      if (!room) {
        throw new Error(`Unknown room id: ${input.roomId}`);
      }

      const reviewGroup = getReviewGroupForRoom(room.code);
      const reviewerRole = getReviewerRoleForGroup(reviewGroup);

      const { error: insertError } = await supabase.from('fdc_room_intakes').insert({
        room_key: room.id,
        room_code: room.code,
        room_name: room.name,
        floor: room.floor,
        requester_id: user.id,
        intake_type: 'maintenance',
        title: input.title.trim(),
        description: input.description.trim(),
        priority: mapSeverityToPriority(input.severity),
        review_group: reviewGroup,
        reviewer_role: reviewerRole,
        metadata: {
          workflowKind: 'room_maintenance',
          requestType: input.requestType,
          roomId: room.id,
          roomCode: room.code,
          roomName: room.name,
          floor: room.floor,
          reviewGroup,
          originModule: 'room_management',
        },
      });

      if (insertError) {
        throw insertError;
      }

      await refresh();
    },
    [refresh, user],
  );

  const createSupplyRequest = React.useCallback(
    async (input: CreateSupplyRequestInput) => {
      if (!user) return;

      const room = getRoomById(input.roomId);
      if (!room) {
        throw new Error(`Unknown room id: ${input.roomId}`);
      }

      const reviewGroup = getReviewGroupForRoom(room.code);
      const reviewerRole = getReviewerRoleForGroup(reviewGroup);

      const { data: intakeRow, error: intakeError } = await supabase
        .from('fdc_room_intakes')
        .insert({
          room_key: room.id,
          room_code: room.code,
          room_name: room.name,
          floor: room.floor,
          requester_id: user.id,
          intake_type: 'material',
          title: input.title.trim(),
          description: input.reason.trim(),
          priority: input.priority === 'medium' ? 'normal' : input.priority,
          review_group: reviewGroup,
          reviewer_role: reviewerRole,
          metadata: {
            workflowKind: 'room_material',
            roomId: room.id,
            roomCode: room.code,
            roomName: room.name,
            floor: room.floor,
            reviewGroup,
            originModule: 'room_management',
          },
        })
        .select('id')
        .single();

      if (intakeError || !intakeRow) {
        throw intakeError || new Error('Failed to create material intake.');
      }

      const { error: itemError } = await supabase.from('fdc_room_intake_items').insert(
        input.items.map((item) => ({
          intake_id: intakeRow.id,
          item_name: item.itemName.trim(),
          quantity: Number(item.quantity),
          unit: item.unit.trim(),
        })),
      );

      if (itemError) {
        throw itemError;
      }

      await refresh();
    },
    [refresh, user],
  );

  const updateMaintenanceStatus = React.useCallback(
    async (reportId: string, status: MaintenanceStatus) => {
      const { error: updateError } = await supabase
        .from('fdc_room_intakes')
        .update({
          status: mapMaintenanceStatusToIntakeStatus(status),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updateError) {
        throw updateError;
      }

      await refresh();
    },
    [refresh],
  );

  return {
    maintenanceReports,
    supplyRequests,
    isLoading,
    error,
    refresh,
    createMaintenanceReport,
    createSupplyRequest,
    updateMaintenanceStatus,
  };
}
