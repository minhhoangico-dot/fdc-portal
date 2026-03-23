/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../db/his";
import { supabase } from "../db/supabase";
import { toHoChiMinhDate } from "../lib/date";
import { logger } from "../lib/logger";
import {
  buildQueueDetailRows,
  buildReagentDetailRows,
  buildTatDetailRows,
  LabDashboardDetailQuery,
  LabDashboardTimelineDetailInput,
} from "./detailHelpers";
import {
  buildAbnormalSourceProvenance,
  buildQueueSourceProvenance,
  buildReagentSourceProvenance,
  buildTatSourceProvenance,
  LabDashboardReagentSnapshotSourceRow,
} from "./sourceProvenance";
import {
  LabDashboardAbnormal,
  LabDashboardAbnormalDetailRow,
  LabDashboardAbnormalRow,
  LabDashboardAbnormalSeverity,
  LabDashboardDetailMeta,
  LabDashboardDetailPayload,
  LabDashboardDetailRow,
  LabDashboardDetailSourceInfo,
  LabDashboardOrderStage,
  LabDashboardMeta,
  LabDashboardPayload,
  LabDashboardQueue,
  LabDashboardQueueDetailRow,
  LabDashboardQueueFocus,
  LabDashboardReagent,
  LabDashboardReagentDetailRow,
  LabDashboardReagentFocus,
  LabDashboardReagentStatus,
  LabDashboardSectionFreshness,
  LabDashboardTat,
  LabDashboardTatByType,
  LabDashboardTatDetailRow,
  LabDashboardTatFocus,
  LabDashboardTimelineProvenanceRow,
} from "./types";

const LAB_GROUP_ID = 3;
const ABNORMAL_ROW_FETCH_LIMIT = 60;
const ABNORMAL_ROW_DISPLAY_LIMIT = 12;
const INVENTORY_BATCH_SIZE = 1000;

const VALID_TIMESTAMP = (column: string) =>
  `CASE WHEN ${column} IS NOT NULL AND EXTRACT(YEAR FROM ${column}) >= 2000 THEN ${column} ELSE NULL END`;

const LAB_ORDER_TIMELINE_CTE = `
  WITH lab_roots AS (
    SELECT
      sd.servicedataid,
      sd.patientrecordid,
      sd.dm_servicesubgroupid,
      subgroup.dm_servicesubgroupname AS subgroup_name,
      ${VALID_TIMESTAMP("sd.servicedatausedate")} AS requested_at,
      ${VALID_TIMESTAMP("sd.order_date")} AS processing_at,
      ${VALID_TIMESTAMP("sd.data_date")} AS root_result_at
    FROM tb_servicedata sd
    LEFT JOIN tb_dm_servicesubgroup subgroup ON subgroup.dm_servicesubgroupid = sd.dm_servicesubgroupid
    WHERE sd.dm_servicegroupid = ${LAB_GROUP_ID}
      AND COALESCE(sd.servicedataid_master, 0) = 0
      AND (${VALID_TIMESTAMP("sd.servicedatausedate")})::date = $1::date
  ),
  child_results AS (
    SELECT
      child.servicedataid_master AS root_id,
      MAX(${VALID_TIMESTAMP("child.data_date")}) AS child_result_at
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
      roots.requested_at,
      roots.processing_at,
      COALESCE(roots.root_result_at, child_results.child_result_at) AS result_at
    FROM lab_roots roots
    LEFT JOIN child_results ON child_results.root_id = roots.servicedataid
    WHERE roots.requested_at IS NOT NULL
  )
`;

const LAB_SUBGROUP_KEYS: Record<number, string> = {
  301: "hoa-sinh",
  303: "huyet-hoc",
  304: "dong-mau",
  305: "nuoc-tieu",
  318: "mien-dich",
};

const REAGENT_CONFIGS: Array<{
  key: string;
  name: string;
  targetStock: number;
  keywords: string[];
  unitFallback?: string;
}> = [
  {
    key: "hematology",
    name: "Huyết học CBC",
    targetStock: 6,
    unitFallback: "hộp",
    keywords: ["lyse-mek", "diluit-mek", "cbc", "hemo", "huyet hoc"],
  },
  {
    key: "glucose",
    name: "Glucose",
    targetStock: 2,
    unitFallback: "hộp",
    keywords: ["glucose"],
  },
  {
    key: "creatinine",
    name: "Creatinine",
    targetStock: 2,
    unitFallback: "hộp",
    keywords: ["creatinin", "cre "],
  },
  {
    key: "crp",
    name: "CRP",
    targetStock: 3,
    unitFallback: "hộp",
    keywords: ["crp"],
  },
  {
    key: "hba1c",
    name: "HbA1c",
    targetStock: 2,
    unitFallback: "hộp",
    keywords: ["hba1c"],
  },
  {
    key: "alt-ast",
    name: "ALT / AST",
    targetStock: 2,
    unitFallback: "hộp",
    keywords: ["alt", "ast", "sgpt", "sgot"],
  },
  {
    key: "electrolyte",
    name: "Điện giải",
    targetStock: 3,
    unitFallback: "hộp",
    keywords: ["dien giai", "điện giải", "ise", "electrolyte"],
  },
  {
    key: "urine",
    name: "Nước tiểu",
    targetStock: 10,
    unitFallback: "hộp",
    keywords: ["nuoc tieu", "nước tiểu", "urine"],
  },
  {
    key: "thyroid",
    name: "TSH / FT4",
    targetStock: 4,
    unitFallback: "hộp",
    keywords: ["tsh", "ft4"],
  },
  {
    key: "lipid",
    name: "Lipid panel",
    targetStock: 4,
    unitFallback: "hộp",
    keywords: ["triglyceride", "cholesterol", "lipid"],
  },
];

type QueueCountsRow = {
  waiting_for_sample: string | number | null;
  processing: string | number | null;
  completed_today: string | number | null;
};

type TatOverviewRow = {
  average_minutes: string | number | null;
  median_minutes: string | number | null;
  requested_to_processing_minutes: string | number | null;
  processing_to_result_minutes: string | number | null;
};

type TatByTypeRow = {
  dm_servicesubgroupid: number | null;
  subgroup_name: string | null;
  minutes: string | number | null;
};

type AbnormalCountRow = {
  abnormal_count: string | number | null;
};

type TotalResultsRow = {
  total_results: string | number | null;
};

type AbnormalResultRow = {
  patientcode: string | null;
  test_code: string | null;
  test_name: string | null;
  data_value: string | null;
  unit: string | null;
  reference_range: string | null;
  abnormal_flag: string | null;
  result_at: string | null;
};

type TimelineDetailRow = {
  servicedataid: number | null;
  patientcode: string | null;
  dm_servicesubgroupid: number | null;
  subgroup_name: string | null;
  requested_at: string | null;
  processing_at: string | null;
  result_at: string | null;
  total_minutes: string | number | null;
  requested_to_processing_minutes: string | number | null;
  processing_to_result_minutes: string | number | null;
  stage: LabDashboardOrderStage | null;
};

type SnapshotDateRow = {
  snapshot_date: string;
};

type InventorySnapshotRow = {
  name: string | null;
  warehouse: string | null;
  current_stock: string | number | null;
  unit: string | null;
  medicine_code: string | null;
  snapshot_date: string;
};

type QueueTatResult = {
  queue: LabDashboardQueue;
  tat: LabDashboardTat;
  freshness: {
    queue: LabDashboardSectionFreshness;
    tat: LabDashboardSectionFreshness;
  };
};

type AbnormalResult = {
  abnormal: LabDashboardAbnormal;
  freshness: LabDashboardSectionFreshness;
};

type ReagentsResult = {
  reagents: LabDashboardReagent[];
  freshness: LabDashboardSectionFreshness;
};

type ReagentSummaryResult = {
  reagents: LabDashboardReagent[];
  detailRows: LabDashboardReagentDetailRow[];
  snapshotDate: string;
  positiveSnapshotRows: LabDashboardReagentSnapshotSourceRow[];
  labScopedRows: LabDashboardReagentSnapshotSourceRow[];
  matchedRows: LabDashboardReagentSnapshotSourceRow[];
  freshness: LabDashboardSectionFreshness;
};

function toNumber(value: string | number | null | undefined): number {
  const next = Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function roundMetric(value: string | number | null | undefined): number {
  return Math.max(0, Math.round(toNumber(value)));
}

function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-") || "khac";
}

function buildDefaultQueue(): LabDashboardQueue {
  return {
    waitingForSample: 0,
    processing: 0,
    completedToday: 0,
  };
}

function buildDefaultTat(): LabDashboardTat {
  return {
    averageMinutes: 0,
    medianMinutes: 0,
    requestedToProcessingMinutes: 0,
    processingToResultMinutes: 0,
    byType: [],
  };
}

function buildDefaultAbnormal(): LabDashboardAbnormal {
  return {
    abnormalCount: 0,
    totalResults: 0,
    rows: [],
  };
}

function buildDefaultReagents(): LabDashboardReagent[] {
  return REAGENT_CONFIGS.map((config) => ({
    key: config.key,
    name: config.name,
    currentStock: 0,
    targetStock: config.targetStock,
    unit: config.unitFallback || "hộp",
    status: "critical",
  }));
}

function buildFreshness(source: "his" | "supabase", generatedAt: string, dataDate?: string): LabDashboardSectionFreshness {
  return { source, generatedAt, dataDate };
}

function resolveTatTypeKey(subgroupId: number | null, subgroupName: string): string {
  if (subgroupId && LAB_SUBGROUP_KEYS[subgroupId]) {
    return LAB_SUBGROUP_KEYS[subgroupId];
  }

  return slugify(subgroupName);
}

function formatValueWithUnit(value: string | null, unit: string | null): string {
  const parts = [value?.trim(), unit?.trim()].filter(Boolean);
  return parts.join(" ") || "--";
}

function extractNumericValue(value: string | null): number | null {
  const match = value?.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const next = Number(match[0].replace(",", "."));
  return Number.isFinite(next) ? next : null;
}

function parseReferenceRange(reference: string | null): { low: number | null; high: number | null } | null {
  if (!reference) return null;

  const match = reference.match(/(-?\d+(?:[.,]\d+)?)\s*(?:-|–|—|to|đến)\s*(-?\d+(?:[.,]\d+)?)/i);
  if (!match) return null;

  const low = Number(match[1].replace(",", "."));
  const high = Number(match[2].replace(",", "."));

  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return null;
  }

  return { low, high };
}

function getAbnormalSeverity(
  abnormalFlag: string | null,
  dataValue: string | null,
  referenceRange: string | null,
): LabDashboardAbnormalSeverity {
  const flag = (abnormalFlag || "").trim().toUpperCase();
  const numericValue = extractNumericValue(dataValue);
  const range = parseReferenceRange(referenceRange);
  const high = range?.high ?? null;
  const low = range?.low ?? null;

  if (flag === "H") {
    if (numericValue !== null && high !== null && high > 0 && numericValue >= high * 1.25) {
      return "critical";
    }
    return "high";
  }

  if (flag === "L") {
    if (numericValue !== null && low !== null && low > 0 && numericValue <= low * 0.75) {
      return "critical";
    }
    return "low";
  }

  return "high";
}

function getSeverityRank(severity: LabDashboardAbnormalSeverity): number {
  if (severity === "critical") return 0;
  if (severity === "high") return 1;
  return 2;
}

function isLikelyLabInventoryRow(row: InventorySnapshotRow): boolean {
  const warehouse = normalizeText(row.warehouse);
  return warehouse.includes("xet nghiem");
}

function matchesAnyReagentKeyword(row: InventorySnapshotRow): boolean {
  return REAGENT_CONFIGS.some((config) => matchesReagentConfig(row, config.keywords));
}

function matchesKeywordSequence(haystack: string, keyword: string): boolean {
  const haystackTokens = haystack.split(" ").filter(Boolean);
  const keywordTokens = normalizeText(keyword).split(" ").filter(Boolean);

  if (keywordTokens.length === 0 || haystackTokens.length < keywordTokens.length) {
    return false;
  }

  for (let index = 0; index <= haystackTokens.length - keywordTokens.length; index += 1) {
    const matches = keywordTokens.every((token, offset) => haystackTokens[index + offset] === token);
    if (matches) {
      return true;
    }
  }

  return false;
}

function matchesReagentConfig(row: InventorySnapshotRow, keywords: string[]): boolean {
  const haystack = `${normalizeText(row.name)} ${normalizeText(row.medicine_code)}`;
  return keywords.some((keyword) => matchesKeywordSequence(haystack, keyword));
}

function getReagentStatus(currentStock: number, targetStock: number): LabDashboardReagentStatus {
  if (currentStock <= targetStock * 0.25) return "critical";
  if (currentStock <= targetStock * 0.5) return "low";
  return "ok";
}

function allocateReagentRows(sourceRows: InventorySnapshotRow[]): {
  reagents: LabDashboardReagent[];
  detailRows: LabDashboardReagentDetailRow[];
} {
  const claimedRows = new Set<number>();
  const detailRows: LabDashboardReagentDetailRow[] = [];

  const reagents = REAGENT_CONFIGS.map((config) => {
    const matchedRows = sourceRows.filter((row, index) => {
      if (claimedRows.has(index)) return false;
      if (!matchesReagentConfig(row, config.keywords)) return false;
      claimedRows.add(index);
      return true;
    });

    detailRows.push(
      ...matchedRows.map((row) => ({
        kind: "reagent" as const,
        reagentKey: config.key,
        reagentName: config.name,
        sourceName: row.name?.trim() || config.name,
        medicineCode: row.medicine_code?.trim() || null,
        warehouse: row.warehouse?.trim() || null,
        currentStock: toNumber(row.current_stock),
        unit: row.unit?.trim() || config.unitFallback || "há»™p",
        snapshotDate: row.snapshot_date,
      })),
    );

    const currentStock = Number(
      matchedRows
        .reduce((sum, row) => sum + toNumber(row.current_stock), 0)
        .toFixed(1),
    );
    const unit =
      matchedRows.find((row) => row.unit && row.unit.trim())?.unit?.trim() ||
      config.unitFallback ||
      "há»™p";

    return {
      key: config.key,
      name: config.name,
      currentStock,
      targetStock: config.targetStock,
      unit,
      status: getReagentStatus(currentStock, config.targetStock),
    } satisfies LabDashboardReagent;
  });

  return { reagents, detailRows };
}

function mapTimelineDetailRows(rows: TimelineDetailRow[]): LabDashboardTimelineDetailInput[] {
  return rows.map((row) => ({
    serviceDataId: toNumber(row.servicedataid),
    patientCode: row.patientcode?.trim() || "áº¨n danh",
    subgroupKey: resolveTatTypeKey(row.dm_servicesubgroupid, row.subgroup_name || "KhÃ¡c"),
    subgroupName: row.subgroup_name?.trim() || "KhÃ¡c",
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

function mapSnapshotSourceRows(rows: InventorySnapshotRow[]): LabDashboardReagentSnapshotSourceRow[] {
  return rows.map((row) => ({
    sourceName: row.name?.trim() || "Ẩn danh",
    medicineCode: row.medicine_code?.trim() || null,
    warehouse: row.warehouse?.trim() || null,
    currentStock: toNumber(row.current_stock),
    snapshotDate: row.snapshot_date,
  }));
}

async function fetchTimelineDetailRows(asOfDate: string): Promise<LabDashboardTimelineDetailInput[]> {
  const result = await hisPool.query<TimelineDetailRow>(
    `
      ${LAB_ORDER_TIMELINE_CTE}
      SELECT
        orders.servicedataid,
        p.patientcode,
        orders.dm_servicesubgroupid,
        orders.subgroup_name,
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

async function buildQueueAndTat(asOfDate: string, generatedAt: string): Promise<QueueTatResult> {
  const countsQuery = hisPool.query<QueueCountsRow>(
    `
      ${LAB_ORDER_TIMELINE_CTE}
      SELECT
        COUNT(*) FILTER (WHERE result_at IS NULL AND processing_at IS NULL) AS waiting_for_sample,
        COUNT(*) FILTER (WHERE result_at IS NULL AND processing_at IS NOT NULL) AS processing,
        COUNT(*) FILTER (WHERE result_at IS NOT NULL) AS completed_today
      FROM orders
    `,
    [asOfDate],
  );

  const overviewQuery = hisPool.query<TatOverviewRow>(
    `
      ${LAB_ORDER_TIMELINE_CTE},
      tat_rows AS (
        SELECT
          EXTRACT(EPOCH FROM (result_at - requested_at)) / 60.0 AS total_minutes,
          CASE
            WHEN processing_at IS NOT NULL AND processing_at >= requested_at
              THEN EXTRACT(EPOCH FROM (processing_at - requested_at)) / 60.0
            ELSE NULL
          END AS requested_to_processing_minutes,
          CASE
            WHEN processing_at IS NOT NULL AND result_at >= processing_at
              THEN EXTRACT(EPOCH FROM (result_at - processing_at)) / 60.0
            ELSE NULL
          END AS processing_to_result_minutes
        FROM orders
        WHERE result_at IS NOT NULL
          AND result_at >= requested_at
      )
      SELECT
        ROUND(AVG(total_minutes))::int AS average_minutes,
        ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_minutes))::int AS median_minutes,
        ROUND(AVG(requested_to_processing_minutes))::int AS requested_to_processing_minutes,
        ROUND(AVG(processing_to_result_minutes))::int AS processing_to_result_minutes
      FROM tat_rows
    `,
    [asOfDate],
  );

  const byTypeQuery = hisPool.query<TatByTypeRow>(
    `
      ${LAB_ORDER_TIMELINE_CTE},
      tat_rows AS (
        SELECT
          dm_servicesubgroupid,
          subgroup_name,
          EXTRACT(EPOCH FROM (result_at - requested_at)) / 60.0 AS total_minutes
        FROM orders
        WHERE result_at IS NOT NULL
          AND result_at >= requested_at
      )
      SELECT
        dm_servicesubgroupid,
        subgroup_name,
        ROUND(AVG(total_minutes))::int AS minutes
      FROM tat_rows
      GROUP BY dm_servicesubgroupid, subgroup_name
      HAVING ROUND(AVG(total_minutes))::int IS NOT NULL
      ORDER BY minutes ASC, subgroup_name ASC
    `,
    [asOfDate],
  );

  const [countsResult, overviewResult, byTypeResult] = await Promise.all([
    countsQuery,
    overviewQuery,
    byTypeQuery,
  ]);

  return {
    queue: {
      waitingForSample: toNumber(countsResult.rows[0]?.waiting_for_sample),
      processing: toNumber(countsResult.rows[0]?.processing),
      completedToday: toNumber(countsResult.rows[0]?.completed_today),
    },
    tat: {
      averageMinutes: roundMetric(overviewResult.rows[0]?.average_minutes),
      medianMinutes: roundMetric(overviewResult.rows[0]?.median_minutes),
      requestedToProcessingMinutes: roundMetric(overviewResult.rows[0]?.requested_to_processing_minutes),
      processingToResultMinutes: roundMetric(overviewResult.rows[0]?.processing_to_result_minutes),
      byType: byTypeResult.rows.map((row) => ({
        key: resolveTatTypeKey(row.dm_servicesubgroupid, row.subgroup_name || "Khác"),
        name: row.subgroup_name || "Khác",
        minutes: roundMetric(row.minutes),
      })),
    },
    freshness: {
      queue: buildFreshness("his", generatedAt, asOfDate),
      tat: buildFreshness("his", generatedAt, asOfDate),
    },
  };
}

async function buildAbnormal(asOfDate: string, generatedAt: string): Promise<AbnormalResult> {
  const abnormalFilter = `
    sd.dm_servicegroupid = ${LAB_GROUP_ID}
    AND (${VALID_TIMESTAMP("sd.data_date")}) IS NOT NULL
    AND (${VALID_TIMESTAMP("sd.data_date")})::date = $1::date
    AND NULLIF(BTRIM(sd.data_value), '') IS NOT NULL
    AND NULLIF(BTRIM(sd.data_value_lh), '') IS NOT NULL
  `;

  const [abnormalCountResult, totalResultsResult, rowsResult] = await Promise.all([
    hisPool.query<AbnormalCountRow>(
      `
        SELECT COUNT(*) AS abnormal_count
        FROM tb_servicedata sd
        WHERE ${abnormalFilter}
      `,
      [asOfDate],
    ),
    hisPool.query<TotalResultsRow>(
      `
        SELECT COUNT(*) AS total_results
        FROM tb_servicedata sd
        WHERE sd.dm_servicegroupid = ${LAB_GROUP_ID}
          AND (${VALID_TIMESTAMP("sd.data_date")}) IS NOT NULL
          AND (${VALID_TIMESTAMP("sd.data_date")})::date = $1::date
          AND NULLIF(BTRIM(sd.data_value), '') IS NOT NULL
      `,
      [asOfDate],
    ),
    hisPool.query<AbnormalResultRow>(
      `
        SELECT
          p.patientcode,
          COALESCE(NULLIF(BTRIM(sd.servicecode), ''), NULLIF(BTRIM(sd.servicename), '')) AS test_code,
          COALESCE(NULLIF(BTRIM(sd.servicename), ''), 'Xét nghiệm') AS test_name,
          sd.data_value,
          COALESCE(NULLIF(BTRIM(sd.serviceresultunit), ''), NULLIF(BTRIM(sd.serviceunit), '')) AS unit,
          NULLIF(BTRIM(sd.datareference), '') AS reference_range,
          NULLIF(BTRIM(sd.data_value_lh), '') AS abnormal_flag,
          (${VALID_TIMESTAMP("sd.data_date")})::text AS result_at
        FROM tb_servicedata sd
        JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
        JOIN tb_patient p ON p.patientid = pr.patientid
        WHERE ${abnormalFilter}
        ORDER BY (${VALID_TIMESTAMP("sd.data_date")}) DESC
        LIMIT ${ABNORMAL_ROW_FETCH_LIMIT}
      `,
      [asOfDate],
    ),
  ]);

  const rows: LabDashboardAbnormalRow[] = rowsResult.rows
    .map((row) => {
      const severity = getAbnormalSeverity(row.abnormal_flag, row.data_value, row.reference_range);
      return {
        patientCode: row.patientcode?.trim() || "Ẩn danh",
        testCode: row.test_code?.trim() || "XN",
        testName: row.test_name?.trim() || "Xét nghiệm",
        value: formatValueWithUnit(row.data_value, row.unit),
        severity,
        resultAt: row.result_at || generatedAt,
      };
    })
    .sort((left, right) => {
      const severityDiff = getSeverityRank(left.severity) - getSeverityRank(right.severity);
      if (severityDiff !== 0) return severityDiff;
      return new Date(right.resultAt).getTime() - new Date(left.resultAt).getTime();
    })
    .slice(0, ABNORMAL_ROW_DISPLAY_LIMIT);

  return {
    abnormal: {
      abnormalCount: toNumber(abnormalCountResult.rows[0]?.abnormal_count),
      totalResults: toNumber(totalResultsResult.rows[0]?.total_results),
      rows,
    },
    freshness: buildFreshness("his", generatedAt, asOfDate),
  };
}

async function buildAbnormalDetailRows(asOfDate: string, generatedAt: string): Promise<LabDashboardAbnormalDetailRow[]> {
  const abnormalFilter = `
    sd.dm_servicegroupid = ${LAB_GROUP_ID}
    AND (${VALID_TIMESTAMP("sd.data_date")}) IS NOT NULL
    AND (${VALID_TIMESTAMP("sd.data_date")})::date = $1::date
    AND NULLIF(BTRIM(sd.data_value), '') IS NOT NULL
    AND NULLIF(BTRIM(sd.data_value_lh), '') IS NOT NULL
  `;

  const result = await hisPool.query<AbnormalResultRow>(
    `
      SELECT
        p.patientcode,
        COALESCE(NULLIF(BTRIM(sd.servicecode), ''), NULLIF(BTRIM(sd.servicename), '')) AS test_code,
        COALESCE(NULLIF(BTRIM(sd.servicename), ''), 'XÃ©t nghiá»‡m') AS test_name,
        sd.data_value,
        COALESCE(NULLIF(BTRIM(sd.serviceresultunit), ''), NULLIF(BTRIM(sd.serviceunit), '')) AS unit,
        NULLIF(BTRIM(sd.datareference), '') AS reference_range,
        NULLIF(BTRIM(sd.data_value_lh), '') AS abnormal_flag,
        (${VALID_TIMESTAMP("sd.data_date")})::text AS result_at
      FROM tb_servicedata sd
      JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
      JOIN tb_patient p ON p.patientid = pr.patientid
      WHERE ${abnormalFilter}
      ORDER BY (${VALID_TIMESTAMP("sd.data_date")}) DESC
    `,
    [asOfDate],
  );

  return result.rows
    .map((row) => ({
      kind: "abnormal" as const,
      patientCode: row.patientcode?.trim() || "áº¨n danh",
      testCode: row.test_code?.trim() || "XN",
      testName: row.test_name?.trim() || "XÃ©t nghiá»‡m",
      value: formatValueWithUnit(row.data_value, row.unit),
      severity: getAbnormalSeverity(row.abnormal_flag, row.data_value, row.reference_range),
      resultAt: row.result_at || generatedAt,
      referenceRange: row.reference_range?.trim() || null,
      abnormalFlag: row.abnormal_flag?.trim() || null,
    }))
    .sort((left, right) => {
      const severityDiff = getSeverityRank(left.severity) - getSeverityRank(right.severity);
      if (severityDiff !== 0) return severityDiff;
      return new Date(right.resultAt).getTime() - new Date(left.resultAt).getTime();
    });
}

async function fetchLatestInventorySnapshotDate(): Promise<string | null> {
  const { data, error } = await supabase
    .from("fdc_inventory_snapshots")
    .select("snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return ((data || []) as SnapshotDateRow[])[0]?.snapshot_date ?? null;
}

async function fetchInventorySnapshotRows(snapshotDate: string): Promise<InventorySnapshotRow[]> {
  let from = 0;
  let hasMore = true;
  const rows: InventorySnapshotRow[] = [];

  while (hasMore) {
    const { data, error } = await supabase
      .from("fdc_inventory_snapshots")
      .select("name, warehouse, current_stock, unit, medicine_code, snapshot_date")
      .eq("snapshot_date", snapshotDate)
      .gt("current_stock", 0)
      .order("name", { ascending: true })
      .range(from, from + INVENTORY_BATCH_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = ((data || []) as unknown) as InventorySnapshotRow[];
    rows.push(...batch);
    from += INVENTORY_BATCH_SIZE;
    hasMore = batch.length === INVENTORY_BATCH_SIZE;
  }

  return rows;
}

async function buildReagentSummary(generatedAt: string): Promise<ReagentSummaryResult> {
  const snapshotDate = await fetchLatestInventorySnapshotDate();
  if (!snapshotDate) {
    throw new Error("No inventory snapshot available for lab reagents.");
  }

  const snapshotRows = await fetchInventorySnapshotRows(snapshotDate);
  const positiveSnapshotRows = mapSnapshotSourceRows(snapshotRows);
  const scopedRows = snapshotRows.filter(isLikelyLabInventoryRow);
  const labScopedRows = mapSnapshotSourceRows(scopedRows);
  const matchedRows = mapSnapshotSourceRows(scopedRows.filter(matchesAnyReagentKeyword));
  const sourceRows = scopedRows;

  if (sourceRows.length === 0) {
    throw new Error("No lab reagent rows matched the latest inventory snapshot.");
  }

  const allocation = allocateReagentRows(sourceRows);

  const claimedRows = new Set<number>();
  const reagents = REAGENT_CONFIGS.map((config) => {
    const matchedRows = sourceRows.filter((row, index) => {
      if (claimedRows.has(index)) return false;
      if (!matchesReagentConfig(row, config.keywords)) return false;
      claimedRows.add(index);
      return true;
    });

    const currentStock = Number(
      matchedRows
        .reduce((sum, row) => sum + toNumber(row.current_stock), 0)
        .toFixed(1),
    );
    const unit =
      matchedRows.find((row) => row.unit && row.unit.trim())?.unit?.trim() ||
      config.unitFallback ||
      "hộp";

    return {
      key: config.key,
      name: config.name,
      currentStock,
      targetStock: config.targetStock,
      unit,
      status: getReagentStatus(currentStock, config.targetStock),
    } satisfies LabDashboardReagent;
  });

  return {
    reagents: allocation.reagents,
    detailRows: allocation.detailRows,
    snapshotDate,
    positiveSnapshotRows,
    labScopedRows,
    matchedRows,
    freshness: buildFreshness("supabase", generatedAt, snapshotDate),
  };
}

async function buildReagents(generatedAt: string): Promise<ReagentsResult> {
  const result = await buildReagentSummary(generatedAt);
  return {
    reagents: result.reagents,
    freshness: result.freshness,
  };
}

function errorMessageFor(reason: unknown, fallback: string): string {
  if (reason instanceof Error && reason.message.trim()) {
    return reason.message;
  }

  return fallback;
}

function buildMeta(generatedAt: string, asOfDate: string): LabDashboardMeta {
  return {
    generatedAt,
    asOfDate,
    source: "live",
    sectionFreshness: {
      queue: buildFreshness("his", generatedAt, asOfDate),
      tat: buildFreshness("his", generatedAt, asOfDate),
      abnormal: buildFreshness("his", generatedAt, asOfDate),
      reagents: buildFreshness("supabase", generatedAt),
    },
  };
}

function buildDetailTitle(section: string, focus: string): string {
  if (section === "queue") {
    if (focus === "waiting") return "Chi tiết hàng chờ lấy mẫu";
    if (focus === "processing") return "Chi tiết mẫu đang xử lý";
    return "Chi tiết mẫu đã hoàn thành";
  }

  if (section === "tat") {
    if (focus === "average") return "Chi tiết TAT trung bình";
    if (focus === "median") return "Chi tiết TAT trung vị";
    if (focus === "requested_to_processing") return "Chi tiết tiếp nhận → xử lý";
    if (focus === "processing_to_result") return "Chi tiết xử lý → trả kết quả";
    return `Chi tiết TAT nhóm ${focus.replace(/^type:/, "").replace(/-/g, " ")}`;
  }

  if (section === "abnormal") {
    return "Chi tiết kết quả bất thường";
  }

  return focus === "all"
    ? "Chi tiết tồn kho khoa xét nghiệm"
    : `Chi tiết tồn kho ${focus.replace(/^reagent:/, "").replace(/-/g, " ")}`;
}

function buildDetailDescription(section: string, focus: string): string {
  if (section === "queue") {
    if (focus === "waiting") return "Danh sách hồ sơ gốc chưa có mốc xử lý hoặc kết quả.";
    if (focus === "processing") return "Danh sách hồ sơ đã có mốc xử lý nhưng chưa có kết quả cuối.";
    return "Danh sách hồ sơ đã có kết quả trong ngày dữ liệu.";
  }

  if (section === "tat") {
    if (focus.startsWith("type:")) {
      return "Các hồ sơ đã hoàn thành của nhóm xét nghiệm được chọn, sắp theo thời gian xử lý dài nhất.";
    }
    if (focus === "requested_to_processing") {
      return "Các hồ sơ đã hoàn thành trong ngày, sắp theo thời gian từ tiếp nhận đến lúc bắt đầu xử lý.";
    }
    if (focus === "processing_to_result") {
      return "Các hồ sơ đã hoàn thành trong ngày, sắp theo thời gian từ xử lý đến lúc trả kết quả.";
    }
    return "Các hồ sơ đã hoàn thành trong ngày, sắp theo tổng TAT dài nhất.";
  }

  if (section === "abnormal") {
    return "Toàn bộ kết quả có cờ ngoài khoảng tham chiếu trong ngày dữ liệu.";
  }

  return "Các dòng tồn kho snapshot đang đóng góp vào số liệu tồn kho của khoa xét nghiệm.";
}

function buildDetailMeta(
  generatedAt: string,
  asOfDate: string,
  section: LabDashboardDetailQuery["section"],
  focus: LabDashboardDetailQuery["focus"],
  sourceDetails: LabDashboardDetailSourceInfo[],
): LabDashboardDetailMeta {
  return {
    generatedAt,
    asOfDate,
    section,
    focus,
    title: buildDetailTitle(section, focus),
    description: buildDetailDescription(section, focus),
    sourceDetails,
  };
}

async function loadQueueDetail(
  asOfDate: string,
  generatedAt: string,
  focus: LabDashboardQueueFocus,
): Promise<{ rows: LabDashboardDetailRow[]; sourceInfo: LabDashboardDetailSourceInfo }> {
  const freshness = buildFreshness("his", generatedAt, asOfDate);
  let timelineRows: LabDashboardTimelineDetailInput[] = [];
  let rows: LabDashboardQueueDetailRow[] = [];

  try {
    timelineRows = await fetchTimelineDetailRows(asOfDate);
    rows = buildQueueDetailRows(timelineRows, focus);
    return {
      rows,
      sourceInfo: buildQueueSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus,
        timelineRows,
        displayedRows: rows,
      }),
    };
  } catch (error) {
    const message = errorMessageFor(error, "Unable to load queue detail rows.");
    logger.error("Lab dashboard queue detail failed", error);
    return {
      rows,
      sourceInfo: buildQueueSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus,
        timelineRows,
        displayedRows: rows,
        error: message,
      }),
    };
  }
}

async function loadTatDetail(
  asOfDate: string,
  generatedAt: string,
  focus: LabDashboardTatFocus,
): Promise<{ rows: LabDashboardDetailRow[]; sourceInfo: LabDashboardDetailSourceInfo }> {
  const freshness = buildFreshness("his", generatedAt, asOfDate);
  let timelineRows: LabDashboardTimelineDetailInput[] = [];
  let rows: LabDashboardTatDetailRow[] = [];

  try {
    timelineRows = await fetchTimelineDetailRows(asOfDate);
    rows = buildTatDetailRows(timelineRows, focus);
    return {
      rows,
      sourceInfo: buildTatSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus,
        timelineRows: timelineRows as LabDashboardTimelineProvenanceRow[],
        displayedRows: rows,
      }),
    };
  } catch (error) {
    const message = errorMessageFor(error, "Unable to load TAT detail rows.");
    logger.error("Lab dashboard tat detail failed", error);
    return {
      rows,
      sourceInfo: buildTatSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus,
        timelineRows: timelineRows as LabDashboardTimelineProvenanceRow[],
        displayedRows: rows,
        error: message,
      }),
    };
  }
}

async function loadAbnormalDetail(
  asOfDate: string,
  generatedAt: string,
): Promise<{ rows: LabDashboardDetailRow[]; sourceInfo: LabDashboardDetailSourceInfo }> {
  const freshness = buildFreshness("his", generatedAt, asOfDate);
  let rows: LabDashboardAbnormalDetailRow[] = [];

  try {
    rows = await buildAbnormalDetailRows(asOfDate, generatedAt);
    return {
      rows,
      sourceInfo: buildAbnormalSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus: "all",
        abnormalRows: rows,
        displayedRows: rows,
      }),
    };
  } catch (error) {
    const message = errorMessageFor(error, "Unable to load abnormal detail rows.");
    logger.error("Lab dashboard abnormal detail failed", error);
    return {
      rows,
      sourceInfo: buildAbnormalSourceProvenance({
        asOfDate,
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        focus: "all",
        abnormalRows: rows,
        displayedRows: rows,
        error: message,
      }),
    };
  }
}

async function loadReagentDetail(
  generatedAt: string,
  focus: LabDashboardReagentFocus,
): Promise<{ rows: LabDashboardDetailRow[]; sourceInfo: LabDashboardDetailSourceInfo }> {
  const freshness = buildFreshness("supabase", generatedAt);
  let snapshotDate = freshness.dataDate || "";
  let positiveSnapshotRows: LabDashboardReagentSnapshotSourceRow[] = [];
  let labScopedRows: LabDashboardReagentSnapshotSourceRow[] = [];
  let matchedRows: LabDashboardReagentSnapshotSourceRow[] = [];
  let claimedRows: LabDashboardReagentDetailRow[] = [];
  let rows: LabDashboardReagentDetailRow[] = [];

  try {
    const result = await buildReagentSummary(generatedAt);
    snapshotDate = result.snapshotDate;
    positiveSnapshotRows = result.positiveSnapshotRows;
    labScopedRows = result.labScopedRows;
    matchedRows = result.matchedRows;
    claimedRows = result.detailRows;
    rows = buildReagentDetailRows(result.detailRows, focus);
    return {
      rows,
      sourceInfo: buildReagentSourceProvenance({
        generatedAt: result.freshness.generatedAt,
        dataDate: result.freshness.dataDate,
        snapshotDate: result.snapshotDate,
        focus,
        positiveSnapshotRows: result.positiveSnapshotRows,
        labScopedRows: result.labScopedRows,
        matchedRows: result.matchedRows,
        claimedRows: result.detailRows,
        displayedRows: rows,
        claimOrder: REAGENT_CONFIGS.map((config) => config.key),
        claimOrderDisplayLabels: REAGENT_CONFIGS.map((config) => config.name),
      }),
    };
  } catch (error) {
    const message = errorMessageFor(error, "Unable to load reagent detail rows.");
    logger.error("Lab dashboard reagent detail failed", error);
    return {
      rows,
      sourceInfo: buildReagentSourceProvenance({
        generatedAt: freshness.generatedAt,
        dataDate: freshness.dataDate,
        snapshotDate,
        focus,
        positiveSnapshotRows,
        labScopedRows,
        matchedRows,
        claimedRows,
        displayedRows: rows,
        claimOrder: REAGENT_CONFIGS.map((config) => config.key),
        claimOrderDisplayLabels: REAGENT_CONFIGS.map((config) => config.name),
        error: message,
      }),
    };
  }
}

export async function getLabDashboardCurrent(asOfDate: string = toHoChiMinhDate()): Promise<LabDashboardPayload> {
  const generatedAt = new Date().toISOString();
  const meta = buildMeta(generatedAt, asOfDate);
  const sectionErrors: Record<string, string> = {};

  const [queueTatResult, abnormalResult, reagentsResult] = await Promise.allSettled([
    buildQueueAndTat(asOfDate, generatedAt),
    buildAbnormal(asOfDate, generatedAt),
    buildReagents(generatedAt),
  ]);

  let queue = buildDefaultQueue();
  let tat = buildDefaultTat();
  let abnormal = buildDefaultAbnormal();
  let reagents = buildDefaultReagents();

  if (queueTatResult.status === "fulfilled") {
    queue = queueTatResult.value.queue;
    tat = queueTatResult.value.tat;
    meta.sectionFreshness.queue = queueTatResult.value.freshness.queue;
    meta.sectionFreshness.tat = queueTatResult.value.freshness.tat;
  } else {
    const message = errorMessageFor(queueTatResult.reason, "Unable to load lab workflow metrics.");
    logger.error("Lab dashboard queue/TAT section failed", queueTatResult.reason);
    sectionErrors.queue = message;
    sectionErrors.tat = message;
  }

  if (abnormalResult.status === "fulfilled") {
    abnormal = abnormalResult.value.abnormal;
    meta.sectionFreshness.abnormal = abnormalResult.value.freshness;
  } else {
    const message = errorMessageFor(abnormalResult.reason, "Unable to load abnormal lab results.");
    logger.error("Lab dashboard abnormal section failed", abnormalResult.reason);
    sectionErrors.abnormal = message;
  }

  if (reagentsResult.status === "fulfilled") {
    reagents = reagentsResult.value.reagents;
    meta.sectionFreshness.reagents = reagentsResult.value.freshness;
  } else {
    const message = errorMessageFor(reagentsResult.reason, "Unable to load lab reagent inventory.");
    logger.error("Lab dashboard reagents section failed", reagentsResult.reason);
    sectionErrors.reagents = message;
  }

  if (Object.keys(sectionErrors).length > 0) {
    meta.sectionErrors = sectionErrors;
  }

  return {
    meta,
    queue,
    tat,
    abnormal,
    reagents,
  };
}

export async function getLabDashboardDetails(query: LabDashboardDetailQuery): Promise<LabDashboardDetailPayload> {
  const asOfDate = query.asOfDate || toHoChiMinhDate();
  const generatedAt = new Date().toISOString();

  if (query.section === "queue") {
    const result = await loadQueueDetail(asOfDate, generatedAt, query.focus as LabDashboardQueueFocus);
    return {
      meta: buildDetailMeta(generatedAt, asOfDate, query.section, query.focus, [result.sourceInfo]),
      rows: result.rows,
    };
  }

  if (query.section === "tat") {
    const result = await loadTatDetail(asOfDate, generatedAt, query.focus as LabDashboardTatFocus);
    return {
      meta: buildDetailMeta(generatedAt, asOfDate, query.section, query.focus, [result.sourceInfo]),
      rows: result.rows,
    };
  }

  if (query.section === "abnormal") {
    const result = await loadAbnormalDetail(asOfDate, generatedAt);
    return {
      meta: buildDetailMeta(generatedAt, asOfDate, query.section, query.focus, [result.sourceInfo]),
      rows: result.rows,
    };
  }

  const result = await loadReagentDetail(generatedAt, query.focus as LabDashboardReagentFocus);
  return {
    meta: buildDetailMeta(generatedAt, asOfDate, query.section, query.focus, [result.sourceInfo]),
    rows: result.rows,
  };
}
