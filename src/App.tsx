/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OnsiteAccessGate } from '@/components/auth/OnsiteAccessGate';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { TvAccessGate } from '@/components/auth/TvAccessGate';
import { AppShell } from '@/components/layout/AppShell';
import { RouteFallback } from '@/components/layout/RouteFallback';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoomManagementProvider } from '@/contexts/RoomManagementContext';
import { RoleCatalogProvider } from '@/contexts/RoleCatalogContext';

const AdminPage = React.lazy(() => import('@/app/admin/page'));
const ApprovalsPage = React.lazy(() => import('@/app/approvals/page'));
const AttendancePage = React.lazy(() => import('@/app/attendance/page'));
const DashboardPage = React.lazy(() => import('@/app/dashboard/page'));
const InventoryPage = React.lazy(() => import('@/app/inventory/page'));
const LabDashboardPage = React.lazy(() => import('@/app/lab-dashboard/page'));
const LabDashboardTvPage = React.lazy(() => import('@/app/lab-dashboard/tv/page'));
const LoginPage = React.lazy(() => import('@/app/login/page'));
const OrgChartPage = React.lazy(() => import('@/app/org-chart/page'));
const PharmacyPage = React.lazy(() => import('@/app/pharmacy/page'));
const PortalPage = React.lazy(() => import('@/app/portal/page'));
const RoomManagementMaintenancePage = React.lazy(() => import('@/app/room-management/maintenance/page'));
const RoomManagementPage = React.lazy(() => import('@/app/room-management/page'));
const RoomManagementMaterialsPrintPage = React.lazy(() => import('@/app/room-management/print/materials/page'));
const RequestDetailPage = React.lazy(() => import('@/app/requests/[id]/page'));
const CreateRequestPage = React.lazy(() => import('@/app/requests/create/page'));
const RequestsPage = React.lazy(() => import('@/app/requests/page'));
const TvDisplayPage = React.lazy(() => import('@/app/tv/[slug]/page'));
const TvManagementPage = React.lazy(() => import('@/app/tv-management/page'));
const TvManagementWeeklyReportDetailsPage = React.lazy(() => import('@/app/tv-management/weekly-report/details/page'));
const TvManagementWeeklyReportPage = React.lazy(() => import('@/app/tv-management/weekly-report/page'));
const TvManagementWeeklyReportTvPage = React.lazy(() => import('@/app/tv-management/weekly-report/tv/page'));
const ValuationPage = React.lazy(() => import('@/app/valuation/page'));
const WeeklyReportDetailsPage = React.lazy(() => import('@/app/weekly-report/details/page'));
const WeeklyReportPage = React.lazy(() => import('@/app/weekly-report/page'));
const WeeklyReportTvPage = React.lazy(() => import('@/app/weekly-report/tv/page'));

export default function App() {
  return (
    <AuthProvider>
      <RoleCatalogProvider>
        <BrowserRouter>
          <React.Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/tv/:slug"
                element={
                  <TvAccessGate>
                    <TvDisplayPage />
                  </TvAccessGate>
                }
              />
              <Route
                path="/lab-dashboard/tv"
                element={
                  <TvAccessGate>
                    <LabDashboardTvPage />
                  </TvAccessGate>
                }
              />
              <Route
                path="/tv-management/weekly-report/tv"
                element={
                  <RequireAuth moduleKey="weekly_report">
                    <TvAccessGate>
                      <TvManagementWeeklyReportTvPage />
                    </TvAccessGate>
                  </RequireAuth>
                }
              />
              <Route
                path="/tv-management/weekly-report/details"
                element={
                  <RequireAuth moduleKey="weekly_report">
                    <TvAccessGate>
                      <TvManagementWeeklyReportDetailsPage />
                    </TvAccessGate>
                  </RequireAuth>
                }
              />
              <Route
                path="/weekly-report/tv"
                element={<WeeklyReportTvPage />}
              />
              <Route
                path="/weekly-report/details"
                element={<WeeklyReportDetailsPage />}
              />

              <Route
                element={
                  <RequireAuth>
                    <AppShell />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <RequireAuth moduleKey="dashboard">
                      <DashboardPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/requests"
                  element={
                    <RequireAuth moduleKey="requests">
                      <RequestsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/requests/create"
                  element={
                    <RequireAuth moduleKey="requests">
                      <CreateRequestPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/requests/:id"
                  element={
                    <RequireAuth moduleKey="requests">
                      <RequestDetailPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/approvals"
                  element={
                    <RequireAuth moduleKey="approvals">
                      <ApprovalsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <RequireAuth moduleKey="inventory">
                      <InventoryPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/pharmacy"
                  element={
                    <RequireAuth moduleKey="pharmacy">
                      <PharmacyPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/valuation"
                  element={
                    <RequireAuth moduleKey="inventory">
                      <ValuationPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/org-chart"
                  element={
                    <RequireAuth moduleKey="org_chart">
                      <OrgChartPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/portal"
                  element={
                    <RequireAuth moduleKey="portal">
                      <PortalPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/attendance"
                  element={
                    <RequireAuth moduleKey="attendance">
                      <AttendancePage />
                    </RequireAuth>
                  }
                />
                <Route
                  element={
                    <RequireAuth moduleKey="room_management">
                      <RoomManagementProvider />
                    </RequireAuth>
                  }
                >
                  <Route path="/room-management" element={<RoomManagementPage />} />
                  <Route
                    path="/room-management/maintenance"
                    element={<RoomManagementMaintenancePage />}
                  />
                  <Route
                    path="/room-management/print/materials"
                    element={<RoomManagementMaterialsPrintPage />}
                  />
                </Route>
                <Route
                  path="/weekly-report"
                  element={<WeeklyReportPage />}
                />
                <Route
                  path="/tv-management"
                  element={
                    <RequireAuth moduleKey="tv_management">
                      <OnsiteAccessGate surface="tv_management">
                        <TvManagementPage />
                      </OnsiteAccessGate>
                    </RequireAuth>
                  }
                />
                <Route
                  path="/tv-management/weekly-report"
                  element={
                    <RequireAuth moduleKey="tv_management">
                      <OnsiteAccessGate surface="tv_management">
                        <TvManagementWeeklyReportPage />
                      </OnsiteAccessGate>
                    </RequireAuth>
                  }
                />
                <Route path="/lab-dashboard" element={<LabDashboardPage />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAuth moduleKey="admin">
                      <OnsiteAccessGate surface="admin">
                        <AdminPage />
                      </OnsiteAccessGate>
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </React.Suspense>
        </BrowserRouter>
      </RoleCatalogProvider>
    </AuthProvider>
  );
}
