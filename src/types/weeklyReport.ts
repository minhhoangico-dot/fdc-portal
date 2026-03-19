/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WeeklyReportIndicatorKey =
  | 'examination'
  | 'laboratory'
  | 'imaging'
  | 'specialist'
  | 'infectious'
  | 'transfer';

export interface WeeklyReportStatItem {
  key: string;
  name: string;
  current: number;
  previous: number;
  is_bhyt: boolean;
}

export interface WeeklyReportSnapshotMeta {
  generated_at: string;
  week_start: string;
  week_end: string;
  week_number: number;
  year: number;
  source?: 'snapshot' | 'generated';
  snapshot_generated_at?: string;
}

export interface WeeklyReportInfectiousStat {
  icd_code: string;
  disease_name: string;
  group: string;
  periods: {
    current: number;
    previous: number;
    last_year: number;
  };
  age_groups: {
    age_0_2: number;
    age_3_12: number;
    age_13_18: number;
    age_18_50: number;
    age_over_50: number;
  };
}

export interface WeeklyReportData {
  meta: WeeklyReportSnapshotMeta;
  data: {
    examination: WeeklyReportStatItem[];
    laboratory: WeeklyReportStatItem[];
    imaging: WeeklyReportStatItem[];
    specialist: WeeklyReportStatItem[];
    infectious: WeeklyReportInfectiousStat[];
    transfer: WeeklyReportStatItem[];
  };
}

export interface WeeklyReportDetailRow {
  servicedataid: number;
  patientcode: string;
  patientname: string;
  dob: string;
  age: number;
  gender: string;
  insuranceid?: string | null;
  doituong?: string;
  servicename?: string;
  time?: string;
  room?: string;
  examtime?: string;
  hospitalname?: string;
  diagnosis?: string;
}

export interface WeeklyReportStatus {
  week: {
    year: number;
    week_number: number;
    week_start: string;
    week_end: string;
  };
  snapshot: {
    id: string;
    generated_at: string;
  } | null;
  latest_log: {
    id: string;
    action_type: string;
    started_at: string;
    completed_at?: string | null;
    status: 'RUNNING' | 'SUCCESS' | 'FAILED';
    details?: Record<string, unknown> | null;
    error_message?: string | null;
  } | null;
}

export interface WeeklyReportInfectiousCode {
  id: string;
  icd_code: string;
  icd_pattern: string;
  disease_name_vi: string;
  disease_name_en?: string | null;
  disease_group: string;
  color_code?: string | null;
  is_active: boolean;
  display_order: number;
}

export interface WeeklyReportServiceMapping {
  id: string;
  category_key: string;
  category_name_vi: string;
  display_group: string;
  match_type: string;
  match_value: string;
  is_active: boolean;
  display_order: number;
}

export interface WeeklyReportServiceCatalogRow {
  servicename: string;
  dm_servicegroupid: number | null;
  dm_servicesubgroupid: number | null;
}

