
import { queryHis } from '@/lib/db/his-client';
import prisma from '@/lib/db/app-client';
import { subDays, subYears, format } from 'date-fns';

export interface InfectiousStat {
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

export async function getInfectiousStats(startDate: Date, endDate: Date) {
    // 1. Get periods
    // Current: This week (startDate -> endDate)
    const currentStart = startDate;
    const currentEnd = endDate;

    // Previous: Last 30 days (for weekly average calculation)
    const prevEnd = subDays(startDate, 1);
    const prevStart = subDays(startDate, 30);

    // Last Year: Same week last year
    const lastYearStart = subYears(startDate, 1);
    const lastYearEnd = subYears(endDate, 1);

    // 2. Get configured codes
    const codes = await prisma.wcrInfectiousCode.findMany({
        where: { is_active: true },
        orderBy: { display_order: 'asc' }
    });

    const patterns = codes.map(c => c.icd_pattern);
    if (patterns.length === 0) return [];

    const sql = `
    WITH periods AS (
      SELECT 'current' as period, $1::date as start_date, $2::date as end_date
      UNION ALL
      SELECT 'previous', $3::date, $4::date
      UNION ALL
      SELECT 'last_year', $5::date, $6::date
    )
    SELECT 
      p.period,
      mk.chandoanbandau_icd10,
      COUNT(*) as case_count,
      COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) <= 2) as age_0_2,
      COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) BETWEEN 3 AND 12) as age_3_12,
      COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) BETWEEN 13 AND 18) as age_13_18,
      COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) BETWEEN 19 AND 50) as age_18_50,
      COUNT(*) FILTER (WHERE (EXTRACT(YEAR FROM pr.receptiondate) - pr.birthdayyear) > 50) as age_over_50
    FROM periods p
    JOIN tb_patientrecord pr ON pr.receptiondate BETWEEN p.start_date AND p.end_date
    JOIN tb_medicalrecord_khambenh mk ON mk.medicalrecordid = pr.medicalrecordid_kb
    WHERE 
      mk.chandoanbandau_icd10 LIKE ANY ($7)
    GROUP BY p.period, mk.chandoanbandau_icd10
  `;

    const { rows } = await queryHis(sql, [
        currentStart, currentEnd,
        prevStart, prevEnd,
        lastYearStart, lastYearEnd,
        patterns
    ]);

    // 3. Map results
    const statsMap = new Map<string, InfectiousStat>();
    const codeToKeyMap = new Map<string, string>(); // Maps config icd_code -> statsMap key

    // Initialize
    for (const c of codes) {
        let key = c.icd_code;
        let name = c.disease_name_vi;

        // Custom Merge Logic for RSV
        if (c.disease_group === 'rsv') {
            key = 'group_rsv';
            name = 'Bệnh do virus RSV';
        }

        codeToKeyMap.set(c.icd_code, key);

        if (!statsMap.has(key)) {
            statsMap.set(key, {
                icd_code: key,
                disease_name: name,
                group: c.disease_group,
                periods: { current: 0, previous: 0, last_year: 0 },
                age_groups: { age_0_2: 0, age_3_12: 0, age_13_18: 0, age_18_50: 0, age_over_50: 0 }
            });
        }
    }

    for (const row of rows) {
        const period = row.period as 'current' | 'previous' | 'last_year';
        const icd10 = row.chandoanbandau_icd10;

        for (const c of codes) {
            if (matchesPattern(icd10, c.icd_pattern)) {

                const key = codeToKeyMap.get(c.icd_code);
                if (!key) continue;

                const stat = statsMap.get(key)!;
                const count = parseInt(row.case_count);

                if (period === 'previous') {
                    // Weekly Average for Previous Month (30 days / 7 ≈ 4.28)
                    // We sum raw counts here, then divide later? 
                    // No, simpler to just add raw here and then property accessor? 
                    // Wait, stat.periods.previous is a number. 
                    // We should add float? Recharts handles floats.
                    // But we iterate multiple rows (group by period, icd).
                    // We must sum raw first.
                    stat.periods.previous += count;
                } else {
                    stat.periods[period] += count; // Week counts
                }

                if (period === 'current') {
                    stat.age_groups.age_0_2 += parseInt(row.age_0_2);
                    stat.age_groups.age_3_12 += parseInt(row.age_3_12);
                    stat.age_groups.age_13_18 += parseInt(row.age_13_18);
                    stat.age_groups.age_18_50 += parseInt(row.age_18_50);
                    stat.age_groups.age_over_50 += parseInt(row.age_over_50);
                }
                break;
            }
        }
    }

    // Post-processing for Averages
    for (const stat of statsMap.values()) {
        // Divide previous (30 days sum) by 4.28 to get Weekly Average
        if (stat.periods.previous > 0) {
            stat.periods.previous = parseFloat((stat.periods.previous / 4.28).toFixed(1));
        }
    }

    return Array.from(statsMap.values());
}

function matchesPattern(text: string, pattern: string): boolean {
    // Convert SQL LIKE pattern to Regex
    // J09% -> ^J09.*
    const regex = new RegExp('^' + pattern.replace(/%/g, '.*'), 'i');
    return regex.test(text);
}
