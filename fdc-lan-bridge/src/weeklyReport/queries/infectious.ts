/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dayjs from "dayjs";
import { hisPool } from "../../db/his";
import { WeeklyReportAgeGroups, WeeklyReportInfectiousCode, WeeklyReportInfectiousStat } from "../types";

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

function buildEmptyAgeGroups(): WeeklyReportAgeGroups {
  return {
    age_0_2: 0,
    age_3_12: 0,
    age_13_18: 0,
    age_18_50: 0,
    age_over_50: 0,
  };
}

function matchesLikePattern(text: string, pattern: string): boolean {
  const regex = new RegExp(
    `^${pattern.replace(/[%_]/g, (token) => (token === "%" ? ".*" : "."))}$`,
    "i",
  );
  return regex.test(text);
}

export async function getInfectiousStats(
  startDate: Date,
  endDate: Date,
  codes: WeeklyReportInfectiousCode[],
): Promise<WeeklyReportInfectiousStat[]> {
  const activeCodes = codes
    .filter((item) => item.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  const patterns = activeCodes.map((item) => item.icd_pattern);

  if (patterns.length === 0) return [];

  const previousEnd = dayjs(startDate).subtract(1, "day").endOf("day").toDate();
  const previousStart = dayjs(startDate).subtract(30, "day").startOf("day").toDate();
  const lastYearStart = dayjs(startDate).subtract(1, "year").toDate();
  const lastYearEnd = dayjs(endDate).subtract(1, "year").toDate();

  const { rows } = await hisPool.query<{
    period: "current" | "previous" | "last_year";
    chandoanbandau_icd10: string;
    case_count: string;
    age_0_2: string;
    age_3_12: string;
    age_13_18: string;
    age_18_50: string;
    age_over_50: string;
  }>(
    `
      WITH periods AS (
        SELECT 'current' AS period, $1::timestamp AS start_date, $2::timestamp AS end_date
        UNION ALL
        SELECT 'previous', $3::timestamp, $4::timestamp
        UNION ALL
        SELECT 'last_year', $5::timestamp, $6::timestamp
      )
      SELECT
        p.period,
        mk.chandoanbandau_icd10,
        COUNT(*) AS case_count,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) <= 2) AS age_0_2,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) BETWEEN 3 AND 12) AS age_3_12,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) BETWEEN 13 AND 18) AS age_13_18,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) BETWEEN 19 AND 50) AS age_18_50,
        COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) > 50) AS age_over_50
      FROM periods p
      JOIN tb_patientrecord pr ON pr.receptiondate BETWEEN p.start_date AND p.end_date
      JOIN tb_medicalrecord_khambenh mk ON mk.medicalrecordid = pr.medicalrecordid_kb
      WHERE mk.chandoanbandau_icd10 LIKE ANY ($7)
      GROUP BY p.period, mk.chandoanbandau_icd10
    `,
    [startDate, endDate, previousStart, previousEnd, lastYearStart, lastYearEnd, patterns],
  );

  const statsMap = new Map<string, WeeklyReportInfectiousStat>();
  const codeKeyMap = new Map<string, string>();

  for (const code of activeCodes) {
    const key = code.disease_group === "rsv" ? "group_rsv" : code.icd_code;
    const diseaseName = code.disease_group === "rsv" ? "Benh do virus RSV" : code.disease_name_vi;

    codeKeyMap.set(code.icd_code, key);
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        icd_code: key,
        disease_name: diseaseName,
        group: code.disease_group,
        periods: { current: 0, previous: 0, last_year: 0 },
        age_groups: buildEmptyAgeGroups(),
      });
    }
  }

  for (const row of rows) {
    const icd = row.chandoanbandau_icd10 || "";
    for (const code of activeCodes) {
      if (!matchesLikePattern(icd, code.icd_pattern)) continue;

      const key = codeKeyMap.get(code.icd_code);
      if (!key) continue;
      const stat = statsMap.get(key);
      if (!stat) continue;

      const rowCount = toCount(row.case_count);
      if (row.period === "previous") {
        stat.periods.previous += rowCount;
      } else {
        stat.periods[row.period] += rowCount;
      }

      if (row.period === "current") {
        stat.age_groups.age_0_2 += toCount(row.age_0_2);
        stat.age_groups.age_3_12 += toCount(row.age_3_12);
        stat.age_groups.age_13_18 += toCount(row.age_13_18);
        stat.age_groups.age_18_50 += toCount(row.age_18_50);
        stat.age_groups.age_over_50 += toCount(row.age_over_50);
      }

      break;
    }
  }

  for (const stat of statsMap.values()) {
    if (stat.periods.previous > 0) {
      stat.periods.previous = Number((stat.periods.previous / 4.28).toFixed(1));
    }
  }

  return Array.from(statsMap.values());
}

