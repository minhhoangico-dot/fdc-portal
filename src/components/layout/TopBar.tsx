/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Camera, Key, LogOut, Menu, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleCatalog } from '@/contexts/RoleCatalogContext';
import { useNotifications } from '@/viewmodels/useNotifications';
import { NotificationCenter } from './NotificationCenter';
import { PasswordChangeModal } from './PasswordChangeModal';

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const { user, logout, updateAvatar } = useAuth();
  const { getRoleLabel } = useRoleCatalog();
  const { unreadCount } = useNotifications();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      className="h-8 w-8 rounded-full border border-gray-200 object-cover"
    />
  ) : (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-200 text-sm font-medium text-gray-600">
      {user.name?.charAt(0) || '?'}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="-ml-2 rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden font-semibold text-indigo-900 md:block">FDC Portal</div>
      </div>

      <div className="relative flex items-center gap-4">
        <button
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          className="relative rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>

        <NotificationCenter
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
        />

        <div
          className="relative flex items-center gap-3 border-l border-gray-200 pl-4"
          ref={userMenuRef}
        >
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((open) => !open)}
            className="-m-1 flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-gray-50"
          >
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium leading-none text-gray-900">{user.name}</span>
              <span className="mt-1 text-xs text-gray-500">{getRoleLabel(user.role)}</span>
            </div>
            {avatarEl}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
              <div className="border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <label className="group relative flex-shrink-0 cursor-pointer">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 font-medium text-gray-600">
                        {user.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
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
                    <div className="truncate text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{getRoleLabel(user.role)}</div>
                    {user.department && (
                      <div className="truncate text-xs text-gray-400">{user.department}</div>
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
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="h-4 w-4 flex-shrink-0" /> Trang cá nhân
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(true);
                  setIsUserMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Key className="h-4 w-4 flex-shrink-0" /> Đổi mật khẩu
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
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
