/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addWeeks, endOfWeek, startOfWeek } from 'date-fns';
import { weeklyReportRequest } from '@/lib/weekly-report';
import {
  WeeklyReportData,
  WeeklyReportDetailRow,
  WeeklyReportIndicatorKey,
  WeeklyReportInfectiousCode,
  WeeklyReportServiceCatalogRow,
  WeeklyReportServiceMapping,
  WeeklyReportStatus,
} from '@/types/weeklyReport';

function getWeekDate(date?: Date): Date {
  return startOfWeek(date || new Date(), { weekStartsOn: 1 });
}

export function useWeeklyReportLauncher(initialDate?: Date) {
  const [selectedDate, setSelectedDate] = useState<Date>(getWeekDate(initialDate));
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [status, setStatus] = useState<WeeklyReportStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextReport, nextStatus] = await Promise.all([
        weeklyReportRequest<WeeklyReportData>(`/weekly-report/current?date=${encodeURIComponent(selectedDate.toISOString())}`),
        weeklyReportRequest<WeeklyReportStatus>(`/weekly-report/status?date=${encodeURIComponent(selectedDate.toISOString())}`),
      ]);
      setReport(nextReport);
      setStatus(nextStatus);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Khong the tai du lieu bao cao giao ban.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const generateSnapshot = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await weeklyReportRequest('/weekly-report/generate', {
        method: 'POST',
        body: JSON.stringify({ date: selectedDate.toISOString() }),
      });
      await fetchReport();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Khong the tao snapshot.');
    } finally {
      setIsGenerating(false);
    }
  }, [fetchReport, selectedDate]);

  const moveWeek = useCallback((amount: number) => {
    setSelectedDate((current) => getWeekDate(addWeeks(current, amount)));
  }, []);

  const setDate = useCallback((value: string) => {
    setSelectedDate(getWeekDate(new Date(`${value}T00:00:00`)));
  }, []);

  return {
    selectedDate,
    report,
    status,
    isLoading,
    isGenerating,
    error,
    refresh: fetchReport,
    generateSnapshot,
    moveWeek,
    setDate,
  };
}

export function useWeeklyReportTv(initialDate?: Date) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextReport = await weeklyReportRequest<WeeklyReportData>(
        `/weekly-report/current?date=${encodeURIComponent(selectedDate.toISOString())}`,
      );
      setReport(nextReport);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Khong the tai bao cao giao ban.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void fetchReport();
    const timer = window.setInterval(() => {
      void fetchReport();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [fetchReport]);

  return {
    report,
    loading,
    error,
    selectedDate,
    setSelectedDate,
    moveWeek: (amount: number) => setSelectedDate((current) => addWeeks(current, amount)),
    refresh: fetchReport,
  };
}

export function useWeeklyReportDetails(query: {
  key: string;
  type?: string | null;
  start: string;
  end: string;
}) {
  const [rows, setRows] = useState<WeeklyReportDetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.key || !query.start || !query.end) {
      setRows([]);
      setLoading(false);
      return;
    }

    const search = new URLSearchParams({
      key: query.key,
      start: query.start,
      end: query.end,
    });
    if (query.type) search.set('type', query.type);

    setLoading(true);
    setError(null);

    weeklyReportRequest<WeeklyReportDetailRow[]>(`/weekly-report/details?${search.toString()}`)
      .then((payload) => setRows(payload))
      .catch((nextError) => {
        setRows([]);
        setError(nextError instanceof Error ? nextError.message : 'Khong the tai chi tiet.');
      })
      .finally(() => setLoading(false));
  }, [query.end, query.key, query.start, query.type]);

  return { rows, loading, error };
}

export function useWeeklyReportAdmin() {
  const [infectiousCodes, setInfectiousCodes] = useState<WeeklyReportInfectiousCode[]>([]);
  const [serviceMappings, setServiceMappings] = useState<WeeklyReportServiceMapping[]>([]);
  const [status, setStatus] = useState<WeeklyReportStatus | null>(null);
  const [catalogResults, setCatalogResults] = useState<WeeklyReportServiceCatalogRow[]>([]);
  const [customReport, setCustomReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [codes, mappings, nextStatus] = await Promise.all([
        weeklyReportRequest<WeeklyReportInfectiousCode[]>('/weekly-report/settings/icd-codes'),
        weeklyReportRequest<WeeklyReportServiceMapping[]>('/weekly-report/settings/service-mappings'),
        weeklyReportRequest<WeeklyReportStatus>('/weekly-report/status'),
      ]);
      setInfectiousCodes(codes);
      setServiceMappings(mappings);
      setStatus(nextStatus);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Khong the tai cau hinh bao cao giao ban.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(async (action: () => Promise<void>, successText: string) => {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(successText);
      await refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Thao tac that bai.');
    }
  }, [refresh]);

  const generateSnapshot = useCallback(async (date?: string) => {
    await runMutation(
      async () => {
        await weeklyReportRequest('/weekly-report/generate', {
          method: 'POST',
          body: JSON.stringify(date ? { date } : {}),
        });
      },
      'Da tao snapshot bao cao giao ban.',
    );
  }, [runMutation]);

  const saveInfectiousCode = useCallback(async (payload: Partial<WeeklyReportInfectiousCode>) => {
    await runMutation(
      async () => {
        if (payload.id) {
          await weeklyReportRequest(`/weekly-report/settings/icd-codes/${payload.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          return;
        }

        await weeklyReportRequest('/weekly-report/settings/icd-codes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },
      'Da luu cau hinh ICD.',
    );
  }, [runMutation]);

  const deleteInfectiousCode = useCallback(async (id: string) => {
    await runMutation(
      async () => {
        await weeklyReportRequest(`/weekly-report/settings/icd-codes/${id}`, { method: 'DELETE' });
      },
      'Da xoa cau hinh ICD.',
    );
  }, [runMutation]);

  const saveServiceMapping = useCallback(async (payload: Partial<WeeklyReportServiceMapping>) => {
    await runMutation(
      async () => {
        if (payload.id) {
          await weeklyReportRequest(`/weekly-report/settings/service-mappings/${payload.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          return;
        }

        await weeklyReportRequest('/weekly-report/settings/service-mappings', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      },
      'Da luu service mapping.',
    );
  }, [runMutation]);

  const deleteServiceMapping = useCallback(async (id: string) => {
    await runMutation(
      async () => {
        await weeklyReportRequest(`/weekly-report/settings/service-mappings/${id}`, { method: 'DELETE' });
      },
      'Da xoa service mapping.',
    );
  }, [runMutation]);

  const searchCatalog = useCallback(async (term: string) => {
    if (!term.trim()) {
      setCatalogResults([]);
      return;
    }

    try {
      const results = await weeklyReportRequest<WeeklyReportServiceCatalogRow[]>(
        `/weekly-report/settings/service-catalog?q=${encodeURIComponent(term.trim())}`,
      );
      setCatalogResults(results);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Khong the tim service catalog.');
    }
  }, []);

  const generateCustomReport = useCallback(async (payload: {
    indicators: WeeklyReportIndicatorKey[];
    startDate: string;
    endDate: string;
  }) => {
    try {
      setError(null);
      const nextReport = await weeklyReportRequest<Record<string, unknown>>('/weekly-report/custom', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCustomReport(nextReport);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Khong the tao bao cao tuy chon.');
    }
  }, []);

  const latestSnapshotGeneratedAt = useMemo(
    () => status?.snapshot?.generated_at || null,
    [status?.snapshot?.generated_at],
  );

  return {
    infectiousCodes,
    serviceMappings,
    status,
    catalogResults,
    customReport,
    loading,
    message,
    error,
    latestSnapshotGeneratedAt,
    refresh,
    generateSnapshot,
    saveInfectiousCode,
    deleteInfectiousCode,
    saveServiceMapping,
    deleteServiceMapping,
    searchCatalog,
    generateCustomReport,
    dismissMessage: () => setMessage(null),
  };
}

