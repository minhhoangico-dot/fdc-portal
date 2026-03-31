/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, FileText, Package, DollarSign, CreditCard, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/viewmodels/useRequests';
import { can } from '@/lib/permissions/access';
import { formatVND, formatDate, cn } from '@/lib/utils';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { EmptyState } from '@/components/shared/EmptyState';
import { RequestType, RequestStatus } from '@/types/request';
import { REQUEST_TYPES } from '@/lib/constants';

const TYPE_ICONS: Record<RequestType, any> = {
  material_release: Package,
  purchase: DollarSign,
  payment: CreditCard,
  advance: DollarSign,
  leave: Calendar,
  other: FileText,
};

export default function RequestsPage() {
  const { user } = useAuth();
  const {
    requests,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
  } = useRequests();

  const navigate = useNavigate();
  const title = !user
    ? 'Danh sach de nghi'
    : can(user.role, 'requests.view_all')
      ? 'Danh sach de nghi'
      : can(user.role, 'requests.view_assigned')
        ? 'De nghi lien quan'
        : 'De nghi cua toi';

  const tabs: { value: RequestStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Tat ca' },
    { value: 'pending', label: 'Cho duyet' },
    { value: 'approved', label: 'Da duyet' },
    { value: 'rejected', label: 'Tu choi' },
    { value: 'draft', label: 'Nhap' },
  ];

  return (
    <div className="space-y-6 relative pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <Link
          to="/requests/create"
          className="hidden md:flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tao de nghi moi
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex overflow-x-auto pb-2 -mb-2 hide-scrollbar gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === tab.value
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tim theo tieu de hoac ma de nghi..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 sm:w-48">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              className="w-full py-2 pl-3 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
            >
              <option value="newest">Moi nhat</option>
              <option value="oldest">Cu nhat</option>
              <option value="priority">Uu tien cao</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {requests.length > 0 ? (
          requests.map((request) => {
            const Icon = TYPE_ICONS[request.type] || FileText;

            return (
              <div
                key={request.id}
                onClick={() => navigate(`/requests/${request.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row gap-4 sm:items-center"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-gray-50 rounded-lg shrink-0">
                    <Icon className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">{request.requestNumber}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{REQUEST_TYPES[request.type]}</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 truncate mb-2">{request.title}</h3>
                    {request.metadata?.originModule === 'room_management' && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                          Room Management
                        </span>
                        {request.metadata.roomCode ? (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {request.metadata.roomCode}
                          </span>
                        ) : null}
                        {request.metadata.sourceIntakeIds?.length ? (
                          <span className="text-xs text-gray-500">
                            {request.metadata.sourceIntakeIds.length} intake lien ket
                          </span>
                        ) : null}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={request.status} />
                      <PriorityBadge priority={request.priority} />
                      <span className="text-xs text-gray-500 ml-1">{formatDate(request.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {request.totalAmount ? (
                  <div className="sm:text-right pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 mt-3 sm:mt-0">
                    <div className="text-sm font-semibold text-gray-900">{formatVND(request.totalAmount)}</div>
                    <div className="text-xs text-gray-500 mt-1">Tong tien</div>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <EmptyState
            title="Khong tim thay de nghi nao"
            description="Thu thay doi bo loc hoac tim kiem voi tu khoa khac."
          />
        )}
      </div>

      <Link
        to="/requests/create"
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors z-40"
      >
        <Plus className="w-6 h-6" />
      </Link>
    </div>
  );
}
