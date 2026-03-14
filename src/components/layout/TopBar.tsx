import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLES } from "@/lib/constants";
import { Bell, RefreshCw, Menu, User, Key, LogOut, Camera } from "lucide-react";
import { NotificationCenter } from "./NotificationCenter";
import { PasswordChangeModal } from "./PasswordChangeModal";
import { useNotifications } from "@/viewmodels/useNotifications";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate();
  const { user, logout, updateAvatar } = useAuth();
  const { unreadCount } = useNotifications();
  const [isStale, setIsStale] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsUserMenuOpen(false);
    };
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  if (!user) return null;

  const avatarEl = user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.name}
      className="w-8 h-8 rounded-full border border-gray-200 object-cover"
    />
  ) : (
    <div className="w-8 h-8 rounded-full border border-gray-200 bg-gray-200 flex items-center justify-center text-gray-600 text-sm font-medium">
      {user.name?.charAt(0) || "?"}
    </div>
  );

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-4 h-14">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="font-semibold text-indigo-900 hidden md:block">
          FDC Portal
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        {isStale && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span className="hidden sm:inline">Đang đồng bộ...</span>
          </div>
        )}

        <button
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>

        <NotificationCenter
          isOpen={isNotificationOpen}
          onClose={() => setIsNotificationOpen(false)}
        />

        <div className="relative flex items-center gap-3 pl-4 border-l border-gray-200" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((o) => !o)}
            className="flex items-center gap-3 rounded-lg hover:bg-gray-50 p-1 -m-1 transition-colors"
          >
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900 leading-none">
                {user.name}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {ROLES[user.role]}
              </span>
            </div>
            {avatarEl}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <label className="relative cursor-pointer group flex-shrink-0">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {user.name?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await updateAvatar(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500">{ROLES[user.role]}</div>
                    {user.department && (
                      <div className="text-xs text-gray-400 truncate">
                        {user.department}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigate("/portal");
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="w-4 h-4 flex-shrink-0" /> Trang cá nhân
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(true);
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Key className="w-4 h-4 flex-shrink-0" /> Đổi mật khẩu
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                type="button"
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" /> Đăng xuất
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
