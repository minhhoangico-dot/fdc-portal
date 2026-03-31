/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { LabDashboardDetailScreen } from '@/components/lab-dashboard/LabDashboardDetailScreen';
import { LabDashboardDisplay } from '@/components/lab-dashboard/LabDashboardDisplay';
import { buildLabDashboardTvDetailSearch, parseLabDashboardTvDetailState } from '@/lib/labDashboardDetail';
import type { LabDashboardDetailSelection } from '@/types/labDashboard';
import { useLabDashboard, useLabDashboardDetail } from '@/viewmodels/useLabDashboard';

export default function LabDashboardTvPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { payload, loading, refreshing, error, refresh } = useLabDashboard();
  const detailState = React.useMemo(() => parseLabDashboardTvDetailState(searchParams), [searchParams]);
  const detailSelection = React.useMemo<LabDashboardDetailSelection | null>(
    () => (detailState.view === 'detail' ? { section: detailState.section, focus: detailState.focus } : null),
    [detailState],
  );
  const {
    payload: detailPayload,
    loading: detailLoading,
    refreshing: detailRefreshing,
    error: detailError,
    refresh: refreshDetail,
  } = useLabDashboardDetail(detailSelection, payload?.meta.asOfDate);

  const openDetail = React.useCallback(
    (selection: LabDashboardDetailSelection) => {
      setSearchParams(buildLabDashboardTvDetailSearch(selection));
    },
    [setSearchParams],
  );

  const closeDetail = React.useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const setDetailTab = React.useCallback(
    (tab: 'list' | 'source') => {
      if (detailState.view !== 'detail') {
        return;
      }

      setSearchParams(
        buildLabDashboardTvDetailSearch({
          section: detailState.section,
          focus: detailState.focus,
          tab,
        }),
      );
    },
    [detailState, setSearchParams],
  );

  if (detailState.view === 'detail') {
    return (
      <LabDashboardDetailScreen
        payload={detailPayload}
        loading={detailLoading}
        refreshing={detailRefreshing}
        error={detailError}
        activeTab={detailState.tab}
        onBack={closeDetail}
        onRefresh={() => void refreshDetail()}
        onTabChange={setDetailTab}
      />
    );
  }

  return (
    <LabDashboardDisplay
      payload={payload}
      loading={loading}
      refreshing={refreshing}
      error={error}
      mode="tv"
      onRetry={() => void refresh()}
      onOpenDetail={openDetail}
    />
  );
}
