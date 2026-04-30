/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { hisPool } from "../../db/his";
import { WeeklyReportServiceMapping, WeeklyReportStatItem } from "../types";

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

function normalizeMatchText(value: string): string {
  return value.normalize("NFC").toLocaleLowerCase();
}

function matchesServiceMapping(serviceName: string, mapping: WeeklyReportServiceMapping): boolean {
  if (mapping.match_type === "exact") {
    return serviceName === mapping.match_value;
  }

  if (mapping.match_type === "contains") {
    return normalizeMatchText(serviceName).includes(normalizeMatchText(mapping.match_value));
  }

  if (mapping.match_type === "starts_with") {
    return normalizeMatchText(serviceName).startsWith(normalizeMatchText(mapping.match_value));
  }

  if (mapping.match_type === "regex") {
    return new RegExp(mapping.match_value, "i").test(serviceName);
  }

  return false;
}

export async function getExaminationStats(
  startDate: Date,
  endDate: Date,
  prevStartDate: Date,
  prevEndDate: Date,
  mappings: WeeklyReportServiceMapping[],
): Promise<WeeklyReportStatItem[]> {
  const { rows } = await hisPool.query<{
    servicename: string;
    current_count: string;
    prev_count: string;
  }>(
    `
      SELECT
        sd.servicename,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) AS current_count,
        COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) AS prev_count
      FROM tb_servicedata sd
      JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
      WHERE sd.servicedatausedate BETWEEN $3 AND $2
        AND sd.dm_servicegroupid = 1
        AND pr.dm_patientobjectid != 3
      GROUP BY sd.servicename
    `,
    [startDate, endDate, prevStartDate, prevEndDate],
  );

  const activeMappings = mappings
    .filter((item) => item.is_active && item.display_group === "kham_benh")
    .sort((a, b) => a.display_order - b.display_order);

  const stats: Record<string, WeeklyReportStatItem> = {};
  for (const mapping of activeMappings) {
    stats[mapping.category_key] = {
      key: mapping.category_key,
      name: mapping.category_name_vi,
      current: 0,
      previous: 0,
      is_bhyt: mapping.category_name_vi.includes("BHYT"),
    };
  }

  for (const row of rows) {
    for (const mapping of activeMappings) {
      const serviceName = row.servicename || "";
      const matched = matchesServiceMapping(serviceName, mapping);

      if (!matched) continue;

      stats[mapping.category_key].current += toCount(row.current_count);
      stats[mapping.category_key].previous += toCount(row.prev_count);
      break;
    }
  }

  return Object.values(stats);
}

