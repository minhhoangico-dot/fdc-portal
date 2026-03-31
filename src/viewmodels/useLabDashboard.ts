/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { bridgeRequest } from '@/lib/bridge-client';
import { LabDashboardDetailPayload, LabDashboardDetailSelection, LabDashboardPayload } from '@/types/labDashboard';

const LAB_DASHBOARD_POLL_INTERVAL_MS = 30 * 1000;

export function useLabDashboard() {
  const [payload, setPayload] = useState<LabDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchDashboard = useCallback(async (options: { background?: boolean } = {}) => {
    const useRefreshingState = options.background || hasLoadedRef.current;

    if (useRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const nextPayload = await bridgeRequest<LabDashboardPayload>('/lab-dashboard/current');
      setPayload(nextPayload);
      setError(null);
      hasLoadedRef.current = true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Không thể tải dashboard xét nghiệm.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();

    const timer = window.setInterval(() => {
      void fetchDashboard({ background: true });
    }, LAB_DASHBOARD_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [fetchDashboard]);

  return {
    payload,
    loading,
    refreshing,
    error,
    refresh: fetchDashboard,
  };
}

export function useLabDashboardDetail(selection: LabDashboardDetailSelection | null, asOfDate?: string) {
  const [payload, setPayload] = useState<LabDashboardDetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const lastSelectionKeyRef = useRef<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!selection) {
      setPayload(null);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      hasLoadedRef.current = false;
      lastSelectionKeyRef.current = null;
      return;
    }

    const selectionKey = `${selection.section}:${selection.focus}:${asOfDate || ''}`;
    const isNewSelection = lastSelectionKeyRef.current !== selectionKey;

    if (isNewSelection) {
      setPayload(null);
      setError(null);
      setLoading(true);
      setRefreshing(false);
      hasLoadedRef.current = false;
      lastSelectionKeyRef.current = selectionKey;
    }

    if (!isNewSelection && hasLoadedRef.current) {
      setRefreshing(true);
    } else if (!isNewSelection) {
      setLoading(true);
    }

    try {
      const searchParams = new URLSearchParams({
        section: selection.section,
        focus: selection.focus,
      });
      if (asOfDate) {
        searchParams.set('date', asOfDate);
      }

      const nextPayload = await bridgeRequest<LabDashboardDetailPayload>(`/lab-dashboard/details?${searchParams.toString()}`);
      setPayload(nextPayload);
      setError(null);
      hasLoadedRef.current = true;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Không thể tải chi tiết dashboard xét nghiệm.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [asOfDate, selection]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  return {
    payload,
    loading,
    refreshing,
    error,
    refresh: fetchDetail,
  };
}
