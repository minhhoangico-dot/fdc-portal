import { useAuth } from '@/contexts/AuthContext';
import { useRequests } from '@/viewmodels/useRequests';
import { useApprovals } from '@/viewmodels/useApprovals';
import { useInventory } from '@/viewmodels/useInventory';
import { useAttendance } from '@/viewmodels/useAttendance';
import { useAdmin } from '@/viewmodels/useAdmin';
import { formatDate } from '@/lib/utils';
import { RequestType } from '@/types/request';
import { FileText, Calendar, Clock, CheckCircle, Package, Settings, RefreshCw, Users } from 'lucide-react';

export function useDashboard() {
  const { user } = useAuth();
  const { requests: visibleRequests } = useRequests();
  const approvalEnabled = user?.role === 'dept_head' || user?.role === 'super_admin' || user?.role === 'director' || user?.role === 'chairman';
  const inventoryEnabled = user?.role === 'super_admin';
  const adminEnabled = user?.role === 'super_admin' || user?.role === 'director' || user?.role === 'chairman';
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

  // Base Quick Actions
  let quickActions = [
    { label: 'Tạo đề nghị', icon: FileText, path: '/requests', color: 'bg-blue-100 text-blue-700' },
    { label: 'Xin nghỉ phép', icon: Calendar, path: '/requests', color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Chấm công tháng', icon: Clock, path: '/portal', color: 'bg-purple-100 text-purple-700' },
  ];

  if (user.role === 'dept_head') {
    quickActions.push(
      { label: 'Duyệt đề nghị', icon: CheckCircle, path: '/approvals', color: 'bg-amber-100 text-amber-700' },
      { label: 'Xuất vật tư', icon: Package, path: '/inventory', color: 'bg-indigo-100 text-indigo-700' }
    );
  } else if (user.role === 'super_admin' || user.role === 'accountant') {
    quickActions.push(
      { label: 'Duyệt đề nghị', icon: CheckCircle, path: '/approvals', color: 'bg-amber-100 text-amber-700' },
      { label: 'Quản lý kho', icon: Package, path: '/inventory', color: 'bg-indigo-100 text-indigo-700' },
      { label: 'Cấu hình', icon: Settings, path: '/admin', color: 'bg-slate-100 text-slate-700' },
      { label: 'Đồng bộ thủ công', icon: RefreshCw, path: '/admin', color: 'bg-cyan-100 text-cyan-700' }
    );
  } else if (user.role === 'director' || user.role === 'chairman') {
    quickActions.push(
      { label: 'Duyệt đề nghị', icon: CheckCircle, path: '/approvals', color: 'bg-amber-100 text-amber-700' },
      { label: 'Tổng quan nhân sự', icon: Users, path: '/portal', color: 'bg-rose-100 text-rose-700' }
    );
  }

  // Recent Activity (last 5 requests by user)
  const recentActivity = [...myRequests].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  // My Requests Summary
  const myRequestsSummary = {
    pending: myRequests.filter(r => r.status === 'pending' || r.status === 'escalated').length,
    approved: myRequests.filter(r => r.status === 'approved' || r.status === 'completed').length,
    rejected: myRequests.filter(r => r.status === 'rejected' || r.status === 'cancelled').length,
  };

  const data: any = {
    user,
    todayDate,
    quickActions,
    recentActivity,
    myRequestsSummary,
    attendanceSummary,
  };

  // Dept Head specific
  if (user.role === 'dept_head') {
    data.deptPendingApprovals = pendingApprovals.filter(r => r.department === user.department);
  }

  // KTT / Super Admin specific
  if (user.role === 'super_admin') {
    const systemPendingByType = pendingApprovals.reduce((acc, req) => {
      acc[req.type] = (acc[req.type] || 0) + 1;
      return acc;
    }, {} as Record<RequestType, number>);

    data.systemPendingByType = systemPendingByType;
    data.bridgeHealth = bridgeHealth;

    const misaSyncRuns = syncHistory
      .filter((sync) => sync.type === 'scanMisaPhieuchi' && sync.status === 'success')
      .sort((a, b) => new Date(b.completedAt || b.startedAt).getTime() - new Date(a.completedAt || a.startedAt).getTime());
    const lastMisaSync = misaSyncRuns[0];
    data.misaSyncStatus = {
      lastSync: lastMisaSync?.completedAt || null,
      paymentsMatched: lastMisaSync?.recordsSynced || 0,
    };

    data.anomalyCount = anomalies.filter(a => !a.acknowledged).length;

    data.stats = {
      totalRequests: systemRequestsThisMonth.length,
      approvalRate:
        systemRequestsThisMonth.length > 0
          ? Math.round((approvedThisMonth.length / systemRequestsThisMonth.length) * 100)
          : 0,
      avgTimeHours,
    };
  }

  // Director specific
  if (user.role === 'director' || user.role === 'chairman') {
    data.directorPendingRequests = pendingApprovals;

    const deptStaffCounts = users.reduce((acc, u) => {
      if (u.department) {
        acc[u.department] = (acc[u.department] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    data.deptStaffCounts = deptStaffCounts;
  }

  return data;
}
