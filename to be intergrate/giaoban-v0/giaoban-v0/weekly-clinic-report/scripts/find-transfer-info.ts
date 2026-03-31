// Script to find transfer patient details and identify the column containing transfer info
import 'dotenv/config';
import { Pool } from 'pg';

const hisPool = new Pool({
    connectionString: process.env.HIS_DATABASE_URL,
});

async function findTransferPatients() {
    console.log('=== Finding Transfer Patients ===\n');

    try {
        // Step 1: Find patients by name around date 05/01/2026
        console.log('1. Searching for the two transfer patients on 05/01/2026...\n');

        const findQuery = `
            SELECT *
            FROM tb_patientrecord
            WHERE receptiondate >= '2026-01-05' AND receptiondate < '2026-01-06'
            AND (
                patientname ILIKE '%NGUYEN THI DUNG%'
                OR patientname ILIKE '%NGUYEN VAN KHUONG%'
                OR patientname ILIKE '%DUNG%'
                OR patientname ILIKE '%KHUONG%'
            )
            ORDER BY receptiondate;
        `;

        const { rows: patients } = await hisPool.query(findQuery);

        if (patients.length === 0) {
            console.log('No exact matches found.\n');

            // Fallback: show all patients on that date
            console.log('Showing all patients on 05/01/2026:');
            const allQuery = `
                SELECT patientrecordid, patientcode, patientname, receptiondate, dischargedate
                FROM tb_patientrecord
                WHERE receptiondate >= '2026-01-05' AND receptiondate < '2026-01-06'
                ORDER BY receptiondate
                LIMIT 30;
            `;
            const { rows: allPatients } = await hisPool.query(allQuery);
            for (const p of allPatients) {
                console.log(`  ${p.patientcode} - ${p.patientname} - ${p.receptiondate}`);
            }
        } else {
            console.log(`Found ${patients.length} matching patient(s):\n`);

            for (const patient of patients) {
                console.log('='.repeat(70));
                console.log(`Patient: ${patient.patientname}`);
                console.log(`Code: ${patient.patientcode}`);
                console.log(`Record ID: ${patient.patientrecordid}`);
                console.log('='.repeat(70));

                console.log('\n--- ALL COLUMNS WITH VALUES ---');
                for (const [key, value] of Object.entries(patient)) {
                    if (value !== null && value !== undefined && value !== '') {
                        console.log(`  ${key}: ${value}`);
                    }
                }
                console.log('\n');
            }
        }

        // Step 2: Check what domain tables exist for treatment results
        console.log('\n2. Checking domain tables for treatment results...\n');

        const dmQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'dm_%'
            AND (
                table_name ILIKE '%treatment%'
                OR table_name ILIKE '%result%'
                OR table_name ILIKE '%outcome%'
            )
            ORDER BY table_name;
        `;

        const { rows: dmTables } = await hisPool.query(dmQuery);

        if (dmTables.length > 0) {
            console.log('Found domain tables:', dmTables.map(t => t.table_name).join(', '));

            for (const table of dmTables) {
                console.log(`\n--- ${table.table_name} contents ---`);
                const contentQuery = `SELECT * FROM ${table.table_name} LIMIT 30;`;
                const { rows: content } = await hisPool.query(contentQuery);
                console.log(JSON.stringify(content, null, 2));
            }
        } else {
            console.log('No domain tables found matching treatment/result/outcome.');
        }

        // Step 3: Check tb_patientrecord columns containing "result" or "treatment"
        console.log('\n3. Checking tb_patientrecord columns...\n');

        const columnQuery = `
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tb_patientrecord'
            ORDER BY ordinal_position;
        `;

        const { rows: columns } = await hisPool.query(columnQuery);
        console.log('All columns in tb_patientrecord:');
        for (const col of columns) {
            console.log(`  ${col.column_name} (${col.data_type})`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await hisPool.end();
    }
}

findTransferPatients()
    .then(() => {
        console.log('\n=== Search Complete ===');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal:', error);
        process.exit(1);
    });
