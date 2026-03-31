import { queryHis } from '../lib/db/his-client';

// Based on the transfer forms:
// Patient 1: NGUYEN THI DUNG - transferred to Bệnh viện 198
// Patient 2: NGUYEN VAN KHUONG - transferred to Bệnh viện Tim Hà Nội
// Both dated 05/01/2026

async function checkTransferData() {
    try {
        // First, let's check what columns exist in tb_patientrecord
        console.log('Checking tb_patientrecord structure...');
        const structureQuery = `
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tb_patientrecord'
            AND (
                column_name ILIKE '%result%'
                OR column_name ILIKE '%outcome%'
                OR column_name ILIKE '%transfer%'
                OR column_name ILIKE '%discharge%'
                OR column_name ILIKE '%chuyen%'
            )
            ORDER BY ordinal_position;
        `;

        const { rows: columns } = await queryHis(structureQuery, []);
        console.log('Relevant columns:', columns);

        // Try to find patients discharged in early January 2026
        console.log('\nSearching for recent discharges...');
        const dischargeQuery = `
            SELECT 
                patientcode,
                patientname,
                receptiondate,
                dischargedate
            FROM tb_patientrecord
            WHERE dischargedate >= '2026-01-01'
            AND dischargedate <= '2026-01-10'
            ORDER BY dischargedate DESC
            LIMIT 20;
        `;

        const { rows: patients } = await queryHis(dischargeQuery, []);
        console.log('Recent discharges:', JSON.stringify(patients, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

checkTransferData()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal:', error);
        process.exit(1);
    });
