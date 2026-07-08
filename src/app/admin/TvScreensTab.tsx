/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExternalLink, Monitor, Pencil, Plus, Settings, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTvScreenPreviewHref, getTvScreenPublicAlias, getTvScreenSettingsHref } from '@/lib/tv-screen-links';
import { useTvScreensAdmin } from '@/viewmodels/useTvScreens';
import type { TvContentType, TvScreen } from '@/types/tvScreen';
import { PageHeader } from '@/ui/PageHeader';
import { DataTable, type DataTableColumn } from '@/ui/DataTable';
import { StatusBadge } from '@/ui/StatusBadge';
import { EmptyState } from '@/ui/EmptyState';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const EMPTY_FORM = {
  id: '',
  slug: '',
  name: '',
  location: '',
  contentType: 'url' as TvContentType,
  contentUrl: '',
  isActive: true,
  refreshIntervalSeconds: 300,
  settings: {} as Record<string, unknown>,
};

const FIELD_CLASS =
  'w-full rounded-field border border-line bg-card px-3 py-2 text-[14px] text-ink-900 transition-colors focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';
const FIELD_LABEL_CLASS =
  'mb-1 block text-[12px] font-medium uppercase tracking-wide text-ink-600';
const ICON_BTN_CLASS =
  'rounded-field p-1.5 text-ink-400 transition-colors hover:bg-paper hover:text-ink-600';

export function TvScreensTab() {
  const { screens, loading, message, saveScreen, deleteScreen, toggleActive } = useTvScreensAdmin();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setSlugManual(false);
    setIsFormOpen(true);
  };

  const openEdit = (screen: TvScreen) => {
    setForm({
      id: screen.id,
      slug: screen.slug,
      name: screen.name,
      location: screen.location ?? '',
      contentType: screen.contentType,
      contentUrl: screen.contentUrl,
      isActive: screen.isActive,
      refreshIntervalSeconds: screen.refreshIntervalSeconds,
      settings: screen.settings,
    });
    setSlugManual(true);
    setIsFormOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: slugManual ? f.slug : slugify(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.contentUrl.trim()) return;

    const ok = await saveScreen({
      id: form.id || undefined,
      slug: form.slug || slugify(form.name),
      name: form.name.trim(),
      location: form.location.trim() || null,
      contentType: form.contentType,
      contentUrl: form.contentUrl.trim(),
      isActive: form.isActive,
      refreshIntervalSeconds: form.refreshIntervalSeconds,
      settings: form.settings,
    });

    if (ok) {
      setForm(EMPTY_FORM);
      setIsFormOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteScreen(id);
    setConfirmDeleteId(null);
  };

  const columns: DataTableColumn<TvScreen>[] = [
    {
      key: 'name',
      header: 'Tên',
      cell: (screen) => (
        <div>
          <div className="font-medium text-ink-900">{screen.name}</div>
          <div className="text-[12px] text-ink-400">
            Alias cong khai: {getTvScreenPublicAlias(screen)}
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Vị trí',
      cellClassName: 'hidden md:table-cell text-ink-600',
      headerClassName: 'hidden md:table-cell',
      cell: (screen) => screen.location || '—',
    },
    {
      key: 'type',
      header: 'Loại',
      cell: (screen) => (
        <StatusBadge
          status={screen.contentType === 'url' ? 'info' : 'neutral'}
          label={screen.contentType === 'url' ? 'iframe' : 'internal'}
        />
      ),
    },
    {
      key: 'url',
      header: 'URL',
      cellClassName: 'hidden lg:table-cell',
      headerClassName: 'hidden lg:table-cell',
      cell: (screen) => (
        <span className="block max-w-xs truncate text-[12px] text-ink-600" title={screen.contentUrl}>
          {screen.contentUrl}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Active',
      align: 'center',
      cell: (screen) => (
        <button
          type="button"
          onClick={() => toggleActive(screen.id)}
          title="Bật/tắt hiển thị"
          className="cursor-pointer"
        >
          <StatusBadge
            status={screen.isActive ? 'ok' : 'neutral'}
            label={screen.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
          />
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      cell: (screen) => {
        const settingsHref = getTvScreenSettingsHref(screen);
        return (
          <div className="flex items-center justify-end gap-1">
            {settingsHref && (
              <Link to={settingsHref} className={ICON_BTN_CLASS} title="Cài đặt báo cáo giao ban">
                <Settings className="h-4 w-4" />
              </Link>
            )}
            <a
              href={getTvScreenPreviewHref(screen)}
              target="_blank"
              rel="noopener noreferrer"
              className={ICON_BTN_CLASS}
              title="Xem trước"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button type="button" onClick={() => openEdit(screen)} className={ICON_BTN_CLASS} title="Sửa">
              <Pencil className="h-4 w-4" />
            </button>
            {confirmDeleteId === screen.id ? (
              <button
                type="button"
                onClick={() => handleDelete(screen.id)}
                className="rounded-field px-2 py-1 text-[13px] font-medium text-danger-600 transition-colors hover:bg-danger-600/10"
              >
                Xác nhận xoá
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteId(screen.id)}
                className="rounded-field p-1.5 text-ink-400 transition-colors hover:bg-danger-600/10 hover:text-danger-600"
                title="Xoá"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Quản lý màn hình TV"
        actions={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-field bg-brand-600 px-3 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            Thêm TV
          </button>
        }
      />
      <p className="-mt-3 text-[14px] text-ink-600">
        Cấu hình nội dung hiển thị trên các TV tại phòng khám. Mỗi TV truy cập qua{' '}
        <code className="rounded-field bg-paper px-1.5 py-0.5 text-[12px]">/tv/slug</code>
      </p>

      {/* Message */}
      {message && (
        <div
          className={`rounded-card border px-4 py-3 text-[14px] ${
            message.type === 'success'
              ? 'border-brand-100 bg-brand-50 text-brand-700'
              : 'border-danger-600/20 bg-danger-600/10 text-danger-600'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-card border border-brand-100 bg-brand-50/40 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-ink-900">
              {form.id ? 'Chỉnh sửa TV' : 'Thêm TV mới'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-field p-1 text-ink-400 transition-colors hover:bg-paper hover:text-ink-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className={FIELD_LABEL_CLASS}>Tên TV *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="TV Sảnh chờ"
                required
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS}>Slug (URL)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                placeholder="sanh-cho"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS}>Vị trí</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Sảnh chờ tầng 1"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS}>Loại nội dung</label>
              <select
                value={form.contentType}
                onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value as TvContentType }))}
                className={FIELD_CLASS}
              >
                <option value="url">URL bên ngoài (iframe)</option>
                <option value="internal">Route nội bộ (redirect)</option>
              </select>
            </div>
            <div className="xl:col-span-2">
              <label className={FIELD_LABEL_CLASS}>URL / Đường dẫn *</label>
              <input
                type="text"
                value={form.contentUrl}
                onChange={(e) => setForm((f) => ({ ...f, contentUrl: e.target.value }))}
                placeholder={form.contentType === 'url' ? 'https://grafana.example.com/d/abc' : '/tv-management/weekly-report/tv'}
                required
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className={FIELD_LABEL_CLASS}>Refresh (giây)</label>
              <input
                type="number"
                min={30}
                value={form.refreshIntervalSeconds}
                onChange={(e) => setForm((f) => ({ ...f, refreshIntervalSeconds: Number(e.target.value) || 300 }))}
                className={FIELD_CLASS}
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-3 rounded-field border border-line bg-card px-3 py-2 text-[14px] text-ink-900">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-line text-brand-600 focus:ring-brand-600"
                />
                Đang hoạt động
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-field border border-line px-4 py-2 text-[14px] font-medium text-ink-600 transition-colors hover:bg-paper"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="rounded-field bg-brand-600 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              {form.id ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading && screens.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-6 text-[14px] text-ink-600">
          Đang tải danh sách TV...
        </div>
      ) : screens.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title='Chưa có màn hình TV nào. Nhấn "Thêm TV" để bắt đầu.'
        />
      ) : (
        <DataTable
          columns={columns}
          rows={screens}
          rowKey={(screen) => screen.id}
          density="compact"
        />
      )}
    </div>
  );
}
