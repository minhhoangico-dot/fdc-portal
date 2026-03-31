/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Package, Wrench, X } from 'lucide-react';
import { RoomInfoPanel } from '@/components/room-management/RoomInfoPanel';
import { MaintenanceTab } from '@/components/room-management/MaintenanceTab';
import { SupplyTab } from '@/components/room-management/SupplyTab';
import { cn } from '@/lib/utils';
import type {
  CreateMaintenanceReportInput,
  CreateSupplyRequestInput,
  RoomActivityItem,
  RoomCatalogEntry,
  RoomDrawerTab,
  RoomSummary,
  RoomMaintenanceReport,
  RoomSupplyRequest,
} from '@/types/roomManagement';

interface RoomDrawerProps {
  room: RoomCatalogEntry | null;
  activeTab: RoomDrawerTab;
  summary: RoomSummary | null;
  activity: RoomActivityItem[];
  maintenanceReports: RoomMaintenanceReport[];
  supplyRequests: RoomSupplyRequest[];
  onClose: () => void;
  onTabChange: (tab: RoomDrawerTab) => void;
  onCreateMaintenance: (input: CreateMaintenanceReportInput) => void;
  onCreateSupply: (input: CreateSupplyRequestInput) => void;
}

const TABS: Array<{ id: RoomDrawerTab; label: string; icon: typeof Wrench }> = [
  { id: 'overview', label: 'Tổng quan', icon: Package },
  { id: 'maintenance', label: 'Sự cố / bảo trì', icon: Wrench },
  { id: 'supply', label: 'Vật tư', icon: Package },
];

export function RoomDrawer({
  room,
  activeTab,
  summary,
  activity,
  maintenanceReports,
  supplyRequests,
  onClose,
  onTabChange,
  onCreateMaintenance,
  onCreateSupply,
}: RoomDrawerProps) {
  if (!room || !summary) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-gray-900/30 backdrop-blur-[1px]" onClick={onClose} />

      <aside className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-3xl border border-gray-200 bg-white shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:w-[30rem] md:max-h-none md:rounded-none md:border-l">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-600">{room.code}</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">{room.name}</h2>
            <p className="mt-1 text-sm text-gray-500">Tầng {room.floor}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-3 py-2">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-gray-100 p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.id === 'overview' ? 'Info' : tab.id === 'maintenance' ? 'Sự cố' : 'Vật tư'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {activeTab === 'overview' && <RoomInfoPanel room={room} summary={summary} activity={activity} />}
          {activeTab === 'maintenance' && (
            <MaintenanceTab room={room} reports={maintenanceReports} onCreate={onCreateMaintenance} />
          )}
          {activeTab === 'supply' && (
            <SupplyTab room={room} requests={supplyRequests} onCreate={onCreateSupply} />
          )}
        </div>
      </aside>
    </>
  );
}
