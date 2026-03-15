/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useReports, ReportPeriod } from '@/viewmodels/useReports';
import { REQUEST_TYPES, REQUEST_STATUS, COST_CENTERS } from '@/lib/constants';
import { RequestType, RequestStatus } from '@/types/request';
import { formatVND, cn } from '@/lib/utils';
import { Download, RefreshCw, FileText, Clock, CheckCircle, XCircle, TrendingUp, Building2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'this_quarter', label: 'Quý này' },
  { value: 'this_year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chọn' },
];

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const {
    filters,
    setFilters,
    summary,
    requests,
    isLoading,
    uniqueDepartments,
    exportCsv,
    refresh,
  } = useReports();

  const typeChartData = Object.entries(summary.byType).map(([type, data]) => ({
    name: REQUEST_TYPES[type as keyof typeof REQUEST_TYPES] || type,
    count: data.count,
    amount: data.amount,
  }));

  const costCenterChartData = Object.entries(summary.byCostCenter)
    .filter(([key]) => key !== 'none')
    .map(([key, data]) => ({
      name: COST_CENTERS[key as keyof typeof COST_CENTERS] || key,
      value: data.amount,
      count: data.count,
    }));

  const deptChartData = Object.entries(summary.byDepartment).map(([dept, data]) => ({
    name: dept,
    count: data.count,
    amount: data.amount,
  }));

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Báo cáo & Thống kê</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={exportCsv}
            disabled={requests.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Xuất CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.period}
            onChange={(e) => setFilters({ ...filters, period: e.target.value as ReportPeriod })}
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500 bg-white"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {filters.period === 'custom' && (
            <>
              <input
                type="date"
                value={filters.customStart}
                onChange={(e) => setFilters({ ...filters, customStart: e.target.value })}
                className="text-sm rounded-lg border-gray-200 py-2 px-3 focus:ring-indigo-500"
              />
              <input
                type="date"
                value={filters.customEnd}
                onChange={(e) => setFilters({ ...filters, customEnd: e.target.value })}
                className="text-sm rounded-lg border-gray-200 py-2 px-3 focus:ring-indigo-500"
              />
            </>
          )}

          <select
            value={filters.requestType}
            onChange={(e) => setFilters({ ...filters, requestType: e.target.value as RequestType | 'all' })}
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500 bg-white"
          >
            <option value="all">Tất cả loại</option>
            {Object.entries(REQUEST_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as RequestStatus | 'all' })}
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500 bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(REQUEST_STATUS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filters.costCenter}
            onChange={(e) => setFilters({ ...filters, costCenter: e.target.value })}
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500 bg-white"
          >
            <option value="all">Tất cả TTCP</option>
            {Object.entries(COST_CENTERS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={filters.department}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="text-sm rounded-lg border-gray-200 py-2 pl-3 pr-8 focus:ring-indigo-500 bg-white"
          >
            <option value="all">Tất cả khoa/phòng</option>
            {uniqueDepartments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 w-20 bg-gray-100 rounded mb-2" />
              <div className="h-8 w-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium">Tổng đề nghị</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalRequests}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Tổng giá trị</span>
            </div>
            <div className="text-2xl font-bold text-indigo-600">{formatVND(summary.totalAmount)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Đã duyệt</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{summary.approvedCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Từ chối</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{summary.rejectedCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Tỷ lệ duyệt</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.approvalRate}%</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">TG duyệt TB</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.avgApprovalHours}h</div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Theo loại đề nghị</h3>
          {typeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v: number, name: string) => [
                    name === 'count' ? v : formatVND(v),
                    name === 'count' ? 'Số lượng' : 'Giá trị',
                  ]}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu</div>
          )}
        </div>

        {/* Cost Center Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            Theo trung tâm chi phí
          </h3>
          {costCenterChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={costCenterChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {costCenterChartData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v: number) => [formatVND(v), 'Giá trị']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">
              Chưa có dữ liệu trung tâm chi phí
            </div>
          )}
        </div>
      </div>

      {/* Department & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Department */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Theo khoa/phòng</h3>
          {deptChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptChartData} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v: number) => [v, 'Số lượng']}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu</div>
          )}
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Xu hướng theo tháng</h3>
          {summary.byMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={summary.byMonth} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={36} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="approved" stackId="a" fill="#10b981" name="Đã duyệt" radius={[0, 0, 0, 0]} />
                <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Từ chối" radius={[0, 0, 0, 0]} />
                <Bar dataKey="count" fill="#6366f1" name="Tổng" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Chưa có dữ liệu</div>
          )}
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Chi tiết ({requests.length} đề nghị)</h3>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Số</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Loại</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tiêu đề</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Số tiền</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">TTCP</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Khoa/Phòng</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Người tạo</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.request_number}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{REQUEST_TYPES[r.request_type as keyof typeof REQUEST_TYPES] || r.request_type}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate font-medium text-gray-900">{r.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
                      r.status === 'approved' || r.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'rejected' || r.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      r.status === 'escalated' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700',
                    )}>
                      {REQUEST_STATUS[r.status as keyof typeof REQUEST_STATUS] || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{r.total_amount ? formatVND(r.total_amount) : '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {r.cost_center ? (COST_CENTERS[r.cost_center as keyof typeof COST_CENTERS] || r.cost_center) : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.department_name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">{r.requester?.full_name || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('vi-VN') : '—'}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    Không có dữ liệu cho bộ lọc đã chọn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
