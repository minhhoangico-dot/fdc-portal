/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Request, RequestType, RequestStatus } from '@/types/request';
import { REQUEST_TYPES, REQUEST_STATUS, COST_CENTERS } from '@/lib/constants';
import { format } from 'date-fns';

export type ReportPeriod = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';

interface ReportFilters {
  period: ReportPeriod;
  customStart: string;
  customEnd: string;
  requestType: RequestType | 'all';
  status: RequestStatus | 'all';
  costCenter: string;
  department: string;
}

export interface ReportSummary {
  totalRequests: number;
  totalAmount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  approvalRate: number;
  avgApprovalHours: number;
  byType: Record<string, { count: number; amount: number }>;
  byCostCenter: Record<string, { count: number; amount: number }>;
  byDepartment: Record<string, { count: number; amount: number }>;
  byMonth: Array<{ month: string; count: number; amount: number; approved: number; rejected: number }>;
}

const getDateRange = (period: ReportPeriod, customStart: string, customEnd: string) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case 'this_month':
      return {
        start: new Date(year, month, 1).toISOString(),
        end: new Date(year, month + 1, 0, 23, 59, 59).toISOString(),
      };
    case 'last_month':
      return {
        start: new Date(year, month - 1, 1).toISOString(),
        end: new Date(year, month, 0, 23, 59, 59).toISOString(),
      };
    case 'this_quarter': {
      const qStart = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, qStart, 1).toISOString(),
        end: new Date(year, qStart + 3, 0, 23, 59, 59).toISOString(),
      };
    }
    case 'this_year':
      return {
        start: new Date(year, 0, 1).toISOString(),
        end: new Date(year, 11, 31, 23, 59, 59).toISOString(),
      };
    case 'custom':
      return {
        start: customStart ? new Date(`${customStart}T00:00:00`).toISOString() : new Date(year, 0, 1).toISOString(),
        end: customEnd ? new Date(`${customEnd}T23:59:59`).toISOString() : now.toISOString(),
      };
    default:
      return {
        start: new Date(year, month, 1).toISOString(),
        end: now.toISOString(),
      };
  }
};

export function useReports() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoaded = useRef(false);

  const [filters, setFilters] = useState<ReportFilters>({
    period: 'this_month',
    customStart: '',
    customEnd: '',
    requestType: 'all',
    status: 'all',
    costCenter: 'all',
    department: 'all',
  });

  const fetchReportData = useCallback(async () => {
    if (!user) return;
    if (!hasLoaded.current) setIsLoading(true);

    const { start, end } = getDateRange(filters.period, filters.customStart, filters.customEnd);

    let query = supabase
      .from('fdc_approval_requests')
      .select(`
        id, request_number, request_type, title, status, priority,
        total_amount, cost_center, department_name,
        created_at, updated_at,
        requester:fdc_user_mapping!requester_id(full_name, department_name)
      `)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    if (filters.requestType !== 'all') {
      query = query.eq('request_type', filters.requestType);
    }
    if (filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.costCenter !== 'all') {
      query = query.eq('cost_center', filters.costCenter);
    }
    if (filters.department !== 'all') {
      query = query.eq('department_name', filters.department);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRequests(data);
    }

    setIsLoading(false);
    hasLoaded.current = true;
  }, [user, filters]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const summary: ReportSummary = useMemo(() => {
    const totalRequests = requests.length;
    const totalAmount = requests.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const approvedCount = requests.filter(r => r.status === 'approved' || r.status === 'completed').length;
    const rejectedCount = requests.filter(r => r.status === 'rejected' || r.status === 'cancelled').length;
    const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'escalated').length;
    const approvalRate = totalRequests > 0 ? Math.round((approvedCount / totalRequests) * 100) : 0;

    const approved = requests.filter(r =>
      (r.status === 'approved' || r.status === 'completed') && r.created_at && r.updated_at
    );
    const avgApprovalHours = approved.length > 0
      ? Number((approved.reduce((sum, r) => {
          const ms = new Date(r.updated_at).getTime() - new Date(r.created_at).getTime();
          return sum + ms / (1000 * 60 * 60);
        }, 0) / approved.length).toFixed(1))
      : 0;

    const byType: Record<string, { count: number; amount: number }> = {};
    const byCostCenter: Record<string, { count: number; amount: number }> = {};
    const byDepartment: Record<string, { count: number; amount: number }> = {};
    const monthMap: Record<string, { count: number; amount: number; approved: number; rejected: number }> = {};

    for (const r of requests) {
      // By type
      const type = r.request_type || 'other';
      if (!byType[type]) byType[type] = { count: 0, amount: 0 };
      byType[type].count++;
      byType[type].amount += r.total_amount || 0;

      // By cost center
      const cc = r.cost_center || 'none';
      if (!byCostCenter[cc]) byCostCenter[cc] = { count: 0, amount: 0 };
      byCostCenter[cc].count++;
      byCostCenter[cc].amount += r.total_amount || 0;

      // By department
      const dept = r.department_name || 'Chung';
      if (!byDepartment[dept]) byDepartment[dept] = { count: 0, amount: 0 };
      byDepartment[dept].count++;
      byDepartment[dept].amount += r.total_amount || 0;

      // By month
      const monthKey = r.created_at ? format(new Date(r.created_at), 'yyyy-MM') : 'unknown';
      if (!monthMap[monthKey]) monthMap[monthKey] = { count: 0, amount: 0, approved: 0, rejected: 0 };
      monthMap[monthKey].count++;
      monthMap[monthKey].amount += r.total_amount || 0;
      if (r.status === 'approved' || r.status === 'completed') monthMap[monthKey].approved++;
      if (r.status === 'rejected' || r.status === 'cancelled') monthMap[monthKey].rejected++;
    }

    const byMonth = Object.entries(monthMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalRequests,
      totalAmount,
      approvedCount,
      rejectedCount,
      pendingCount,
      approvalRate,
      avgApprovalHours,
      byType,
      byCostCenter,
      byDepartment,
      byMonth,
    };
  }, [requests]);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set<string>();
    requests.forEach(r => {
      if (r.department_name) depts.add(r.department_name);
    });
    return Array.from(depts).sort();
  }, [requests]);

  const exportCsv = useCallback(() => {
    const header = [
      'Số đề nghị', 'Loại', 'Tiêu đề', 'Trạng thái', 'Mức ưu tiên',
      'Số tiền', 'Trung tâm chi phí', 'Khoa/Phòng', 'Người tạo', 'Ngày tạo', 'Ngày cập nhật',
    ];

    const rows = requests.map(r => [
      r.request_number,
      REQUEST_TYPES[r.request_type as keyof typeof REQUEST_TYPES] || r.request_type,
      r.title,
      REQUEST_STATUS[r.status as keyof typeof REQUEST_STATUS] || r.status,
      r.priority,
      r.total_amount || '',
      r.cost_center ? (COST_CENTERS[r.cost_center as keyof typeof COST_CENTERS] || r.cost_center) : '',
      r.department_name || '',
      r.requester?.full_name || '',
      r.created_at ? format(new Date(r.created_at), 'dd/MM/yyyy HH:mm') : '',
      r.updated_at ? format(new Date(r.updated_at), 'dd/MM/yyyy HH:mm') : '',
    ]);

    const csvContent = [header, ...rows]
      .map(cols =>
        cols.map(c => {
          const value = c ?? '';
          const str = String(value);
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(','),
      )
      .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-de-nghi_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [requests]);

  return {
    filters,
    setFilters,
    summary,
    requests,
    isLoading,
    uniqueDepartments,
    exportCsv,
    refresh: fetchReportData,
  };
}
