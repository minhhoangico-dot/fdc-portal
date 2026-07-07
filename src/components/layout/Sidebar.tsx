/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { can } from '@/lib/permissions/access';
import { getPrimaryNav, type PrimaryNavItem, type ReferenceNavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

const primaryLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-ink-600 hover:bg-brand-50/60 hover:text-ink-900',
  );

function PrimaryLink({ item, badgeCount }: { item: PrimaryNavItem; badgeCount: number }) {
  if (!item.path) return null;
  const Icon = item.icon;

  return (
    <NavLink to={item.path} className={primaryLinkClass} end={item.path === '/dashboard'}>
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && badgeCount > 0 && (
        <span className="rounded-full bg-danger-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white tabular-nums">
          {badgeCount}
        </span>
      )}
    </NavLink>
  );
}

function ReferenceLink({ item }: { item: ReferenceNavItem }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-field px-3 py-2 text-[13px] font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-ink-600 hover:bg-brand-50/60 hover:text-ink-900',
        )
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
    </NavLink>
  );
}

export function Sidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const { user } = useAuth();

  if (!user) return null;

  const primary = getPrimaryNav(user.role);
  const reference = primary.find((item) => item.slot === 'reference');
  const referenceChildren = reference?.children ?? [];
  const showAdmin = can(user.role, 'admin.view');

  return (
    <aside className="hidden w-[var(--sidebar-width)] flex-shrink-0 flex-col border-r border-line bg-paper lg:flex">
      <div className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-line px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-field bg-brand-600 text-sm font-bold text-white">
          F
        </span>
        <span className="text-base font-semibold text-brand-700">FDC Portal</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {primary.map((item) =>
          item.slot === 'reference' ? (
            referenceChildren.length > 0 && (
              <div key="reference" className="pt-3">
                {reference && (
                  <div className="flex items-center gap-2 px-3 pb-1">
                    <reference.icon className="h-3.5 w-3.5 text-ink-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                      {reference.label}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {referenceChildren.map((child) => (
                    <ReferenceLink key={child.key} item={child} />
                  ))}
                </div>
              </div>
            )
          ) : (
            <PrimaryLink key={item.slot} item={item} badgeCount={pendingCount} />
          ),
        )}
      </nav>

      {showAdmin && (
        <div className="flex-shrink-0 border-t border-line p-3">
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-600 hover:bg-brand-50/60 hover:text-ink-900',
              )
            }
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1 truncate">Quản trị</span>
          </NavLink>
        </div>
      )}
    </aside>
  );
}
