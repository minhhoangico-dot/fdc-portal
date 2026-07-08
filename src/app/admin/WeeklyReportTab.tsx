/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BarChart3, Save, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { buildWeeklyReportDetailsUrl } from '@/lib/weekly-report';
import {
  WeeklyReportIndicatorKey,
  WeeklyReportInfectiousCode,
  WeeklyReportServiceMapping,
} from '@/types/weeklyReport';
import { useWeeklyReportAdmin } from '@/viewmodels/useWeeklyReport';
import { WidgetCard } from '@/ui/WidgetCard';
import { DataTable, type DataTableColumn } from '@/ui/DataTable';
import { StatusBadge } from '@/ui/StatusBadge';

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

// Tokenized form-control class strings (replace the legacy indigo/gray literals).
const INPUT_CLASS =
  'w-full rounded-field border border-line bg-card px-3 py-2 text-[14px] text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const PRIMARY_BTN =
  'inline-flex items-center gap-2 rounded-field bg-brand-600 px-3 py-2 text-[14px] font-medium text-white hover:bg-brand-700';
const SECONDARY_BTN =
  'inline-flex items-center gap-2 rounded-field border border-line px-3 py-2 text-[14px] font-medium text-ink-600 hover:bg-paper';
const ROW_EDIT_BTN =
  'rounded-field border border-line px-2 py-1 text-[12px] font-medium text-ink-600 hover:bg-paper';
const ROW_DELETE_BTN =
  'rounded-field border border-danger-600/30 px-2 py-1 text-[12px] font-medium text-danger-600 hover:bg-danger-600/10';

type CustomReportRow = { item: any; index: number };

export function WeeklyReportTab() {
  const {
    infectiousCodes,
    serviceMappings,
    catalogResults,
    customReport,
    message,
    error,
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

  const catalogColumns: DataTableColumn<(typeof catalogResults)[number]>[] = [
    {
      key: 'service',
      header: 'Service',
      cell: (row) => (
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(row.servicename)}
          className="text-left font-medium text-ink-900 hover:text-brand-600"
          title="Copy tên dịch vụ"
        >
          {row.servicename}
        </button>
      ),
    },
    {
      key: 'group',
      header: 'Nhóm',
      cell: (row) => (
        <span className="text-ink-600">
          {row.dm_servicegroupid ?? '-'} / {row.dm_servicesubgroupid ?? '-'}
        </span>
      ),
    },
  ];

  const codeColumns: DataTableColumn<WeeklyReportInfectiousCode>[] = [
    { key: 'icd', header: 'ICD', cell: (code) => <span className="font-semibold text-ink-900">{code.icd_code}</span> },
    { key: 'name', header: 'Tên bệnh', cell: (code) => code.disease_name_vi },
    { key: 'group', header: 'Nhóm', cell: (code) => <span className="text-ink-600">{code.disease_group}</span> },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (code) =>
        code.is_active ? (
          <StatusBadge status="ok" label="Đang hoạt động" />
        ) : (
          <StatusBadge status="neutral" label="Tạm dừng" />
        ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      cell: (code) => (
        <div className="inline-flex items-center gap-2">
          <button type="button" onClick={() => setCodeForm(code)} className={ROW_EDIT_BTN}>
            Sửa
          </button>
          <button
            type="button"
            onClick={() => window.confirm('Xóa cấu hình ICD này?') && void deleteInfectiousCode(code.id)}
            className={ROW_DELETE_BTN}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const mappingColumns: DataTableColumn<WeeklyReportServiceMapping>[] = [
    {
      key: 'key',
      header: 'Key',
      cell: (mapping) => (
        <div>
          <div className="font-semibold text-ink-900">{mapping.category_key}</div>
          <div className="text-[12px] text-ink-600">{mapping.category_name_vi}</div>
        </div>
      ),
    },
    { key: 'group', header: 'Nhóm', cell: (mapping) => <span className="text-ink-600">{mapping.display_group}</span> },
    {
      key: 'match',
      header: 'Match',
      cell: (mapping) => (
        <span className="text-ink-600">
          {mapping.match_type}: {mapping.match_value}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (mapping) =>
        mapping.is_active ? (
          <StatusBadge status="ok" label="Đang hoạt động" />
        ) : (
          <StatusBadge status="neutral" label="Tạm dừng" />
        ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      cell: (mapping) => (
        <div className="inline-flex items-center gap-2">
          <button type="button" onClick={() => setMappingForm(mapping)} className={ROW_EDIT_BTN}>
            Sửa
          </button>
          <button
            type="button"
            onClick={() => window.confirm('Xóa mapping này?') && void deleteServiceMapping(mapping.id)}
            className={ROW_DELETE_BTN}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {(message || error) && (
        <div
          className={`flex items-center justify-between rounded-field border px-4 py-3 text-[14px] ${
            error
              ? 'border-danger-600/30 bg-danger-600/10 text-danger-600'
              : 'border-brand-100 bg-brand-50 text-brand-700'
          }`}
        >
          <span>{error || message}</span>
          <button type="button" onClick={dismissMessage} className="font-medium hover:underline">
            Đóng
          </button>
        </div>
      )}

      <WidgetCard title="Tra cứu service catalog">
        <p className="text-[14px] text-ink-600">Tìm dịch vụ HIS để điền chính xác match value cho service mapping.</p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={catalogTerm}
            onChange={(event) => setCatalogTerm(event.target.value)}
            placeholder="Nhập tên dịch vụ..."
            className={`flex-1 ${INPUT_CLASS}`}
          />
          <button type="button" onClick={() => void searchCatalog(catalogTerm)} className={SECONDARY_BTN}>
            <Search className="h-4 w-4" />
            Tìm
          </button>
        </div>

        <div className="mt-4">
          <DataTable
            columns={catalogColumns}
            rows={catalogResults}
            rowKey={(row) => `${row.servicename}-${row.dm_servicegroupid}-${row.dm_servicesubgroupid}`}
            density="compact"
            emptyLabel="Chưa có kết quả."
            className="max-h-[260px]"
          />
        </div>
      </WidgetCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <WidgetCard
          title="ICD bệnh truyền nhiễm"
          actions={
            <button type="button" onClick={() => void saveInfectiousCode(codeForm)} className={PRIMARY_BTN}>
              <Save className="h-4 w-4" />
              Lưu ICD
            </button>
          }
        >
          <p className="text-[14px] text-ink-600">CRUD cấu hình ICD để thống kê nhóm bệnh truyền nhiễm trên dashboard TV.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Mã ICD"
              value={codeForm.icd_code || ''}
              onChange={(event) => setCodeForm((current) => ({ ...current, icd_code: event.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              type="text"
              placeholder="Pattern (mặc định J09%)"
              value={codeForm.icd_pattern || ''}
              onChange={(event) => setCodeForm((current) => ({ ...current, icd_pattern: event.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              type="text"
              placeholder="Tên bệnh"
              value={codeForm.disease_name_vi || ''}
              onChange={(event) => setCodeForm((current) => ({ ...current, disease_name_vi: event.target.value }))}
              className={`${INPUT_CLASS} md:col-span-2`}
            />
            <input
              type="text"
              placeholder="Nhóm"
              value={codeForm.disease_group || ''}
              onChange={(event) => setCodeForm((current) => ({ ...current, disease_group: event.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              type="number"
              placeholder="Display order"
              value={codeForm.display_order ?? 99}
              onChange={(event) => setCodeForm((current) => ({ ...current, display_order: Number(event.target.value) }))}
              className={INPUT_CLASS}
            />
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={codeForm.color_code || '#3b82f6'}
                onChange={(event) => setCodeForm((current) => ({ ...current, color_code: event.target.value }))}
                className="h-10 w-12 rounded-field border border-line p-1"
              />
              <label className="inline-flex items-center gap-2 text-[14px] text-ink-600">
                <input
                  type="checkbox"
                  checked={codeForm.is_active ?? true}
                  onChange={(event) => setCodeForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                Đang hoạt động
              </label>
            </div>
            <button type="button" onClick={resetCodeForm} className={SECONDARY_BTN}>
              Tạo mới
            </button>
          </div>

          <div className="mt-4">
            <DataTable
              columns={codeColumns}
              rows={infectiousCodes}
              rowKey={(code) => String(code.id)}
              density="compact"
              className="max-h-[340px]"
            />
          </div>
        </WidgetCard>

        <WidgetCard
          title="Service mappings"
          actions={
            <button type="button" onClick={() => void saveServiceMapping(mappingForm)} className={PRIMARY_BTN}>
              <Save className="h-4 w-4" />
              Lưu mapping
            </button>
          }
        >
          <p className="text-[14px] text-ink-600">Cấu hình category key, display group và match rule để map dữ liệu HIS.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Category key"
              value={mappingForm.category_key || ''}
              onChange={(event) => setMappingForm((current) => ({ ...current, category_key: event.target.value }))}
              className={INPUT_CLASS}
            />
            <input
              type="text"
              placeholder="Tên hiển thị"
              value={mappingForm.category_name_vi || ''}
              onChange={(event) => setMappingForm((current) => ({ ...current, category_name_vi: event.target.value }))}
              className={INPUT_CLASS}
            />
            <select
              value={mappingForm.display_group || 'kham_benh'}
              onChange={(event) => setMappingForm((current) => ({ ...current, display_group: event.target.value }))}
              className={INPUT_CLASS}
            >
              <option value="kham_benh">Khám bệnh</option>
              <option value="xet_nghiem">Xét nghiệm</option>
              <option value="cdha">CĐHA</option>
              <option value="chuyen_khoa">Chuyên khoa</option>
            </select>
            <select
              value={mappingForm.match_type || 'contains'}
              onChange={(event) => setMappingForm((current) => ({ ...current, match_type: event.target.value }))}
              className={INPUT_CLASS}
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
              className={`${INPUT_CLASS} md:col-span-2`}
            />
            <input
              type="number"
              placeholder="Display order"
              value={mappingForm.display_order ?? 99}
              onChange={(event) => setMappingForm((current) => ({ ...current, display_order: Number(event.target.value) }))}
              className={INPUT_CLASS}
            />
            <label className="inline-flex items-center gap-2 rounded-field border border-line px-3 py-2 text-[14px] text-ink-600">
              <input
                type="checkbox"
                checked={mappingForm.is_active ?? true}
                onChange={(event) => setMappingForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              Đang hoạt động
            </label>
            <button type="button" onClick={resetMappingForm} className={`${SECONDARY_BTN} md:col-span-2`}>
              Tạo mới
            </button>
          </div>

          <div className="mt-4">
            <DataTable
              columns={mappingColumns}
              rows={serviceMappings}
              rowKey={(mapping) => String(mapping.id)}
              density="compact"
              className="max-h-[340px]"
            />
          </div>
        </WidgetCard>
      </div>

      <WidgetCard title="Custom report">
        <p className="text-[14px] text-ink-600">Tạo báo cáo tùy chọn theo khoảng thời gian và drilldown vào route chi tiết.</p>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_220px_220px_180px]">
          <div className="rounded-field border border-line p-4">
            <div className="mb-3 text-[14px] font-medium text-ink-900">Chỉ số</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {INDICATORS.map((indicator) => (
                <label
                  key={indicator.key}
                  className="inline-flex items-center gap-2 rounded-field border border-line px-3 py-2 text-[14px] text-ink-600"
                >
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

          <label className="flex flex-col gap-2 text-[14px] font-medium text-ink-900">
            Từ ngày
            <input
              type="date"
              value={customStartDate}
              onChange={(event) => setCustomStartDate(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-2 text-[14px] font-medium text-ink-900">
            Đến ngày
            <input
              type="date"
              value={customEndDate}
              onChange={(event) => setCustomEndDate(event.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void generateCustomReport({ indicators: customIndicators, startDate: customStartDate, endDate: customEndDate })}
              className={`w-full justify-center ${PRIMARY_BTN}`}
            >
              <BarChart3 className="h-4 w-4" />
              Tạo báo cáo
            </button>
          </div>
        </div>

        {customReport && (
          <div className="mt-6 space-y-4">
            {Object.entries((customReport.data as Record<string, unknown>) || {}).map(([groupKey, items]) => {
              const rows: CustomReportRow[] = Array.isArray(items)
                ? items.map((item: any, index) => ({ item, index }))
                : [];
              const reportColumns: DataTableColumn<CustomReportRow>[] = [
                {
                  key: 'metric',
                  header: 'Chỉ số',
                  cell: ({ item }) => (
                    <span className="font-medium text-ink-900">
                      {groupKey === 'infectious' ? item.disease_name : item.name}
                    </span>
                  ),
                },
                {
                  key: 'current',
                  header: 'Hiện tại',
                  align: 'right',
                  cell: ({ item }) => (
                    <span className="text-ink-900">
                      {groupKey === 'infectious' ? item.periods?.current ?? 0 : item.current ?? 0}
                    </span>
                  ),
                },
                {
                  key: 'previous',
                  header: 'Trước',
                  align: 'right',
                  cell: ({ item }) => (
                    <span className="text-ink-600">
                      {groupKey === 'infectious' ? item.periods?.previous ?? 0 : item.previous ?? 0}
                    </span>
                  ),
                },
                {
                  key: 'detail',
                  header: 'Chi tiết',
                  align: 'right',
                  cell: ({ item }) => {
                    const rowKey = groupKey === 'infectious' ? item.icd_code : item.key;
                    const rowTitle = groupKey === 'infectious' ? item.disease_name : item.name;
                    const rowType = groupKey === 'infectious' ? 'infectious' : groupKey;
                    return (
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
                              from: 'management',
                            }),
                          )
                        }
                        className={ROW_EDIT_BTN}
                      >
                        Drilldown
                      </button>
                    );
                  },
                },
              ];

              return (
                <div key={groupKey}>
                  <div className="mb-2 text-[14px] font-semibold text-ink-900">
                    {INDICATORS.find((indicator) => indicator.key === groupKey)?.label || groupKey}
                  </div>
                  <DataTable
                    columns={reportColumns}
                    rows={rows}
                    rowKey={({ item, index }) =>
                      `${groupKey === 'infectious' ? item.icd_code : item.key}-${index}`
                    }
                    density="compact"
                    stickyHeader={false}
                  />
                </div>
              );
            })}
          </div>
        )}
      </WidgetCard>
    </div>
  );
}
