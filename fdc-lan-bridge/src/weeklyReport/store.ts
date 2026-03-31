/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../db/his";
import { supabase } from "../db/supabase";
import { logger } from "../lib/logger";
import {
  WeeklyReportData,
  WeeklyReportInfectiousCode,
  WeeklyReportLog,
  WeeklyReportServiceCatalogRow,
  WeeklyReportServiceMapping,
} from "./types";

const SNAPSHOT_TABLE = "fdc_weekly_report_snapshots";
const INFECTIOUS_CODE_TABLE = "fdc_weekly_report_infectious_codes";
const SERVICE_MAPPING_TABLE = "fdc_weekly_report_service_mappings";
const LOG_TABLE = "fdc_weekly_report_logs";

interface SnapshotRow {
  id: string;
  year: number;
  week_number: number;
  week_start: string;
  week_end: string;
  report_data: WeeklyReportData;
  generated_at: string;
}

export async function getWeeklyReportSnapshot(
  year: number,
  weekNumber: number,
): Promise<SnapshotRow | null> {
  const { data, error } = await supabase
    .from(SNAPSHOT_TABLE)
    .select("*")
    .eq("year", year)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (error) {
    logger.error(`Failed to fetch ${SNAPSHOT_TABLE}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return (data as SnapshotRow | null) ?? null;
}

export async function upsertWeeklyReportSnapshot(
  report: WeeklyReportData,
): Promise<void> {
  const snapshotPayload = {
    year: report.meta.year,
    week_number: report.meta.week_number,
    week_start: report.meta.week_start,
    week_end: report.meta.week_end,
    report_data: report,
    generated_at: report.meta.generated_at,
  };

  const { error } = await supabase
    .from(SNAPSHOT_TABLE)
    .upsert(snapshotPayload, { onConflict: "year,week_number" });

  if (error) {
    logger.error(`Failed to upsert ${SNAPSHOT_TABLE}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

export async function createWeeklyReportLog(
  actionType: string,
  details?: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase
    .from(LOG_TABLE)
    .insert({
      action_type: actionType,
      status: "RUNNING",
      details: details ?? null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    logger.error(`Failed to insert ${LOG_TABLE}: ${error?.message ?? "unknown"}`, {
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });
    throw error ?? new Error(`Failed to insert ${LOG_TABLE}`);
  }

  return data.id as string;
}

export async function completeWeeklyReportLog(
  id: string,
  status: WeeklyReportLog["status"],
  payload: { details?: Record<string, unknown> | null; errorMessage?: string | null } = {},
): Promise<void> {
  const { error } = await supabase
    .from(LOG_TABLE)
    .update({
      status,
      completed_at: new Date().toISOString(),
      details: payload.details ?? null,
      error_message: payload.errorMessage ?? null,
    })
    .eq("id", id);

  if (error) {
    logger.error(`Failed to update ${LOG_TABLE}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }
}

export async function getLatestWeeklyReportLog(): Promise<WeeklyReportLog | null> {
  const { data, error } = await supabase
    .from(LOG_TABLE)
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error(`Failed to fetch ${LOG_TABLE}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return (data as WeeklyReportLog | null) ?? null;
}

export async function listWeeklyReportInfectiousCodes(): Promise<WeeklyReportInfectiousCode[]> {
  const { data, error } = await supabase
    .from(INFECTIOUS_CODE_TABLE)
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    logger.error(`Failed to fetch ${INFECTIOUS_CODE_TABLE}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return (data as WeeklyReportInfectiousCode[]) ?? [];
}

export async function createWeeklyReportInfectiousCode(
  payload: Partial<WeeklyReportInfectiousCode>,
): Promise<WeeklyReportInfectiousCode> {
  const { data, error } = await supabase
    .from(INFECTIOUS_CODE_TABLE)
    .insert({
      icd_code: payload.icd_code,
      icd_pattern: payload.icd_pattern || `${payload.icd_code}%`,
      disease_name_vi: payload.disease_name_vi,
      disease_name_en: payload.disease_name_en ?? null,
      disease_group: payload.disease_group,
      color_code: payload.color_code ?? "#cbd5e1",
      is_active: payload.is_active ?? true,
      display_order: payload.display_order ?? 99,
    })
    .select("*")
    .single();

  if (error || !data) {
    logger.error(`Failed to create ${INFECTIOUS_CODE_TABLE}: ${error?.message ?? "unknown"}`);
    throw error ?? new Error(`Failed to create ${INFECTIOUS_CODE_TABLE}`);
  }

  return data as WeeklyReportInfectiousCode;
}

export async function updateWeeklyReportInfectiousCode(
  id: string,
  payload: Partial<WeeklyReportInfectiousCode>,
): Promise<WeeklyReportInfectiousCode> {
  const { data, error } = await supabase
    .from(INFECTIOUS_CODE_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    logger.error(`Failed to update ${INFECTIOUS_CODE_TABLE}: ${error?.message ?? "unknown"}`);
    throw error ?? new Error(`Failed to update ${INFECTIOUS_CODE_TABLE}`);
  }

  return data as WeeklyReportInfectiousCode;
}

export async function deleteWeeklyReportInfectiousCode(id: string): Promise<void> {
  const { error } = await supabase.from(INFECTIOUS_CODE_TABLE).delete().eq("id", id);

  if (error) {
    logger.error(`Failed to delete ${INFECTIOUS_CODE_TABLE}: ${error.message}`);
    throw error;
  }
}

export async function listWeeklyReportServiceMappings(): Promise<WeeklyReportServiceMapping[]> {
  const { data, error } = await supabase
    .from(SERVICE_MAPPING_TABLE)
    .select("*")
    .order("display_group", { ascending: true })
    .order("display_order", { ascending: true });

  if (error) {
    logger.error(`Failed to fetch ${SERVICE_MAPPING_TABLE}: ${error.message}`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return (data as WeeklyReportServiceMapping[]) ?? [];
}

export async function createWeeklyReportServiceMapping(
  payload: Partial<WeeklyReportServiceMapping>,
): Promise<WeeklyReportServiceMapping> {
  const { data, error } = await supabase
    .from(SERVICE_MAPPING_TABLE)
    .insert({
      category_key: payload.category_key,
      category_name_vi: payload.category_name_vi,
      display_group: payload.display_group,
      match_type: payload.match_type,
      match_value: payload.match_value,
      is_active: payload.is_active ?? true,
      display_order: payload.display_order ?? 99,
    })
    .select("*")
    .single();

  if (error || !data) {
    logger.error(`Failed to create ${SERVICE_MAPPING_TABLE}: ${error?.message ?? "unknown"}`);
    throw error ?? new Error(`Failed to create ${SERVICE_MAPPING_TABLE}`);
  }

  return data as WeeklyReportServiceMapping;
}

export async function updateWeeklyReportServiceMapping(
  id: string,
  payload: Partial<WeeklyReportServiceMapping>,
): Promise<WeeklyReportServiceMapping> {
  const { data, error } = await supabase
    .from(SERVICE_MAPPING_TABLE)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    logger.error(`Failed to update ${SERVICE_MAPPING_TABLE}: ${error?.message ?? "unknown"}`);
    throw error ?? new Error(`Failed to update ${SERVICE_MAPPING_TABLE}`);
  }

  return data as WeeklyReportServiceMapping;
}

export async function deleteWeeklyReportServiceMapping(id: string): Promise<void> {
  const { error } = await supabase.from(SERVICE_MAPPING_TABLE).delete().eq("id", id);

  if (error) {
    logger.error(`Failed to delete ${SERVICE_MAPPING_TABLE}: ${error.message}`);
    throw error;
  }
}

export async function searchWeeklyReportServiceCatalog(
  term: string,
): Promise<WeeklyReportServiceCatalogRow[]> {
  const { rows } = await hisPool.query<WeeklyReportServiceCatalogRow>(
    `
      SELECT DISTINCT
        sd.servicename,
        sd.dm_servicegroupid,
        sd.dm_servicesubgroupid
      FROM tb_servicedata sd
      WHERE sd.servicename ILIKE $1
      ORDER BY sd.servicename
      LIMIT 100
    `,
    [`%${term}%`],
  );

  return rows;
}

