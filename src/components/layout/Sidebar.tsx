/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, CheckCircle, FileText, Home, Package, Pill, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { WEEKLY_REPORT_ROLES } from '@/lib/weekly-report';
import { cn } from '@/lib/utils';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Trang chủ', icon: Home, roles: ['all'] },
  { path: '/requests', label: 'Đề nghị của tôi', icon: FileText, roles: ['all'] },
  {
    path: '/approvals',
    label: 'Phê duyệt',
    icon: CheckCircle,
    roles: ['dept_head', 'accountant', 'director', 'chairman', 'super_admin'],
  },
  { path: '/pharmacy', label: 'Kho thuốc', icon: Pill, roles: ['dept_head', 'super_admin'] },
  { path: '/inventory', label: 'Kho vật tư', icon: Package, roles: ['dept_head', 'super_admin'] },
  { path: '/weekly-report', label: 'Báo cáo giao ban', icon: BarChart3, roles: WEEKLY_REPORT_ROLES },
  { path: '/reports', label: 'Báo cáo', icon: BarChart3, roles: ['super_admin', 'director', 'chairman', 'accountant'] },
  { path: '/portal', label: 'Cá nhân', icon: User, roles: ['all'] },
  { path: '/admin', label: 'Quản trị', icon: Settings, roles: ['super_admin'] },
];

export function Sidebar({
  isOpen,
  onClose,
  pendingCount = 0,
}: {
  isOpen: boolean;
  onClose: () => void;
  pendingCount?: number;
}) {
  const { user } = useAuth();

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles.includes('all') || item.roles.includes(user.role),
  );

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out md:static md:flex-shrink-0 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center border-b border-gray-200 px-6 md:hidden">
          <span className="text-lg font-semibold text-indigo-900">FDC Portal</span>
        </div>

        <nav className="space-y-1 p-4">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isApprovals = item.path === '/approvals';

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1">{item.label}</span>
                {isApprovals && pendingCount > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
