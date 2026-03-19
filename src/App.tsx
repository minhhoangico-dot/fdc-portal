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
import LoginPage from '@/app/login/page';
import PharmacyPage from '@/app/pharmacy/page';
import PortalPage from '@/app/portal/page';
import ReportsPage from '@/app/reports/page';
import RequestDetailPage from '@/app/requests/[id]/page';
import CreateRequestPage from '@/app/requests/create/page';
import RequestsPage from '@/app/requests/page';
import ValuationPage from '@/app/valuation/page';
import WeeklyReportDetailsPage from '@/app/weekly-report/details/page';
import WeeklyReportPage from '@/app/weekly-report/page';
import WeeklyReportTvPage from '@/app/weekly-report/tv/page';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/contexts/AuthContext';
import { WEEKLY_REPORT_ROLES } from '@/lib/weekly-report';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/weekly-report/tv"
            element={
              <RequireAuth roles={WEEKLY_REPORT_ROLES}>
                <WeeklyReportTvPage />
              </RequireAuth>
            }
          />
          <Route
            path="/weekly-report/details"
            element={
              <RequireAuth roles={WEEKLY_REPORT_ROLES}>
                <WeeklyReportDetailsPage />
              </RequireAuth>
            }
          />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/requests/create" element={<CreateRequestPage />} />
            <Route path="/requests/:id" element={<RequestDetailPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/pharmacy" element={<PharmacyPage />} />
            <Route path="/valuation" element={<ValuationPage />} />
            <Route path="/portal" element={<PortalPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/weekly-report"
              element={
                <RequireAuth roles={WEEKLY_REPORT_ROLES}>
                  <WeeklyReportPage />
                </RequireAuth>
              }
            />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
