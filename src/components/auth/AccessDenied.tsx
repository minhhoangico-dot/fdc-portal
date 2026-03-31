/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole, ShieldAlert } from 'lucide-react';

export function AccessDenied({
  title = 'Khong co quyen truy cap',
  description = 'Tai khoan cua ban khong duoc phan quyen de xem module nay, ke ca khi mo bang link truc tiep.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">{description}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Ve dashboard
          </Link>
          <Link
            to="/portal"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <LockKeyhole className="h-4 w-4" />
            Xem thong tin tai khoan
          </Link>
        </div>
      </div>
    </div>
  );
}
