/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { WEEKLY_REPORT_DETAILS_PATH } from '@/lib/weekly-report';

export default function WeeklyReportDetailsPage() {
  const location = useLocation();
  return <Navigate to={`${WEEKLY_REPORT_DETAILS_PATH}${location.search}`} replace />;
}
