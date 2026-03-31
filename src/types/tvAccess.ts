/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TvAccessStatus =
  | 'allowed_by_network'
  | 'require_geolocation'
  | 'deny_not_configured'
  | 'deny';

export interface TvAllowedSite {
  key: string;
  label: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface TvMatchedNetwork {
  key: string;
  label: string;
}

export interface TvAccessCheckResponse {
  status: TvAccessStatus;
  matchedNetwork: TvMatchedNetwork | null;
  allowedSites: TvAllowedSite[];
  clientIp: string | null;
  reason: string | null;
}
