/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Calendar, CheckCircle, Clock, FileText, MapPinned, Package, RefreshCw, Settings, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { can, canAccessModule } from '@/lib/permissions/access';
import { formatDate } from '@/lib/utils';
import { useAdmin } from '@/viewmodels/useAdmin';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useAttendance } from '@/viewmodels/useAttendance';
import { useInventory } from '@/viewmodels/useInventory';
import { useRequests } from '@/viewmodels/useRequests';
import type { RequestType } from '@/types/request';

export function useDashboard() {
  const { user } = useAuth();
  const { requests: visibleRequests } = useRequests();

  const approvalEnabled = Boolean(
    user &&
      (can(user.role, 'approvals.review_assigned') ||
        can(user.role, 'approvals.receive_handoff') ||
        can(user.role, 'room_management.review_group_queue')),
  );
  const inventoryEnabled = Boolean(user && canAccessModule(user.role, 'inventory'));
  const adminEnabled = Boolean(user && canAccessModule(user.role, 'admin'));
  const adminPreload: Array<'users' | 'approval' | 'misa' | 'sync' | 'audit'> =
    user?.role === 'super_admin'
      ? ['sync']
      : user?.role === 'director' || user?.role === 'chairman'
        ? ['users']
        : [];

  const { pendingApprovals } = useApprovals({ enabled: approvalEnabled });
  const { anomalies } = useInventory('all', { enabled: inventoryEnabled });
  const { attendanceSummary } = useAttendance();
  const { users, bridgeHealth, syncHistory } = useAdmin({
    enabled: adminEnabled,
    preload: adminPreload,
    useActiveTab: false,
  });

  if (!user) return null;

  const todayDate = formatDate(new Date());
  const myRequests = visibleRequests.filter((request) => request.requesterId === user.id);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const systemRequestsThisMonth = visibleRequests.filter((request) => {
    const createdAt = new Date(request.createdAt);
    return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
  });
  const approvedThisMonth = systemRequestsThisMonth.filter(
    (request) => request.status === 'approved' || request.status === 'completed',
  );
  const avgApprovalHoursSource = approvedThisMonth.filter(
    (request) =>
      Boolean(request.createdAt) &&
      Boolean(request.updatedAt) &&
      !Number.isNaN(new Date(request.createdAt).getTime()) &&
      !Number.isNaN(new Date(request.updatedAt).getTime()),
  );
  const avgTimeHours =
    avgApprovalHoursSource.length > 0
      ? Number(
          (
            avgApprovalHoursSource.reduce((sum, request) => {
              const durationMs =
                new Date(request.updatedAt).getTime() -
                new Date(request.createdAt).getTime();
              return sum + durationMs / (1000 * 60 * 60);
            }, 0) / avgApprovalHoursSource.length
          ).toFixed(1),
        )
      : 0;

  const quickActions = [
    {
      label: 'Tao de nghi',
      icon: FileText,
      path: '/requests',
      color: 'bg-blue-100 text-blue-700',
      visible: can(user.role, 'requests.create'),
    },
    {
      label: 'Xin nghi phep',
      icon: Calendar,
      path: '/requests',
      color: 'bg-emerald-100 text-emerald-700',
      visible: can(user.role, 'requests.create'),
    },
    {
      label: 'Cham cong thang',
      icon: Clock,
      path: '/portal',
      color: 'bg-purple-100 text-purple-700',
      visible: canAccessModule(user.role, 'portal'),
    },
    {
      label: 'Cong viec duyet',
      icon: CheckCircle,
      path: '/approvals',
      color: 'bg-amber-100 text-amber-700',
      visible: approvalEnabled,
    },
    {
      label: 'Room Management',
      icon: MapPinned,
      path: '/room-management',
      color: 'bg-cyan-100 text-cyan-700',
      visible: canAccessModule(user.role, 'room_management'),
    },
    {
      label: 'Quan ly kho',
      icon: Package,
      path: '/inventory',
      color: 'bg-indigo-100 text-indigo-700',
      visible: inventoryEnabled,
    },
    {
      label: 'Cau hinh',
      icon: Settings,
      path: '/admin',
      color: 'bg-slate-100 text-slate-700',
      visible: adminEnabled,
    },
    {
      label: 'Dong bo thu cong',
      icon: RefreshCw,
      path: '/admin',
      color: 'bg-cyan-100 text-cyan-700',
      visible: user.role === 'super_admin',
    },
    {
      label: 'Tong quan nhan su',
      icon: Users,
      path: '/portal',
      color: 'bg-rose-100 text-rose-700',
      visible: user.role === 'director' || user.role === 'chairman',
    },
  ].filter((action) => action.visible);

  const recentActivity = [...myRequests]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 5);

  const myRequestsSummary = {
    pending: myRequests.filter((request) => request.status === 'pending' || request.status === 'escalated').length,
    approved: myRequests.filter((request) => request.status === 'approved' || request.status === 'completed').length,
    rejected: myRequests.filter((request) => request.status === 'rejected' || request.status === 'cancelled').length,
  };

  const data: any = {
    user,
    todayDate,
    quickActions,
    recentActivity,
    myRequestsSummary,
    attendanceSummary,
  };

  if (['business_head', 'pharmacy_head', 'lab_head', 'head_nurse'].includes(user.role)) {
    data.deptPendingApprovals = pendingApprovals.filter((request) => request.department === user.department);
  }

  if (user.role === 'super_admin' || user.role === 'head_nurse') {
    const systemPendingByType = pendingApprovals.reduce((acc, request) => {
      acc[request.type] = (acc[request.type] || 0) + 1;
      return acc;
    }, {} as Record<RequestType, number>);

    data.systemPendingByType = systemPendingByType;
    data.anomalyCount = anomalies.filter((item) => !item.acknowledged).length;
    data.stats = {
      totalRequests: systemRequestsThisMonth.length,
      approvalRate:
        systemRequestsThisMonth.length > 0
          ? Math.round((approvedThisMonth.length / systemRequestsThisMonth.length) * 100)
          : 0,
      avgTimeHours,
    };

    if (user.role === 'super_admin') {
      data.bridgeHealth = bridgeHealth;

      const misaSyncRuns = syncHistory
        .filter((sync) => sync.type === 'scanMisaPhieuchi' && sync.status === 'success')
        .sort(
          (left, right) =>
            new Date(right.completedAt || right.startedAt).getTime() -
            new Date(left.completedAt || left.startedAt).getTime(),
        );
      const lastMisaSync = misaSyncRuns[0];
      data.misaSyncStatus = {
        lastSync: lastMisaSync?.completedAt || null,
        paymentsMatched: lastMisaSync?.recordsSynced || 0,
      };
    }
  }

  if (user.role === 'director' || user.role === 'chairman') {
    data.directorPendingRequests = pendingApprovals;

    const deptStaffCounts = users.reduce((acc, currentUser) => {
      if (currentUser.department) {
        acc[currentUser.department] = (acc[currentUser.department] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    data.deptStaffCounts = deptStaffCounts;
  }

  return data;
}
