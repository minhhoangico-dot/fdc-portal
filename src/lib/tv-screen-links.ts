/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WEEKLY_REPORT_MANAGEMENT_PATH, WEEKLY_REPORT_TV_PATH } from '@/lib/weekly-report';
import type { TvScreen } from '@/types/tvScreen';

type TvScreenLinkInput = Pick<TvScreen, 'slug' | 'contentType' | 'contentUrl' | 'settings'>;
type TvScreenFeatureKey = 'weekly_report';

const LEGACY_WEEKLY_REPORT_TV_PATH = '/weekly-report/tv';

export function getTvScreenPublicAlias(screen: TvScreenLinkInput): string {
  return `/tv/${screen.slug}`;
}

export function getTvScreenPreviewHref(screen: TvScreenLinkInput): string {
  if (screen.contentType === 'internal') {
    return screen.contentUrl;
  }

  return getTvScreenPublicAlias(screen);
}

export function getTvScreenFeatureKey(screen: Pick<TvScreen, 'settings'>): string | null {
  const value = screen.settings?.featureKey;
  return typeof value === 'string' && value.trim() ? value : null;
}

export function hasTvScreenFeature(
  screen: Pick<TvScreen, 'settings'>,
  featureKey: TvScreenFeatureKey,
): boolean {
  return getTvScreenFeatureKey(screen) === featureKey;
}

export function isWeeklyReportTvScreen(screen: TvScreenLinkInput): boolean {
  if (hasTvScreenFeature(screen, 'weekly_report')) {
    return true;
  }

  return (
    screen.contentType === 'internal' &&
    (screen.contentUrl === LEGACY_WEEKLY_REPORT_TV_PATH || screen.contentUrl === WEEKLY_REPORT_TV_PATH)
  );
}

export function getTvScreenSettingsHref(screen: TvScreenLinkInput): string | null {
  if (isWeeklyReportTvScreen(screen)) {
    return WEEKLY_REPORT_MANAGEMENT_PATH;
  }

  return null;
}
