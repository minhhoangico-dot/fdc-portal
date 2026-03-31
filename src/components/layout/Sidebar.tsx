/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getVisibleNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

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

  const visibleItems = getVisibleNavItems(user.role);

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
