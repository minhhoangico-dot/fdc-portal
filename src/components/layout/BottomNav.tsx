/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getVisibleNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function BottomNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const visibleItems = getVisibleNavItems(user.role);
  const overflowItems = visibleItems.slice(4);
  const primaryItems = overflowItems.length > 0 ? visibleItems.slice(0, 4) : visibleItems;
  const isPathActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);
  const isMoreActive = overflowItems.some((item) => isPathActive(item.path));

  return (
    <>
      {isMoreOpen && overflowItems.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setIsMoreOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-16 z-50 rounded-t-2xl border-t border-gray-200 bg-white p-4 shadow-2xl md:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Thêm</h3>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {overflowItems.map((item) => {
                const Icon = item.icon;
                const isApprovals = item.path === '/approvals';

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      )
                    }
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5" />
                      {isApprovals && pendingCount > 0 && (
                        <span className="absolute -right-2 -top-1 min-w-[16px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                          {pendingCount}
                        </span>
                      )}
                    </div>
                    <span className="flex-1">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 bg-white pb-safe md:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isApprovals = item.path === '/approvals';

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-full w-full flex-col items-center justify-center space-y-1 text-xs font-medium transition-colors',
                    isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900',
                  )
                }
              >
                <div className="relative">
                  <Icon className="h-6 w-6" />
                  {isApprovals && pendingCount > 0 && (
                    <span className="absolute -right-2 -top-1 min-w-[16px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span className="w-full truncate px-1 text-center">{item.label}</span>
              </NavLink>
            );
          })}

          {overflowItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsMoreOpen((open) => !open)}
              className={cn(
                'relative flex h-full w-full flex-col items-center justify-center space-y-1 text-xs font-medium transition-colors',
                isMoreActive || isMoreOpen
                  ? 'text-indigo-600'
                  : 'text-gray-500 hover:text-gray-900',
              )}
            >
              <MoreHorizontal className="h-6 w-6" />
              <span className="w-full truncate px-1 text-center">Thêm</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
