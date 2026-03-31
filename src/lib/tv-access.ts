/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { bridgeRequest } from '@/lib/bridge-client';
import type { TvAccessCheckResponse, TvAllowedSite } from '@/types/tvAccess';

const TV_GEOLOCATION_CACHE_KEY = 'fdc_tv_access_geolocation';
const TV_GEOLOCATION_CACHE_TTL_MS = 10 * 60 * 1000;

interface CachedTvGeolocationAccess {
  expiresAt: number;
  matchedSiteKey: string;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function getDistanceInMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function readGeolocationCache(): CachedTvGeolocationAccess | null {
  try {
    const raw = window.sessionStorage.getItem(TV_GEOLOCATION_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedTvGeolocationAccess>;
    if (
      typeof parsed.expiresAt !== 'number' ||
      Number.isNaN(parsed.expiresAt) ||
      typeof parsed.matchedSiteKey !== 'string'
    ) {
      window.sessionStorage.removeItem(TV_GEOLOCATION_CACHE_KEY);
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(TV_GEOLOCATION_CACHE_KEY);
      return null;
    }

    return {
      expiresAt: parsed.expiresAt,
      matchedSiteKey: parsed.matchedSiteKey,
    };
  } catch {
    window.sessionStorage.removeItem(TV_GEOLOCATION_CACHE_KEY);
    return null;
  }
}

export function clearTvGeolocationCache(): void {
  try {
    window.sessionStorage.removeItem(TV_GEOLOCATION_CACHE_KEY);
  } catch {
    // Ignore browser storage errors and continue with live checks.
  }
}

export function hasValidTvGeolocationCache(allowedSites: TvAllowedSite[]): boolean {
  const cached = readGeolocationCache();
  if (!cached) return false;

  return allowedSites.some((site) => site.key === cached.matchedSiteKey);
}

export function cacheTvGeolocationAccess(siteKey: string): void {
  try {
    const payload: CachedTvGeolocationAccess = {
      expiresAt: Date.now() + TV_GEOLOCATION_CACHE_TTL_MS,
      matchedSiteKey: siteKey,
    };
    window.sessionStorage.setItem(TV_GEOLOCATION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore browser storage errors and continue without cache.
  }
}

export function findAllowedTvSite(
  latitude: number,
  longitude: number,
  allowedSites: TvAllowedSite[],
): TvAllowedSite | null {
  for (const site of allowedSites) {
    const distance = getDistanceInMeters(latitude, longitude, site.latitude, site.longitude);
    if (distance <= site.radiusMeters) {
      return site;
    }
  }

  return null;
}

export async function fetchTvAccessCheck(): Promise<TvAccessCheckResponse> {
  return bridgeRequest<TvAccessCheckResponse>('/tv-access/check', {
    method: 'GET',
    cache: 'no-store',
  });
}

export async function requestBrowserLocation(): Promise<GeolocationPosition> {
  if (!window.isSecureContext || !('geolocation' in navigator)) {
    throw new Error('geolocation_unavailable');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 0,
    });
  });
}
