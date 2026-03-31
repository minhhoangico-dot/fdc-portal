import { queryHis } from '../lib/db/his-client';

async function findTransferPatients() {
    console.log('=== Finding Transfer Patients ===\n');

    // Patient 1: NGUYEN THI DUNG - Bệnh viện 198 (Bộ Công An)
    // Số: 000002/2026/PCCSKBCB
    // Ngày: 05/01/2026

    // Patient 2: NGUYEN VAN KHUONG - Bệnh viện Tim Hà Nội
    // Số: 000001/2026/PCCSKBCB  
    // Ngày: 05/01/2026

    console.log('1. Searching for patients by name and date...');
    const searchQuery = `
        SELECT 
            pr.patientrecordid,
            pr.patientcode,
            pr.patientname,
            pr.receptiondate,
            pr.dischargedate,
            pr.dm_treatmentresultid,
            pr.dm_patientobjectid,
            pr.*
        FROM tb_patientrecord pr
        WHERE (
            pr.patientname ILIKE '%NGUYEN THI DUNG%'
            OR pr.patientname ILIKE '%NGUYEN VAN KHUONG%'
        )
        AND pr.receptiondate >= '2026-01-01'
        ORDER BY pr.receptiondate DESC
        LIMIT 10;
    `;

    try {
        const { rows: patients } = await queryHis(searchQuery, []);
        console.log('Found patients:', JSON.stringify(patients, null, 2));

        if (patients.length > 0) {
            console.log('\n2. Checking column names in tb_patientrecord:');
            const firstPatient = patients[0];
            console.log('Available columns:', Object.keys(firstPatient));

            // Check for transfer-related fields
            console.log('\n3. Transfer-related field values:');
            for (const patient of patients) {
                console.log(`\nPatient: ${patient.patientname}`);
                console.log(`  Reception: ${patient.receptiondate}`);
                console.log(`  Discharge: ${patient.dischargedate}`);
                console.log(`  Treatment Result ID: ${patient.dm_treatmentresultid}`);
                console.log(`  Patient Object ID: ${patient.dm_patientobjectid}`);
            }
        }

        // Check domain table for treatment results
        console.log('\n4. Checking domain table for treatment results:');
        const dmQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'dm_%treatment%'
            ORDER BY table_name;
        `;

        const { rows: dmTables } = await queryHis(dmQuery, []);
        console.log('Treatment-related domain tables:', dmTables);

        if (dmTables.length > 0) {
            for (const table of dmTables) {
                console.log(`\n5. Checking ${table.table_name}:`);
                const dataQuery = `SELECT * FROM ${table.table_name} LIMIT 20;`;
                const { rows: data } = await queryHis(dataQuery, []);
                console.log(JSON.stringify(data, null, 2));
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

findTransferPatients()
    .then(() => {
        console.log('\n=== Search Complete ===');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
