
import { queryHis } from '@/lib/db/his-client';
import { StatItem } from './examination';

// Chuyên khoa subgroup IDs
const SUBGROUP = {
    TMH: 100000,
    TAI_NHA: 100004,
    THU_THUAT_DD: 501,
    VAC_XIN: 10001,
    NGOAI_BS: 100002,
    DV_CK: 504,
    SAN: 100003
};

export async function getSpecialistStats(startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date) {
    // Use dm_servicegroupid = 5 for Chuyên khoa
    // Categorize by subgroup ID AND patient object
    const sql = `
    SELECT 
      CASE 
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.TMH} THEN 
          CASE WHEN pr.dm_patientobjectid = 1 THEN 'tmh_bhyt' ELSE 'tmh_dv' END
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.TAI_NHA} THEN 'tai_nha'
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.THU_THUAT_DD} THEN 'thu_thuat_dd'
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.VAC_XIN} THEN 'vac_xin'
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.NGOAI_BS} THEN 'ngoai_bs'
        WHEN sd.dm_servicesubgroupid = ${SUBGROUP.SAN} THEN 'thu_thuat_san'
        ELSE 'ck_khac'
      END as category,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $1 AND $2) as current_count,
      COUNT(*) FILTER (WHERE sd.servicedatausedate BETWEEN $3 AND $4) as prev_count
    FROM tb_servicedata sd
    JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
    WHERE sd.servicedatausedate BETWEEN $3 AND $2
      AND sd.dm_servicegroupid = 5
      AND pr.dm_patientobjectid != 3
    GROUP BY 1
  `;

    const { rows } = await queryHis(sql, [startDate, endDate, prevStartDate, prevEndDate]);

    const result: Record<string, StatItem> = {
        tmh_dv: { key: 'tmh_dv', name: 'Thủ thuật TMH (DV)', current: 0, previous: 0, is_bhyt: false },
        tmh_bhyt: { key: 'tmh_bhyt', name: 'Thủ thuật TMH (BHYT)', current: 0, previous: 0, is_bhyt: true },
        tai_nha: { key: 'tai_nha', name: 'Tại nhà', current: 0, previous: 0, is_bhyt: false },
        thu_thuat_dd: { key: 'thu_thuat_dd', name: 'Thủ thuật [DD]', current: 0, previous: 0, is_bhyt: false },
        vac_xin: { key: 'vac_xin', name: 'Tiêm Vắc xin', current: 0, previous: 0, is_bhyt: false },
        ngoai_bs: { key: 'ngoai_bs', name: 'Thủ thuật Ngoại [BS]', current: 0, previous: 0, is_bhyt: false },
        thu_thuat_san: { key: 'thu_thuat_san', name: 'Thủ thuật Sản', current: 0, previous: 0, is_bhyt: false },
        ck_khac: { key: 'ck_khac', name: 'Chuyên khoa khác', current: 0, previous: 0, is_bhyt: false }
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
