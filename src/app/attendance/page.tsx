/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  FileBarChart2,
  History,
  Settings,
  Users,
  ClockAlert,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/access';
import type { PermissionAction } from '@/types/permissions';
import ManagerTab from './ManagerTab';
import ReportsTab from './ReportsTab';
import EmployeesTab from './EmployeesTab';
import SettingsTab from './SettingsTab';
import ScheduleExceptionsTab from './ScheduleExceptionsTab';
import HistoryTab from './HistoryTab';

type TabKey =
  | 'manager'
  | 'reports'
  | 'employees'
  | 'settings'
  | 'exceptions'
  | 'history';

interface TabDef {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  permission: PermissionAction;
}

const TABS: TabDef[] = [
  {
    key: 'manager',
    label: 'Đi muộn',
    icon: <ClockAlert className="w-4 h-4" />,
    permission: 'attendance.view_team',
  },
  {
    key: 'reports',
    label: 'Báo cáo',
    icon: <FileBarChart2 className="w-4 h-4" />,
    permission: 'attendance.view_team',
  },
  {
    key: 'history',
    label: 'Lịch sử',
    icon: <History className="w-4 h-4" />,
    permission: 'attendance.view_self',
  },
  {
    key: 'employees',
    label: 'Nhân viên',
    icon: <Users className="w-4 h-4" />,
    permission: 'attendance.manage_employees',
  },
  {
    key: 'exceptions',
    label: 'Lịch riêng',
    icon: <CalendarClock className="w-4 h-4" />,
    permission: 'attendance.manage_exceptions',
  },
  {
    key: 'settings',
    label: 'Cấu hình',
    icon: <Settings className="w-4 h-4" />,
    permission: 'attendance.manage_settings',
  },
];

export default function AttendancePage() {
  const { user } = useAuth();
  const visibleTabs = useMemo(() => {
    if (!user) return [];
    return TABS.filter((tab) => can(user.role, tab.permission));
  }, [user]);

  const [activeTab, setActiveTab] = useState<TabKey>(
    visibleTabs[0]?.key ?? 'history',
  );

  React.useEffect(() => {
    if (!visibleTabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key ?? 'history');
    }
  }, [visibleTabs, activeTab]);

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Chấm công</h1>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'manager' && <ManagerTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'history' && <HistoryTab />}
      {activeTab === 'employees' && <EmployeesTab />}
      {activeTab === 'exceptions' && <ScheduleExceptionsTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}
