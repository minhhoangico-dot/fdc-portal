/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OnsiteAccessDenied } from '@/components/auth/OnsiteAccessDenied';
import { useAuth } from '@/contexts/AuthContext';
import {
  canBypassOnsiteAccess,
  getOnsiteAccessContent,
  type OnsiteAccessReason,
  type OnsiteAccessSurface,
} from '@/lib/onsite-access';
import {
  cacheTvGeolocationAccess,
  clearTvGeolocationCache,
  fetchTvAccessCheck,
  findAllowedTvSite,
  hasValidTvGeolocationCache,
  requestBrowserLocation,
} from '@/lib/tv-access';

function isBrowserGeolocationError(error: unknown): error is GeolocationPositionError {
  return !!error && typeof error === 'object' && 'code' in error;
}

function mapGeolocationError(error: unknown): OnsiteAccessReason {
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

export function OnsiteAccessGate({
  children,
  surface,
}: {
  children: React.ReactNode;
  surface: OnsiteAccessSurface;
}) {
  const { user, loading: authLoading } = useAuth();
  const [isAllowed, setIsAllowed] = React.useState(false);
  const [denyReason, setDenyReason] = React.useState<OnsiteAccessReason>(null);
  const [attempt, setAttempt] = React.useState(0);
  const [checking, setChecking] = React.useState(true);
  const content = getOnsiteAccessContent(surface, denyReason);

  React.useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const verifyAccess = async () => {
      setChecking(true);
      setDenyReason(null);
      setIsAllowed(false);

      if (user && canBypassOnsiteAccess(user.role)) {
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
        setDenyReason(
          access.status === 'deny_not_configured'
            ? 'deny_not_configured'
            : access.reason === 'outside_allowed_networks'
              ? 'outside_allowed_networks'
              : 'bridge_check_failed',
        );
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
  }, [attempt, authLoading, surface, user]);

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-slate-300">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500" />
          <p className="text-sm">{content.loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <OnsiteAccessDenied
        title={content.title}
        description={content.description}
        onRetry={() => setAttempt((current) => current + 1)}
      />
    );
  }

  return <>{children}</>;
}
