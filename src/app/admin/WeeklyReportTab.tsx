/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BarChart3, Database, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { buildWeeklyReportDetailsUrl } from '@/lib/weekly-report';
import { formatTimeAgo } from '@/lib/utils';
import {
  WeeklyReportIndicatorKey,
  WeeklyReportInfectiousCode,
  WeeklyReportServiceMapping,
} from '@/types/weeklyReport';
import { useWeeklyReportAdmin } from '@/viewmodels/useWeeklyReport';

const INDICATORS: Array<{ key: WeeklyReportIndicatorKey; label: string }> = [
  { key: 'examination', label: 'Khám bệnh' },
  { key: 'laboratory', label: 'Xét nghiệm' },
  { key: 'imaging', label: 'Chẩn đoán hình ảnh' },
  { key: 'specialist', label: 'Thủ thuật / Chuyên khoa' },
  { key: 'infectious', label: 'Bệnh truyền nhiễm' },
  { key: 'transfer', label: 'Chuyển viện' },
];

const EMPTY_CODE_FORM: Partial<WeeklyReportInfectiousCode> = {
  icd_code: '',
  icd_pattern: '',
  disease_name_vi: '',
  disease_group: '',
  color_code: '#3b82f6',
  display_order: 99,
  is_active: true,
};

const EMPTY_MAPPING_FORM: Partial<WeeklyReportServiceMapping> = {
  category_key: '',
  category_name_vi: '',
  display_group: 'kham_benh',
  match_type: 'contains',
  match_value: '',
  display_order: 99,
  is_active: true,
};

export function WeeklyReportTab() {
  const {
    infectiousCodes,
    serviceMappings,
    status,
    catalogResults,
    customReport,
    loading,
    message,
    error,
    refresh,
    generateSnapshot,
    saveInfectiousCode,
    deleteInfectiousCode,
    saveServiceMapping,
    deleteServiceMapping,
    searchCatalog,
    generateCustomReport,
    dismissMessage,
  } = useWeeklyReportAdmin();

  const [codeForm, setCodeForm] = React.useState<Partial<WeeklyReportInfectiousCode>>(EMPTY_CODE_FORM);
  const [mappingForm, setMappingForm] = React.useState<Partial<WeeklyReportServiceMapping>>(EMPTY_MAPPING_FORM);
  const [catalogTerm, setCatalogTerm] = React.useState('');
  const [customIndicators, setCustomIndicators] = React.useState<WeeklyReportIndicatorKey[]>(['examination']);
  const [customStartDate, setCustomStartDate] = React.useState(format(new Date(), 'yyyy-MM-01'));
  const [customEndDate, setCustomEndDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));

  const resetCodeForm = () => setCodeForm(EMPTY_CODE_FORM);
  const resetMappingForm = () => setMappingForm(EMPTY_MAPPING_FORM);

  const toggleIndicator = (indicator: WeeklyReportIndicatorKey) => {
    setCustomIndicators((current) =>
      current.includes(indicator)
        ? current.filter((item) => item !== indicator)
        : [...current, indicator],
    );
  };

  return (
    <div className="space-y-6 p-6">
      {(message || error) && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
            error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          <span>{error || message}</span>
          <button type="button" onClick={dismissMessage} className="font-medium hover:underline">
            Đóng
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Snapshot báo cáo giao ban</h2>
              <p className="text-sm text-gray-500">Theo dõi snapshot tuần hiện tại, lịch sử generate gần nhất và mở route TV.</p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Tuần đang xem</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                Tuần {status?.week.week_number || '--'} / {status?.week.year || '--'}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {status?.week.week_start ? format(new Date(status.week.week_start), 'dd/MM/yyyy') : '--'} -{' '}
                {status?.week.week_end ? format(new Date(status.week.week_end), 'dd/MM/yyyy') : '--'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Snapshot</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {status?.snapshot?.generated_at ? formatTimeAgo(status.snapshot.generated_at) : 'Chưa có'}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {status?.snapshot?.generated_at ? format(new Date(status.snapshot.generated_at), 'HH:mm dd/MM/yyyy') : 'Tạo snapshot để cache số liệu.'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Tác vụ gần nhất</div>
              <div className="mt-2 text-lg font-semibold text-slate-900">
                {status?.latest_log?.status || 'N/A'}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {status?.latest_log?.started_at ? formatTimeAgo(status.latest_log.started_at) : 'Chưa có log.'}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void generateSnapshot()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Database className="h-4 w-4" />
              Tạo snapshot ngay
            </button>
            <Link
              to="/weekly-report"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <BarChart3 className="h-4 w-4" />
              Mở module vận hành
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Tra cứu service catalog</h2>
          <p className="mt-1 text-sm text-gray-500">Tìm dịch vụ HIS để điền chính xác match value cho service mapping.</p>

          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={catalogTerm}
              onChange={(event) => setCatalogTerm(event.target.value)}
              placeholder="Nhập tên dịch vụ..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={() => void searchCatalog(catalogTerm)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Search className="h-4 w-4" />
              Tìm
            </button>
          </div>

          <div className="mt-4 max-h-[260px] overflow-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Service</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Nhóm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalogResults.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-slate-500">
                      Chưa có kết quả.
                    </td>
                  </tr>
                ) : (
                  catalogResults.map((row) => (
                    <tr key={`${row.servicename}-${row.dm_servicegroupid}-${row.dm_servicesubgroupid}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(row.servicename)}
                          className="text-left font-medium text-slate-900 hover:text-indigo-600"
                          title="Copy tên dịch vụ"
                        >
                          {row.servicename}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {row.dm_servicegroupid ?? '-'} / {row.dm_servicesubgroupid ?? '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">ICD bệnh truyền nhiễm</h2>
              <p className="text-sm text-gray-500">CRUD cấu hình ICD để thống kê nhóm bệnh truyền nhiễm trên dashboard TV.</p>
            </div>
            <button
              type="button"
              onClick={() => void saveInfectiousCode(codeForm)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              Lưu ICD
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Mã ICD"
              value={codeForm.icd_code || ''}
              onChange={(event) => setCodeForm((current) => ({ ...current, icd_code: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Pattern (mặc định J09%)"
              value={codeForm.icd_pattern || ''}
              onChange={(event) => setCodeForm((current) => ({ ...current, icd_pattern: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Tên bệnh"
              value={codeForm.disease_name_vi || ''}
              onChange={(event) => setCodeForm((current) => ({ ...current, disease_name_vi: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              type="text"
              placeholder="Nhóm"
              value={codeForm.disease_group || ''}
              onChange={(event) => setCodeForm((current) => ({ ...current, disease_group: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Display order"
              value={codeForm.display_order ?? 99}
              onChange={(event) => setCodeForm((current) => ({ ...current, display_order: Number(event.target.value) }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={codeForm.color_code || '#3b82f6'}
                onChange={(event) => setCodeForm((current) => ({ ...current, color_code: event.target.value }))}
                className="h-10 w-12 rounded border border-gray-200 p-1"
              />
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={codeForm.is_active ?? true}
                  onChange={(event) => setCodeForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                Đang hoạt động
              </label>
            </div>
            <button
              type="button"
              onClick={resetCodeForm}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Tạo mới
            </button>
          </div>

          <div className="mt-4 max-h-[340px] overflow-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">ICD</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Tên bệnh</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Nhóm</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {infectiousCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold text-slate-900">{code.icd_code}</td>
                    <td className="px-3 py-2">{code.disease_name_vi}</td>
                    <td className="px-3 py-2 text-slate-500">{code.disease_group}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCodeForm(code)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => window.confirm('Xóa cấu hình ICD này?') && void deleteInfectiousCode(code.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Service mappings</h2>
              <p className="text-sm text-gray-500">Cấu hình category key, display group và match rule để map dữ liệu HIS.</p>
            </div>
            <button
              type="button"
              onClick={() => void saveServiceMapping(mappingForm)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Save className="h-4 w-4" />
              Lưu mapping
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Category key"
              value={mappingForm.category_key || ''}
              onChange={(event) => setMappingForm((current) => ({ ...current, category_key: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Tên hiển thị"
              value={mappingForm.category_name_vi || ''}
              onChange={(event) => setMappingForm((current) => ({ ...current, category_name_vi: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <select
              value={mappingForm.display_group || 'kham_benh'}
              onChange={(event) => setMappingForm((current) => ({ ...current, display_group: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="kham_benh">Khám bệnh</option>
              <option value="xet_nghiem">Xét nghiệm</option>
              <option value="cdha">CĐHA</option>
              <option value="chuyen_khoa">Chuyên khoa</option>
            </select>
            <select
              value={mappingForm.match_type || 'contains'}
              onChange={(event) => setMappingForm((current) => ({ ...current, match_type: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="contains">contains</option>
              <option value="starts_with">starts_with</option>
              <option value="regex">regex</option>
              <option value="exact">exact</option>
            </select>
            <input
              type="text"
              placeholder="Match value"
              value={mappingForm.match_value || ''}
              onChange={(event) => setMappingForm((current) => ({ ...current, match_value: event.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              type="number"
              placeholder="Display order"
              value={mappingForm.display_order ?? 99}
              onChange={(event) => setMappingForm((current) => ({ ...current, display_order: Number(event.target.value) }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={mappingForm.is_active ?? true}
                onChange={(event) => setMappingForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Đang hoạt động
            </label>
            <button
              type="button"
              onClick={resetMappingForm}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 md:col-span-2"
            >
              Tạo mới
            </button>
          </div>

          <div className="mt-4 max-h-[340px] overflow-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Key</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Nhóm</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Match</th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviceMappings.map((mapping) => (
                  <tr key={mapping.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-900">{mapping.category_key}</div>
                      <div className="text-xs text-slate-500">{mapping.category_name_vi}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{mapping.display_group}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {mapping.match_type}: {mapping.match_value}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMappingForm(mapping)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => window.confirm('Xóa mapping này?') && void deleteServiceMapping(mapping.id)}
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Custom report</h2>
          <p className="text-sm text-gray-500">Tạo báo cáo tùy chọn theo khoảng thời gian và drilldown vào route chi tiết.</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_220px_220px_180px]">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="mb-3 text-sm font-medium text-slate-700">Chỉ số</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {INDICATORS.map((indicator) => (
                <label key={indicator.key} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={customIndicators.includes(indicator.key)}
                    onChange={() => toggleIndicator(indicator.key)}
                  />
                  {indicator.label}
                </label>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Từ ngày
            <input
              type="date"
              value={customStartDate}
              onChange={(event) => setCustomStartDate(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
            Đến ngày
            <input
              type="date"
              value={customEndDate}
              onChange={(event) => setCustomEndDate(event.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void generateCustomReport({ indicators: customIndicators, startDate: customStartDate, endDate: customEndDate })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <BarChart3 className="h-4 w-4" />
              Tạo báo cáo
            </button>
          </div>
        </div>

        {customReport && (
          <div className="mt-6 space-y-4">
            {Object.entries((customReport.data as Record<string, unknown>) || {}).map(([groupKey, items]) => (
              <div key={groupKey} className="overflow-hidden rounded-xl border border-gray-100">
                <div className="border-b border-gray-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  {INDICATORS.find((indicator) => indicator.key === groupKey)?.label || groupKey}
                </div>

                <table className="min-w-full text-sm">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Chỉ số</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Hiện tại</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Trước</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(items) &&
                      items.map((item: any, index) => {
                        const currentValue =
                          groupKey === 'infectious' ? item.periods?.current ?? 0 : item.current ?? 0;
                        const previousValue =
                          groupKey === 'infectious' ? item.periods?.previous ?? 0 : item.previous ?? 0;
                        const rowKey = groupKey === 'infectious' ? item.icd_code : item.key;
                        const rowTitle = groupKey === 'infectious' ? item.disease_name : item.name;
                        const rowType = groupKey === 'infectious' ? 'infectious' : groupKey;

                        return (
                          <tr key={`${rowKey}-${index}`} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-900">{rowTitle}</td>
                            <td className="px-4 py-3 text-right text-slate-900">{currentValue}</td>
                            <td className="px-4 py-3 text-right text-slate-500">{previousValue}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  window.location.assign(
                                    buildWeeklyReportDetailsUrl({
                                      key: String(rowKey),
                                      type: rowType,
                                      title: String(rowTitle),
                                      start: new Date(`${customStartDate}T00:00:00`).toISOString(),
                                      end: new Date(`${customEndDate}T23:59:59`).toISOString(),
                                      from: 'admin',
                                    }),
                                  )
                                }
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Drilldown
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

