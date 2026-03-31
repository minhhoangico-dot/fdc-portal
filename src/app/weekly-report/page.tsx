/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { WEEKLY_REPORT_MANAGEMENT_PATH } from '@/lib/weekly-report';

export default function WeeklyReportPage() {
  const location = useLocation();
  return <Navigate to={`${WEEKLY_REPORT_MANAGEMENT_PATH}${location.search}`} replace />;
}
