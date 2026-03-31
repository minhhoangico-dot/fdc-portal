/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TvContentType = 'url' | 'internal';

export interface TvScreen {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  contentType: TvContentType;
  contentUrl: string;
  isActive: boolean;
  refreshIntervalSeconds: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
