/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getPrimaryNav, type PrimaryNavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

function SlotInner({
  item,
  active,
  badgeCount,
}: {
  item: PrimaryNavItem;
  active: boolean;
  badgeCount: number;
}) {
  const Icon = item.icon;
  return (
    <>
      {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-600" />}
      <div className="relative">
        <Icon className="h-6 w-6" />
        {item.badge && badgeCount > 0 && (
          <span className="absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full bg-danger-600 px-1 py-0.5 text-center text-[10px] font-semibold leading-none text-white tabular-nums">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
      <span className="w-full truncate px-0.5 text-center text-[11px] font-medium leading-none">
        {item.label}
      </span>
    </>
  );
}

export function BottomNav({ pendingCount = 0 }: { pendingCount?: number }) {
  const { user } = useAuth();
  const location = useLocation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    setIsSheetOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const primary = getPrimaryNav(user.role);
  const reference = primary.find((item) => item.slot === 'reference');
  const referenceChildren = reference?.children ?? [];

  const isPathActive = (path: string) =>
    location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(`${path}/`));
  const isReferenceActive =
    isSheetOpen || referenceChildren.some((child) => isPathActive(child.path));

  return (
    <>
      {isSheetOpen && reference && referenceChildren.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink-900/20 lg:hidden"
            onClick={() => setIsSheetOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-16 z-50 rounded-t-card border-t border-line bg-card p-4 shadow-card lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">{reference.label}</h3>
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
                className="rounded-full p-2 text-ink-400 hover:bg-brand-50 hover:text-ink-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {referenceChildren.map((child) => {
                const Icon = child.icon;
                return (
                  <NavLink
                    key={child.key}
                    to={child.path}
                    onClick={() => setIsSheetOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-field px-3 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-ink-600 hover:bg-brand-50/60 hover:text-ink-900',
                      )
                    }
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 truncate">{child.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-safe lg:hidden">
        <div className="grid h-16 grid-cols-5">
          {primary.map((item) => {
            if (item.slot === 'reference') {
              return (
                <button
                  key="reference"
                  type="button"
                  onClick={() => setIsSheetOpen((open) => !open)}
                  className={cn(
                    'relative flex h-full w-full flex-col items-center justify-center gap-1 transition-colors',
                    isReferenceActive ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600',
                  )}
                >
                  <SlotInner item={item} active={isReferenceActive} badgeCount={0} />
                </button>
              );
            }

            const active = item.path ? isPathActive(item.path) : false;
            return (
              <NavLink
                key={item.slot}
                to={item.path ?? '#'}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-full w-full flex-col items-center justify-center gap-1 transition-colors',
                    isActive || active ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600',
                  )
                }
              >
                <SlotInner item={item} active={active} badgeCount={pendingCount} />
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
