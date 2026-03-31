
import { queryHis } from '@/lib/db/his-client';
import prisma from '@/lib/db/app-client';

export interface StatItem {
  key: string;
  name: string;
  current: number;
  previous: number;
  is_bhyt: boolean;
}

export async function getExaminationStats(startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date) {
  // Get mappings for "kham_benh" sub-categories
  const mappings = await prisma.wcrServiceMapping.findMany({
    where: { display_group: 'kham_benh', is_active: true },
    orderBy: { display_order: 'asc' }
  });

  // Use dm_servicegroupid = 1 for Khám bệnh
  // Exclude dm_patientobjectid = 3 (Yêu cầu)
  const sql = `
    SELECT 
      sd.servicename,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) as current_count,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) as prev_count
    FROM tb_servicedata sd
    JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
    WHERE sd.servicedatausedate BETWEEN $3 AND $2 
      AND sd.dm_servicegroupid = 1
      AND pr.dm_patientobjectid != 3
    GROUP BY sd.servicename
  `;

  const { rows } = await queryHis(sql, [startDate, endDate, prevStartDate, prevEndDate]);

  // Initialize stats from mappings
  const stats: Record<string, StatItem> = {};
  for (const m of mappings) {
    stats[m.category_key] = {
      key: m.category_key,
      name: m.category_name_vi,
      current: 0,
      previous: 0,
      is_bhyt: m.category_name_vi.includes('BHYT')
    };
  }

  // Aggregate by matching service names to mappings
  for (const row of rows) {
    const serviceName = row.servicename as string;

    for (const m of mappings) {
      let matched = false;
      if (m.match_type === 'exact' && serviceName === m.match_value) matched = true;
      else if (m.match_type === 'contains' && serviceName.includes(m.match_value)) matched = true;
      else if (m.match_type === 'starts_with' && serviceName.startsWith(m.match_value)) matched = true;
      else if (m.match_type === 'regex' && new RegExp(m.match_value, 'i').test(serviceName)) matched = true;

      if (matched) {
        stats[m.category_key].current += parseInt(row.current_count);
        stats[m.category_key].previous += parseInt(row.prev_count);
        break; // Match first mapping only (priority order)
      }
    }
  }

  return Object.values(stats);
}
