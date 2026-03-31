// Script to find transfer column values and domain table
import 'dotenv/config';
import { Pool } from 'pg';

const hisPool = new Pool({
    connectionString: process.env.HIS_DATABASE_URL,
});

async function findTransferValues() {
    console.log('=== Finding Transfer Values ===\n');

    try {
        // Step 1: Find the transfer patients by name on 05/01/2026
        console.log('1. Looking for transfer patients on 05/01/2026...\n');

        const findQuery = `
            SELECT 
                patientrecordid,
                patientcode,
                patientname,
                receptiondate,
                dm_ketquadieutriid,
                dm_hinhthucravienid,
                mabenhvienchuyendi,
                chuyentuyen_so,
                chuyentuyen_sohoso
            FROM tb_patientrecord
            WHERE receptiondate >= '2026-01-05' AND receptiondate < '2026-01-06'
            ORDER BY receptiondate
            LIMIT 30;
        `;

        const { rows: patients } = await hisPool.query(findQuery);

        console.log('Patients on 05/01/2026:');
        for (const p of patients) {
            console.log(`  ${p.patientcode} - ${p.patientname}`);
            console.log(`    dm_ketquadieutriid: ${p.dm_ketquadieutriid}`);
            console.log(`    dm_hinhthucravienid: ${p.dm_hinhthucravienid}`);
            console.log(`    mabenhvienchuyendi: ${p.mabenhvienchuyendi}`);
            console.log(`    chuyentuyen_so: ${p.chuyentuyen_so}`);
            console.log('');
        }

        // Step 2: Check dm_hinhthucravien domain table
        console.log('\n2. Checking dm_hinhthucravien table...\n');

        try {
            const dmHinhThucQuery = `SELECT * FROM dm_hinhthucravien ORDER BY dm_hinhthucravienid LIMIT 20;`;
            const { rows: hinhthuc } = await hisPool.query(dmHinhThucQuery);
            console.log('dm_hinhthucravien values:');
            console.log(JSON.stringify(hinhthuc, null, 2));
        } catch (e) {
            console.log('dm_hinhthucravien table not found');
        }

        // Step 3: Check dm_ketquadieutri domain table
        console.log('\n3. Checking dm_ketquadieutri table...\n');

        try {
            const dmKetQuaQuery = `SELECT * FROM dm_ketquadieutri ORDER BY dm_ketquadieutriid LIMIT 20;`;
            const { rows: ketqua } = await hisPool.query(dmKetQuaQuery);
            console.log('dm_ketquadieutri values:');
            console.log(JSON.stringify(ketqua, null, 2));
        } catch (e) {
            console.log('dm_ketquadieutri table not found');
        }

        // Step 4: Find patients with transfer info (mabenhvienchuyendi not null)
        console.log('\n4. Finding patients with mabenhvienchuyendi (transfer hospital code)...\n');

        const transferQuery = `
            SELECT 
                patientrecordid,
                patientcode,
                patientname,
                receptiondate,
                dm_ketquadieutriid,
                dm_hinhthucravienid,
                mabenhvienchuyendi,
                chuyentuyen_so
            FROM tb_patientrecord
            WHERE mabenhvienchuyendi IS NOT NULL 
            AND mabenhvienchuyendi != ''
            AND receptiondate >= '2026-01-01'
            ORDER BY receptiondate DESC
            LIMIT 20;
        `;

        const { rows: transfers } = await hisPool.query(transferQuery);
        console.log(`Found ${transfers.length} patients with transfer hospital code:`);
        for (const t of transfers) {
            console.log(`  ${t.patientcode} - ${t.patientname}`);
            console.log(`    Hospital Code: ${t.mabenhvienchuyendi}`);
            console.log(`    dm_hinhthucravienid: ${t.dm_hinhthucravienid}`);
            console.log(`    dm_ketquadieutriid: ${t.dm_ketquadieutriid}`);
            console.log('');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await hisPool.end();
    }
}

findTransferValues()
    .then(() => {
        console.log('\n=== Search Complete ===');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal:', error);
        process.exit(1);
    });
