/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Camera, Key, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCatalog } from '@/contexts/RoleCatalogContext';
import { useNotifications } from '@/viewmodels/useNotifications';
import { useBridgeHeartbeat } from '@/viewmodels/useBridgeHeartbeat';
import { getPrimaryNav } from '@/lib/navigation';
import type { Role } from '@/types/user';
import { cn } from '@/lib/utils';
import { NotificationCenter } from './NotificationCenter';
import { PasswordChangeModal } from './PasswordChangeModal';

/** Best-effort page title from the current path against the role's nav surfaces. */
function resolvePageTitle(role: Role, pathname: string): string {
  const candidates: { path: string; label: string }[] = [];
  for (const item of getPrimaryNav(role)) {
    if (item.path) candidates.push({ path: item.path, label: item.label });
    for (const child of item.children ?? []) {
      candidates.push({ path: child.path, label: child.label });
    }
  }
  candidates.push({ path: '/admin', label: 'Quản trị' });

  const match = candidates
    .filter(({ path }) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];

  return match?.label ?? 'FDC Portal';
}

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateAvatar } = useAuth();
  const { getRoleLabel } = useRoleCatalog();
  const { unreadCount } = useNotifications();
  const heartbeat = useBridgeHeartbeat();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pageTitle = useMemo(
    () => (user ? resolvePageTitle(user.role, location.pathname) : ''),
    [user, location.pathname],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isUserMenuOpen]);

  if (!user) return null;

  const avatarEl = user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.name}
      className="h-8 w-8 rounded-full border border-line object-cover"
    />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-brand-50 text-sm font-medium text-brand-700">
      {user.name?.charAt(0) || '?'}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between border-b border-line bg-card px-4">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-base font-semibold text-ink-900">{pageTitle}</h1>
        {heartbeat.available && (
          <span
            className={cn(
              'h-2 w-2 flex-shrink-0 rounded-full',
              heartbeat.isStale ? 'bg-warn-600' : 'bg-brand-500',
            )}
            title={
              heartbeat.isStale
                ? 'Dữ liệu đồng bộ có thể chưa cập nhật'
                : 'Đồng bộ dữ liệu đang hoạt động'
            }
            aria-label={
              heartbeat.isStale ? 'Đồng bộ dữ liệu chậm' : 'Đồng bộ dữ liệu đang hoạt động'
            }
          />
        )}
      </div>

      <div className="relative flex items-center gap-3">
        <button
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          className="relative rounded-full p-2 text-ink-600 transition-colors hover:bg-brand-50"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger-600 ring-2 ring-card" />
          )}
        </button>

        <NotificationCenter
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
        />

        <div
          className="relative flex items-center gap-3 border-l border-line pl-3"
          ref={userMenuRef}
        >
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((open) => !open)}
            className="-m-1 flex items-center gap-3 rounded-field p-1 transition-colors hover:bg-brand-50/60"
          >
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-medium leading-none text-ink-900">{user.name}</span>
              <span className="mt-1 text-xs text-ink-600">{getRoleLabel(user.role)}</span>
            </div>
            {avatarEl}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-card border border-line bg-card py-2 shadow-card">
              <div className="border-b border-line px-4 py-3">
                <div className="flex items-center gap-3">
                  <label className="group relative flex-shrink-0 cursor-pointer">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-medium text-brand-700">
                        {user.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (file) await updateAvatar(file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink-900">{user.name}</div>
                    <div className="text-xs text-ink-600">{getRoleLabel(user.role)}</div>
                    {user.department && (
                      <div className="truncate text-xs text-ink-400">{user.department}</div>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigate('/portal');
                  setIsUserMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-900 hover:bg-brand-50/60"
              >
                <User className="h-4 w-4 flex-shrink-0" /> Trang cá nhân
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(true);
                  setIsUserMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-900 hover:bg-brand-50/60"
              >
                <Key className="h-4 w-4 flex-shrink-0" /> Đổi mật khẩu
              </button>
              <div className="my-1 border-t border-line" />
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-600/10"
              >
                <LogOut className="h-4 w-4 flex-shrink-0" /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </header>
  );
}
