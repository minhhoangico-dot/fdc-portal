/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPinOff, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function TvAccessDenied({
  description,
  onRetry,
}: {
  description: string;
  onRetry: () => void;
}) {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/95 p-8 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-2xl font-semibold">Khong the mo man hinh TV</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300">
            <MapPinOff className="h-3.5 w-3.5" />
            Chi cho phep tai Phong kham hoac Chi nhanh. Super admin duoc truy cap moi noi.
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Thu lai
          </button>

          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Ve dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              state={{ from: location }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Dang nhap admin
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
