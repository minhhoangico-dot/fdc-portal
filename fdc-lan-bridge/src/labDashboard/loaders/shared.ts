/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../../db/his";
import { LabDashboardTimelineDetailInput } from "../detailHelpers";
import { LabDashboardOrderStage, LabDashboardSectionFreshness } from "../types";

export const LAB_GROUP_ID = 3;
export const VALID_TIMESTAMP = (column: string) =>
  `CASE WHEN ${column} IS NOT NULL AND EXTRACT(YEAR FROM ${column}) >= 2000 THEN ${column} ELSE NULL END`;

export const LAB_ORDER_TIMELINE_CTE = `
  WITH lab_roots AS (
    SELECT
      sd.servicedataid,
      sd.patientrecordid,
      sd.dm_servicesubgroupid,
      subgroup.dm_servicesubgroupname AS subgroup_name,
      COALESCE(NULLIF(BTRIM(sd.servicename), ''), NULLIF(BTRIM(sd.servicecode), ''), 'Xet nghiem') AS test_name,
      EXISTS (
        SELECT 1
        FROM tb_treatment treatment
        WHERE treatment.patientrecordid = sd.patientrecordid
          AND COALESCE(treatment.isthutien, 0) = 1
      ) AS has_paid_treatment,
      ${VALID_TIMESTAMP("sd.servicedatausedate")} AS requested_at,
      ${VALID_TIMESTAMP("sd.order_date")} AS order_processing_at,
      ${VALID_TIMESTAMP("sd.do_servicedatadate")} AS fallback_processing_at,
      ${VALID_TIMESTAMP("sd.data_date")} AS root_result_at,
      ${VALID_TIMESTAMP("sd.end_date")} AS root_end_at
    FROM tb_servicedata sd
    LEFT JOIN tb_dm_servicesubgroup subgroup ON subgroup.dm_servicesubgroupid = sd.dm_servicesubgroupid
    WHERE sd.dm_servicegroupid = ${LAB_GROUP_ID}
      AND COALESCE(sd.servicedataid_master, 0) = 0
      AND COALESCE(NULLIF(BTRIM(sd.servicename), ''), '') NOT ILIKE 'Chênh lệch BH - %'
      AND (${VALID_TIMESTAMP("sd.servicedatausedate")})::date = $1::date
  ),
  child_results AS (
    SELECT
      child.servicedataid_master AS root_id,
      MAX(${VALID_TIMESTAMP("child.data_date")}) AS child_result_at,
      MAX(${VALID_TIMESTAMP("child.end_date")}) AS child_end_at
    FROM tb_servicedata child
    JOIN lab_roots roots ON roots.servicedataid = child.servicedataid_master
    WHERE child.dm_servicegroupid = ${LAB_GROUP_ID}
      AND COALESCE(child.servicedataid_master, 0) <> 0
    GROUP BY child.servicedataid_master
  ),
  orders AS (
    SELECT
      roots.servicedataid,
      roots.patientrecordid,
      roots.dm_servicesubgroupid,
      COALESCE(NULLIF(BTRIM(roots.subgroup_name), ''), 'Khác') AS subgroup_name,
      roots.test_name,
      roots.has_paid_treatment,
      roots.requested_at,
      COALESCE(roots.order_processing_at, roots.fallback_processing_at) AS processing_at,
      COALESCE(
        roots.root_result_at,
        child_results.child_result_at,
        roots.root_end_at,
        child_results.child_end_at
      ) AS result_at
    FROM lab_roots roots
    LEFT JOIN child_results ON child_results.root_id = roots.servicedataid
    WHERE roots.requested_at IS NOT NULL
      AND (
        COALESCE(roots.order_processing_at, roots.fallback_processing_at) IS NOT NULL
        OR COALESCE(
          roots.root_result_at,
          child_results.child_result_at,
          roots.root_end_at,
          child_results.child_end_at
        ) IS NOT NULL
        OR roots.has_paid_treatment
      )
  )
`;

const LAB_SUBGROUP_KEYS: Record<number, string> = {
  301: "hoa-sinh",
  303: "huyet-hoc",
  304: "dong-mau",
  305: "nuoc-tieu",
  318: "mien-dich",
};

type TimelineDetailRow = {
  servicedataid: number | null;
  patientcode: string | null;
  dm_servicesubgroupid: number | null;
  subgroup_name: string | null;
  test_name: string | null;
  requested_at: string | null;
  processing_at: string | null;
  result_at: string | null;
  total_minutes: string | number | null;
  requested_to_processing_minutes: string | number | null;
  processing_to_result_minutes: string | number | null;
  stage: LabDashboardOrderStage | null;
};

export function toNumber(value: string | number | null | undefined): number {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

export function roundMetric(value: string | number | null | undefined): number {
  return Math.max(0, Math.round(toNumber(value)));
}

export function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-") || "khac";
}

export function buildFreshness(source: "his" | "supabase", generatedAt: string, dataDate?: string): LabDashboardSectionFreshness {
  return { source, generatedAt, dataDate };
}

export function resolveTatTypeKey(subgroupId: number | null, subgroupName: string): string {
  if (subgroupId && LAB_SUBGROUP_KEYS[subgroupId]) {
    return LAB_SUBGROUP_KEYS[subgroupId];
  }

  return slugify(subgroupName);
}

export function formatValueWithUnit(value: string | null, unit: string | null): string {
  const parts = [value?.trim(), unit?.trim()].filter(Boolean);
  return parts.join(" ") || "--";
}

export function errorMessageFor(reason: unknown, fallback: string): string {
  if (reason instanceof Error && reason.message.trim()) {
    return reason.message;
  }

  return fallback;
}

function mapTimelineDetailRows(rows: TimelineDetailRow[]): LabDashboardTimelineDetailInput[] {
  return rows.map((row) => ({
    serviceDataId: toNumber(row.servicedataid),
    patientCode: row.patientcode?.trim() || "Ẩn danh",
    subgroupKey: resolveTatTypeKey(row.dm_servicesubgroupid, row.subgroup_name || "Khác"),
    subgroupName: row.subgroup_name?.trim() || "Khác",
    testName: row.test_name?.trim() || "Xet nghiem",
    requestedAt: row.requested_at || "",
    processingAt: row.processing_at || null,
    resultAt: row.result_at || null,
    totalMinutes: row.total_minutes === null ? null : roundMetric(row.total_minutes),
    requestedToProcessingMinutes:
      row.requested_to_processing_minutes === null ? null : roundMetric(row.requested_to_processing_minutes),
    processingToResultMinutes:
      row.processing_to_result_minutes === null ? null : roundMetric(row.processing_to_result_minutes),
    stage: (row.stage || "waiting") as LabDashboardOrderStage,
  }));
}

export async function fetchTimelineDetailRows(asOfDate: string): Promise<LabDashboardTimelineDetailInput[]> {
  const result = await hisPool.query<TimelineDetailRow>(
    `
      ${LAB_ORDER_TIMELINE_CTE}
      SELECT
        orders.servicedataid,
        p.patientcode,
        orders.dm_servicesubgroupid,
        orders.subgroup_name,
        orders.test_name,
        orders.requested_at::text AS requested_at,
        orders.processing_at::text AS processing_at,
        orders.result_at::text AS result_at,
        CASE
          WHEN orders.result_at IS NOT NULL THEN 'completed'
          WHEN orders.processing_at IS NOT NULL THEN 'processing'
          ELSE 'waiting'
        END AS stage,
        CASE
          WHEN orders.result_at IS NOT NULL AND orders.result_at >= orders.requested_at
            THEN ROUND(EXTRACT(EPOCH FROM (orders.result_at - orders.requested_at)) / 60.0)::int
          ELSE NULL
        END AS total_minutes,
        CASE
          WHEN orders.processing_at IS NOT NULL AND orders.processing_at >= orders.requested_at
            THEN ROUND(EXTRACT(EPOCH FROM (orders.processing_at - orders.requested_at)) / 60.0)::int
          ELSE NULL
        END AS requested_to_processing_minutes,
        CASE
          WHEN orders.processing_at IS NOT NULL AND orders.result_at IS NOT NULL AND orders.result_at >= orders.processing_at
            THEN ROUND(EXTRACT(EPOCH FROM (orders.result_at - orders.processing_at)) / 60.0)::int
          ELSE NULL
        END AS processing_to_result_minutes
      FROM orders
      JOIN tb_patientrecord pr ON pr.patientrecordid = orders.patientrecordid
      JOIN tb_patient p ON p.patientid = pr.patientid
      ORDER BY orders.requested_at ASC, orders.servicedataid ASC
    `,
    [asOfDate],
  );

  return mapTimelineDetailRows(result.rows);
}

