/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TvAccessDenied } from '@/components/auth/TvAccessDenied';
import { useAuth } from '@/contexts/AuthContext';
import {
  cacheTvGeolocationAccess,
  clearTvGeolocationCache,
  fetchTvAccessCheck,
  findAllowedTvSite,
  hasValidTvGeolocationCache,
  requestBrowserLocation,
} from '@/lib/tv-access';

function getTvAccessMessage(reason: string | null): string {
  switch (reason) {
    case 'geolocation_permission_denied':
      return 'Trinh duyet dang chan quyen vi tri. Hay cap quyen location roi thu lai.';
    case 'geolocation_position_unavailable':
      return 'Khong the xac dinh vi tri hien tai. Hay kiem tra GPS hoac mang, sau do thu lai.';
    case 'geolocation_timeout':
      return 'Het thoi gian lay vi tri. Hay thu lai khi thiet bi co GPS va mang on dinh.';
    case 'geolocation_outside_allowed_sites':
      return 'Ban chi duoc mo man hinh TV khi dang o Phong kham hoac Chi nhanh da cau hinh.';
    case 'deny_not_configured':
      return 'TV access policy chua duoc cau hinh tren bridge, nen truy cap TV dang bi chan.';
    case 'outside_allowed_networks':
      return 'Mang hien tai khong nam trong allowlist va khong co vi tri hop le de mo man hinh TV.';
    case 'geolocation_unavailable':
      return 'Thiet bi hoac trinh duyet nay khong ho tro location tren ket noi hien tai.';
    default:
      return 'Khong the xac minh vi tri truy cap TV. Hay thu lai hoac dang nhap bang tai khoan super admin.';
  }
}

function isBrowserGeolocationError(error: unknown): error is GeolocationPositionError {
  return !!error && typeof error === 'object' && 'code' in error;
}

function mapGeolocationError(error: unknown): string {
  if (error instanceof Error && error.message === 'geolocation_unavailable') {
    return 'geolocation_unavailable';
  }

  if (!isBrowserGeolocationError(error)) {
    return 'geolocation_unknown_error';
  }

  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'geolocation_permission_denied';
    case error.POSITION_UNAVAILABLE:
      return 'geolocation_position_unavailable';
    case error.TIMEOUT:
      return 'geolocation_timeout';
    default:
      return 'geolocation_unknown_error';
  }
}

export function TvAccessGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAllowed, setIsAllowed] = React.useState(false);
  const [denyReason, setDenyReason] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const verifyAccess = async () => {
      setChecking(true);
      setDenyReason(null);
      setIsAllowed(false);

      if (user?.role === 'super_admin') {
        if (!cancelled) {
          setIsAllowed(true);
          setChecking(false);
        }
        return;
      }

      try {
        const access = await fetchTvAccessCheck();
        if (cancelled) return;

        if (access.status === 'allowed_by_network') {
          setIsAllowed(true);
          setChecking(false);
          return;
        }

        if (access.status === 'require_geolocation') {
          if (hasValidTvGeolocationCache(access.allowedSites)) {
            setIsAllowed(true);
            setChecking(false);
            return;
          }

          try {
            const position = await requestBrowserLocation();
            if (cancelled) return;

            const matchedSite = findAllowedTvSite(
              position.coords.latitude,
              position.coords.longitude,
              access.allowedSites,
            );

            if (matchedSite) {
              cacheTvGeolocationAccess(matchedSite.key);
              setIsAllowed(true);
              setChecking(false);
              return;
            }

            clearTvGeolocationCache();
            setDenyReason('geolocation_outside_allowed_sites');
            setChecking(false);
            return;
          } catch (error) {
            clearTvGeolocationCache();
            setDenyReason(mapGeolocationError(error));
            setChecking(false);
            return;
          }
        }

        clearTvGeolocationCache();
        setDenyReason(access.status === 'deny_not_configured' ? 'deny_not_configured' : access.reason || 'outside_allowed_networks');
      } catch {
        clearTvGeolocationCache();
        setDenyReason('bridge_check_failed');
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [attempt, authLoading, user?.role]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-slate-300">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500" />
          <p className="text-sm">Dang xac minh quyen truy cap man hinh TV...</p>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <TvAccessDenied
        description={getTvAccessMessage(denyReason)}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    );
  }

  return <>{children}</>;
}
