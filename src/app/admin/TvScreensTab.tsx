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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Quản lý màn hình TV</h2>
          <p className="text-sm text-gray-500">
            Cấu hình nội dung hiển thị trên các TV tại phòng khám. Mỗi TV truy cập qua{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">/tv/slug</code>
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Thêm TV
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {form.id ? 'Chỉnh sửa TV' : 'Thêm TV mới'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Tên TV *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="TV Sảnh chờ"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Slug (URL)
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                placeholder="sanh-cho"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Vị trí
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Sảnh chờ tầng 1"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Loại nội dung
              </label>
              <select
                value={form.contentType}
                onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value as TvContentType }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="url">URL bên ngoài (iframe)</option>
                <option value="internal">Route nội bộ (redirect)</option>
              </select>
            </div>
            <div className="xl:col-span-2">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                URL / Đường dẫn *
              </label>
              <input
                type="text"
                value={form.contentUrl}
                onChange={(e) => setForm((f) => ({ ...f, contentUrl: e.target.value }))}
                placeholder={form.contentType === 'url' ? 'https://grafana.example.com/d/abc' : '/tv-management/weekly-report/tv'}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                Refresh (giây)
              </label>
              <input
                type="number"
                min={30}
                value={form.refreshIntervalSeconds}
                onChange={(e) => setForm((f) => ({ ...f, refreshIntervalSeconds: Number(e.target.value) || 300 }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Đang hoạt động
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              {form.id ? 'Cập nhật' : 'Thêm'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading && screens.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Đang tải danh sách TV...
        </div>
      ) : screens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Monitor className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Chưa có màn hình TV nào. Nhấn "Thêm TV" để bắt đầu.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Tên</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 hidden md:table-cell">Vị trí</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">Loại</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 hidden lg:table-cell">URL</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 text-center">Active</th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {screens.map((screen) => {
                const settingsHref = getTvScreenSettingsHref(screen);

                return (
                <tr key={screen.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{screen.name}</div>
                    <div className="text-xs text-gray-400">
                      Alias cong khai: {getTvScreenPublicAlias(screen)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{screen.location || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        screen.contentType === 'url'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-violet-50 text-violet-700'
                      }`}
                    >
                      {screen.contentType === 'url' ? 'iframe' : 'internal'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="max-w-xs truncate block text-xs text-gray-500" title={screen.contentUrl}>
                      {screen.contentUrl}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleActive(screen.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        screen.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          screen.isActive ? 'translate-x-4' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {settingsHref && (
                        <Link
                          to={settingsHref}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Cài đặt báo cáo giao ban"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                      )}
                      <a
                        href={getTvScreenPreviewHref(screen)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Xem trước"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => openEdit(screen)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Sửa"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {confirmDeleteId === screen.id ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(screen.id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          Xác nhận xoá
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(screen.id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                          title="Xoá"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
