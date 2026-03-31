/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { useAuth } from '@/contexts/AuthContext';
import { canRoleAccessModule } from '@/lib/navigation';
import type { ModuleKey } from '@/types/roleCatalog';
import { Role } from '@/types/user';

export function RequireAuth({
  children,
  roles,
  moduleKey,
}: {
  children: React.ReactNode;
  roles?: Role[];
  moduleKey?: ModuleKey;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        Dang tai phien lam viec...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (moduleKey && !canRoleAccessModule(user.role, moduleKey)) {
    return <AccessDenied />;
  }

  if (roles && !roles.includes(user.role)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
