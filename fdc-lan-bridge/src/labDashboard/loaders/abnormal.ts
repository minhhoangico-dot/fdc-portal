/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../../db/his";
import { logger } from "../../lib/logger";
import { buildAbnormalSourceProvenance } from "../sourceProvenance";
import {
  LabDashboardAbnormal,
  LabDashboardAbnormalDetailRow,
  LabDashboardAbnormalRow,
  LabDashboardAbnormalSeverity,
  LabDashboardDetailRow,
  LabDashboardDetailSourceInfo,
  LabDashboardSectionFreshness,
} from "../types";
import {
  buildFreshness,
  errorMessageFor,
  formatValueWithUnit,
  LAB_GROUP_ID,
  toNumber,
  VALID_TIMESTAMP,
} from "./shared";

const ABNORMAL_ROW_FETCH_LIMIT = 60;
const ABNORMAL_ROW_DISPLAY_LIMIT = 12;
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

type AbnormalSummaryResult = {
  abnormal: LabDashboardAbnormal;
  freshness: LabDashboardSectionFreshness;
};

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

export async function loadAbnormalSummary(asOfDate: string, generatedAt: string): Promise<AbnormalSummaryResult> {
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
    `,
    [asOfDate],
  );

  return result.rows
    .map((row) => ({
      kind: "abnormal" as const,
      patientCode: row.patientcode?.trim() || "Ẩn danh",
      testCode: row.test_code?.trim() || "XN",
      testName: row.test_name?.trim() || "Xét nghiệm",
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

export async function loadAbnormalDetail(
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

