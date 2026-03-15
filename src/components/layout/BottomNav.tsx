import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from './Sidebar';
import { cn } from '@/lib/utils';
import { MoreHorizontal, X } from 'lucide-react';

export function BottomNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles.includes('all') || item.roles.includes(user.role)
  );

  const overflowItems = visibleItems.slice(4);
  const primaryItems = overflowItems.length > 0 ? visibleItems.slice(0, 4) : visibleItems;
  const isPathActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const isMoreActive = overflowItems.some((item) => isPathActive(item.path));

  return (
    <>
      {isMoreOpen && overflowItems.length > 0 && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/20 z-40" onClick={() => setIsMoreOpen(false)} />
          <div className="md:hidden fixed inset-x-0 bottom-16 z-50 rounded-t-2xl border-t border-gray-200 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Thêm</h3>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4" />
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
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                        isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )
                    }
                  >
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {isApprovals && pendingCount > 0 && (
                        <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none">
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

      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isApprovals = item.path === '/approvals';

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "relative flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors",
                    isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"
                  )
                }
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {isApprovals && pendingCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                      {pendingCount}
                    </span>
                  )}
                </div>
                <span className="truncate w-full text-center px-1">{item.label}</span>
              </NavLink>
            );
          })}

          {overflowItems.length > 0 && (
            <button
              type="button"
              onClick={() => setIsMoreOpen((open) => !open)}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors",
                isMoreActive || isMoreOpen ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <MoreHorizontal className="w-6 h-6" />
              <span className="truncate w-full text-center px-1">Thêm</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
