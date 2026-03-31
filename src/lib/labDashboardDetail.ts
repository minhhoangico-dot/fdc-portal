/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  LabDashboardDetailFocus,
  LabDashboardDetailSection,
  LabDashboardDetailTab,
} from '@/types/labDashboard';

export type LabDashboardTvDetailState =
  | { view: 'summary' }
  | {
      view: 'detail';
      section: LabDashboardDetailSection;
      focus: LabDashboardDetailFocus;
      tab: LabDashboardDetailTab;
    };

function isQueueFocus(value: string): boolean {
  return value === 'waiting' || value === 'processing' || value === 'completed';
}

function isTatFocus(value: string): boolean {
  return (
    value === 'average' ||
    value === 'median' ||
    value === 'requested_to_processing' ||
    value === 'processing_to_result' ||
    /^type:[a-z0-9-]+$/i.test(value)
  );
}

function isReagentFocus(value: string): boolean {
  return value === 'all' || /^reagent:[a-z0-9-]+$/i.test(value);
}

export function isValidLabDashboardDetailSelection(section: string, focus: string): boolean {
  if (section === 'queue') return isQueueFocus(focus);
  if (section === 'tat') return isTatFocus(focus);
  if (section === 'abnormal') return focus === 'all';
  if (section === 'reagents') return isReagentFocus(focus);
  return false;
}

export function parseLabDashboardTvDetailState(searchParams: URLSearchParams): LabDashboardTvDetailState {
  if (searchParams.get('view') !== 'detail') {
    return { view: 'summary' };
  }

  const section = searchParams.get('section') || '';
  const focus = searchParams.get('focus') || '';
  const tab = searchParams.get('tab') === 'source' ? 'source' : 'list';

  if (
    (section !== 'queue' && section !== 'tat' && section !== 'abnormal' && section !== 'reagents') ||
    !isValidLabDashboardDetailSelection(section, focus)
  ) {
    return { view: 'summary' };
  }

  return {
    view: 'detail',
    section,
    focus: focus as LabDashboardDetailFocus,
    tab,
  };
}

export function buildLabDashboardTvDetailSearch(input: {
  section: LabDashboardDetailSection;
  focus: LabDashboardDetailFocus;
  tab?: LabDashboardDetailTab;
}): string {
  const searchParams = new URLSearchParams({
    view: 'detail',
    section: input.section,
    focus: input.focus,
    tab: input.tab || 'list',
  });

  return `?${searchParams.toString()}`;
}
