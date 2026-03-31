/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminPage from '@/app/admin/page';
import ApprovalsPage from '@/app/approvals/page';
import DashboardPage from '@/app/dashboard/page';
import InventoryPage from '@/app/inventory/page';
import LabDashboardPage from '@/app/lab-dashboard/page';
import LabDashboardTvPage from '@/app/lab-dashboard/tv/page';
import LoginPage from '@/app/login/page';
import PharmacyPage from '@/app/pharmacy/page';
import PortalPage from '@/app/portal/page';
import RoomManagementMaintenancePage from '@/app/room-management/maintenance/page';
import RoomManagementPage from '@/app/room-management/page';
import RoomManagementMaterialsPrintPage from '@/app/room-management/print/materials/page';
import RequestDetailPage from '@/app/requests/[id]/page';
import CreateRequestPage from '@/app/requests/create/page';
import RequestsPage from '@/app/requests/page';
import TvManagementPage from '@/app/tv-management/page';
import TvManagementWeeklyReportDetailsPage from '@/app/tv-management/weekly-report/details/page';
import TvManagementWeeklyReportPage from '@/app/tv-management/weekly-report/page';
import TvManagementWeeklyReportTvPage from '@/app/tv-management/weekly-report/tv/page';
import ValuationPage from '@/app/valuation/page';
import WeeklyReportDetailsPage from '@/app/weekly-report/details/page';
import WeeklyReportPage from '@/app/weekly-report/page';
import WeeklyReportTvPage from '@/app/weekly-report/tv/page';
import TvDisplayPage from '@/app/tv/[slug]/page';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { TvAccessGate } from '@/components/auth/TvAccessGate';
import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoomManagementProvider } from '@/contexts/RoomManagementContext';
import { RoleCatalogProvider } from '@/contexts/RoleCatalogContext';

export default function App() {
  return (
    <AuthProvider>
      <RoleCatalogProvider>
        <BrowserRouter>
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
                path="/portal"
                element={
                  <RequireAuth moduleKey="portal">
                    <PortalPage />
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
                    <TvManagementPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/tv-management/weekly-report"
                element={
                  <RequireAuth moduleKey="tv_management">
                    <TvManagementWeeklyReportPage />
                  </RequireAuth>
                }
              />
              <Route path="/lab-dashboard" element={<LabDashboardPage />} />
              <Route
                path="/admin"
                element={
                  <RequireAuth moduleKey="admin">
                    <AdminPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RoleCatalogProvider>
    </AuthProvider>
  );
}
