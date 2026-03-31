
import { queryHis } from '@/lib/db/his-client';
import { StatItem } from './examination';

/**
 * Get hospital transfer statistics
 * Queries tb_patientrecord for patients transferred to other hospitals
 * 
 * Based on actual HIS data:
 * - dm_hinhthucravienid = 13 indicates "Chuyển viện" (hospital transfer)
 * - mabenhvienchuyendi contains the destination hospital code
 */
export async function getTransferStats(startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date) {
    // Query patient records with dm_hinhthucravienid = 13 (chuyển viện)
    // Using receptiondate for the date filter

    const sql = `
        SELECT 
            COUNT(*) FILTER (WHERE pr.receptiondate BETWEEN $1 AND $2) as current_count,
            COUNT(*) FILTER (WHERE pr.receptiondate BETWEEN $3 AND $4) as prev_count
        FROM tb_patientrecord pr
        WHERE pr.receptiondate BETWEEN $3 AND $2
            AND pr.dm_hinhthucravienid = 13  -- Chuyển viện
            AND pr.dm_patientobjectid != 3  -- Exclude "Yêu cầu"
    `;

    try {
        const { rows } = await queryHis(sql, [startDate, endDate, prevStartDate, prevEndDate]);

        const result: StatItem[] = [{
            key: 'chuyen_vien',
            name: 'Chuyển viện',
            current: parseInt(rows[0]?.current_count || '0'),
            previous: parseInt(rows[0]?.prev_count || '0'),
            is_bhyt: false
        }];

        return result;
    } catch (error) {
        console.error('Error fetching transfer stats:', error);
        // Return empty array on error to prevent dashboard from breaking
        return [];
    }
}
