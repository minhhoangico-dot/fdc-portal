
import { queryHis } from '@/lib/db/his-client';
import { StatItem } from './examination';

// CDHA subgroup IDs
const SUBGROUP = {
  XQUANG: 401,
  SIEU_AM: 402,
  NOI_SOI: 403,
  DIEN_TIM: 404
};

export async function getImagingStats(startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date) {
  // Use dm_servicegroupid = 4 for Chẩn đoán hình ảnh
  // Categorize by subgroup ID AND patient object
  const sql = `
    SELECT 
      CASE 
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.XQUANG} THEN 
          CASE WHEN pr.dm_patientobjectid = 1 THEN 'xquang_bhyt' ELSE 'xquang_dv' END
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.SIEU_AM} THEN 
          CASE WHEN pr.dm_patientobjectid = 1 THEN 'sieu_am_bhyt' ELSE 'sieu_am_dv' END
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.NOI_SOI} THEN 'noi_soi'
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.DIEN_TIM} THEN 'dien_tim'
        ELSE 'cdha_khac'
      END as category,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) as current_count,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) as prev_count
    FROM tb_servicedata sd
    JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
    WHERE sd.servicedatausedate BETWEEN $3 AND $2
      AND sd.dm_servicegroupid = 4
      AND pr.dm_patientobjectid != 3
    GROUP BY 1
  `;

  const { rows } = await queryHis(sql, [startDate, endDate, prevStartDate, prevEndDate]);

  const result: Record<string, StatItem> = {
    xquang_dv: { key: 'xquang_dv', name: 'X-quang dịch vụ', current: 0, previous: 0, is_bhyt: false },
    xquang_bhyt: { key: 'xquang_bhyt', name: 'X-quang BHYT', current: 0, previous: 0, is_bhyt: true },
    sieu_am_dv: { key: 'sieu_am_dv', name: 'Siêu âm dịch vụ', current: 0, previous: 0, is_bhyt: false },
    sieu_am_bhyt: { key: 'sieu_am_bhyt', name: 'Siêu âm BHYT', current: 0, previous: 0, is_bhyt: true },
    noi_soi: { key: 'noi_soi', name: 'Nội soi', current: 0, previous: 0, is_bhyt: false },
    dien_tim: { key: 'dien_tim', name: 'Điện tim', current: 0, previous: 0, is_bhyt: false },
    cdha_khac: { key: 'cdha_khac', name: 'CĐHA khác', current: 0, previous: 0, is_bhyt: false }
  };

  for (const row of rows) {
    const key = row.category as keyof typeof result;
    if (result[key]) {
      result[key].current = parseInt(row.current_count);
      result[key].previous = parseInt(row.prev_count);
    }
  }

  return Object.values(result);
}
