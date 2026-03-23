/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowLeft, Database, FileDown, List, RefreshCw } from 'lucide-react';
import { LabDashboardSourcePanel } from '@/components/lab-dashboard/LabDashboardSourcePanel';
import { cn } from '@/lib/utils';
import {
  buildLabDashboardDetailExportFilename,
  exportLabDashboardDetailToWorkbook,
  getLabDashboardDetailExportState,
} from '@/lib/labDashboardDetailExport';
import type {
  LabDashboardAbnormalDetailRow,
  LabDashboardDetailPayload,
  LabDashboardDetailTab,
  LabDashboardQueueDetailRow,
  LabDashboardReagentDetailRow,
  LabDashboardTatDetailRow,
} from '@/types/labDashboard';
import '@/app/lab-dashboard/lab-dashboard.css';

interface LabDashboardDetailScreenProps {
  payload: LabDashboardDetailPayload | null;
  loading: boolean;
  refreshing?: boolean;
  error?: string | null;
  activeTab: LabDashboardDetailTab;
  onBack: () => void;
  onRefresh: () => void;
  onTabChange: (tab: LabDashboardDetailTab) => void;
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'HH:mm dd/MM', { locale: vi });
}

function formatMinutes(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('vi-VN')}p`;
}

function getEmptyMessage(section: string): string {
  if (section === 'queue') return 'Không có hồ sơ phù hợp với trạng thái đang chọn.';
  if (section === 'tat') return 'Không có hồ sơ hoàn thành phù hợp với focus TAT đang chọn.';
  if (section === 'abnormal') return 'Không ghi nhận kết quả bất thường trong ngày dữ liệu.';
  return 'Không có dòng snapshot nào đóng góp vào số liệu reagent đang chọn.';
}

function getStageLabel(stage: LabDashboardQueueDetailRow['stage']): string {
  if (stage === 'waiting') return 'Chờ lấy mẫu';
  if (stage === 'processing') return 'Đang xử lý';
  return 'Hoàn thành';
}

function renderQueueTable(rows: LabDashboardQueueDetailRow[]) {
  return (
    <table className="lab-dashboard-detail-table">
      <thead>
        <tr>
          <th>Mã BN</th>
          <th>Nhóm XN</th>
          <th>Trạng thái</th>
          <th>Tiếp nhận</th>
          <th>Xử lý</th>
          <th>Trả KQ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.serviceDataId}-${row.patientCode}`}>
            <td>{row.patientCode}</td>
            <td>{row.subgroupName}</td>
            <td>
              <span className={cn('lab-dashboard-detail-badge', `lab-dashboard-detail-badge--${row.stage}`)}>
                {getStageLabel(row.stage)}
              </span>
            </td>
            <td>{formatDateTime(row.requestedAt)}</td>
            <td>{formatDateTime(row.processingAt)}</td>
            <td>{formatDateTime(row.resultAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderTatTable(rows: LabDashboardTatDetailRow[]) {
  return (
    <table className="lab-dashboard-detail-table">
      <thead>
        <tr>
          <th>Mã BN</th>
          <th>Nhóm XN</th>
          <th>Tiếp nhận</th>
          <th>Xử lý</th>
          <th>Trả KQ</th>
          <th>Tổng TAT</th>
          <th>TN → XL</th>
          <th>XL → KQ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.serviceDataId}-${row.patientCode}`}>
            <td>{row.patientCode}</td>
            <td>{row.subgroupName}</td>
            <td>{formatDateTime(row.requestedAt)}</td>
            <td>{formatDateTime(row.processingAt)}</td>
            <td>{formatDateTime(row.resultAt)}</td>
            <td>{formatMinutes(row.totalMinutes)}</td>
            <td>{formatMinutes(row.requestedToProcessingMinutes)}</td>
            <td>{formatMinutes(row.processingToResultMinutes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderAbnormalTable(rows: LabDashboardAbnormalDetailRow[]) {
  return (
    <table className="lab-dashboard-detail-table">
      <thead>
        <tr>
          <th>Mã BN</th>
          <th>Mã XN</th>
          <th>Tên xét nghiệm</th>
          <th>Giá trị</th>
          <th>Cờ</th>
          <th>Khoảng tham chiếu</th>
          <th>Thời điểm</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.patientCode}-${row.testCode}-${index}`}>
            <td>{row.patientCode}</td>
            <td>{row.testCode}</td>
            <td>{row.testName}</td>
            <td>{row.value}</td>
            <td>
              <span className={cn('lab-dashboard-badge', `lab-dashboard-badge--${row.severity}`)}>
                {row.abnormalFlag || row.severity}
              </span>
            </td>
            <td>{row.referenceRange || '—'}</td>
            <td>{formatDateTime(row.resultAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderReagentTable(rows: LabDashboardReagentDetailRow[]) {
  return (
    <table className="lab-dashboard-detail-table">
      <thead>
        <tr>
          <th>Reagent</th>
          <th>Nguồn snapshot</th>
          <th>Mã thuốc</th>
          <th>Kho</th>
          <th>Tồn</th>
          <th>Đơn vị</th>
          <th>Ngày snapshot</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.reagentKey}-${row.sourceName}-${index}`}>
            <td>{row.reagentName}</td>
            <td>{row.sourceName}</td>
            <td>{row.medicineCode || '—'}</td>
            <td>{row.warehouse || '—'}</td>
            <td>{row.currentStock.toLocaleString('vi-VN')}</td>
            <td>{row.unit}</td>
            <td>{row.snapshotDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderRows(payload: LabDashboardDetailPayload) {
  if (payload.meta.section === 'queue') {
    return renderQueueTable(payload.rows as LabDashboardQueueDetailRow[]);
  }

  if (payload.meta.section === 'tat') {
    return renderTatTable(payload.rows as LabDashboardTatDetailRow[]);
  }

  if (payload.meta.section === 'abnormal') {
    return renderAbnormalTable(payload.rows as LabDashboardAbnormalDetailRow[]);
  }

  return renderReagentTable(payload.rows as LabDashboardReagentDetailRow[]);
}

export function LabDashboardDetailScreen({
  payload,
  loading,
  refreshing = false,
  error,
  activeTab,
  onBack,
  onRefresh,
  onTabChange,
}: LabDashboardDetailScreenProps) {
  const [exporting, setExporting] = React.useState(false);
  const exportLockRef = React.useRef(false);
  const exportState = getLabDashboardDetailExportState({ activeTab, loading, payload });

  const handleExport = React.useCallback(async () => {
    if (!payload || exportState.disabled || exporting || exportLockRef.current) {
      return;
    }

    exportLockRef.current = true;
    const snapshot = payload;
    const filename = buildLabDashboardDetailExportFilename(
      snapshot.meta.section,
      snapshot.meta.focus,
      snapshot.meta.asOfDate,
    );

    try {
      setExporting(true);

      const workbook = await exportLabDashboardDetailToWorkbook(snapshot);
      const xlsxModule = await import('xlsx');
      const xlsx = (xlsxModule as any).default ?? xlsxModule;

      xlsx.writeFile(workbook, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể xuất Excel. Vui lòng thử lại.';

      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(message);
      }
    } finally {
      exportLockRef.current = false;
      setExporting(false);
    }
  }, [exportState.disabled, exporting, payload]);

  if (!payload && loading) {
    return (
      <div className={cn('lab-dashboard-screen', 'lab-dashboard-screen--tv', 'lab-dashboard-state')}>
        <div className="lab-dashboard-state__spinner" />
        <div className="lab-dashboard-state__title">Đang tải chi tiết dashboard xét nghiệm</div>
        <div className="lab-dashboard-state__description">Đang lấy danh sách đối soát và nguồn dữ liệu cho khối đã chọn.</div>
      </div>
    );
  }

  if (!payload && error) {
    return (
      <div className={cn('lab-dashboard-screen', 'lab-dashboard-screen--tv', 'lab-dashboard-state')}>
        <div className="lab-dashboard-state__title">Không thể tải chi tiết dashboard xét nghiệm</div>
        <div className="lab-dashboard-state__description">{error}</div>
        <button type="button" className="lab-dashboard-state__button" onClick={onRefresh}>
          Thử lại
        </button>
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  return (
    <div className={cn('lab-dashboard-screen', 'lab-dashboard-screen--tv', 'lab-dashboard-detail-screen')}>
      <header className="lab-dashboard-detail-header">
        <div>
          <button type="button" className="lab-dashboard-detail-back" onClick={onBack}>
            <ArrowLeft size={16} />
            Quay lại dashboard live
          </button>
          <h1 className="lab-dashboard-detail-title">{payload.meta.title}</h1>
          <p className="lab-dashboard-detail-subtitle">{payload.meta.description}</p>
        </div>

        <div className="lab-dashboard-detail-actions">
          <button
            type="button"
            className={cn('lab-dashboard-detail-tab', activeTab === 'list' && 'lab-dashboard-detail-tab--active')}
            onClick={() => onTabChange('list')}
          >
            <List size={16} />
            Danh sách chi tiết
          </button>
          <button
            type="button"
            className={cn('lab-dashboard-detail-tab', activeTab === 'source' && 'lab-dashboard-detail-tab--active')}
            onClick={() => onTabChange('source')}
          >
            <Database size={16} />
            Nguồn dữ liệu
          </button>
          <button type="button" className="lab-dashboard-detail-refresh" onClick={onRefresh}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Làm mới
          </button>
          {activeTab === 'list' && (
            <button
              type="button"
              className="lab-dashboard-detail-export"
              onClick={handleExport}
              disabled={exportState.disabled || exporting}
              aria-busy={exporting}
            >
              <FileDown size={16} />
              {exporting ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
          )}
        </div>
      </header>

      {error && payload && (
        <div className="lab-dashboard-banner lab-dashboard-banner--danger">
          Không thể làm mới chi tiết tạm thời. Đang hiển thị dữ liệu gần nhất.
        </div>
      )}

      {activeTab === 'list' ? (
        <section className="lab-dashboard-detail-panel">
          <div className="lab-dashboard-detail-meta">
            <span>Ngày dữ liệu: {payload.meta.asOfDate}</span>
            <span>Sinh payload: {formatDateTime(payload.meta.generatedAt)}</span>
          </div>

          <div className="lab-dashboard-detail-table-wrap">
            {payload.rows.length > 0 ? (
              renderRows(payload)
            ) : (
              <div className="lab-dashboard-empty">{getEmptyMessage(payload.meta.section)}</div>
            )}
          </div>
        </section>
      ) : (
        <LabDashboardSourcePanel sources={payload.meta.sourceDetails} />
      )}
    </div>
  );
}
