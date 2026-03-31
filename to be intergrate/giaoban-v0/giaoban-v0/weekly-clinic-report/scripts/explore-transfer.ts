import { queryHis } from '../lib/db/his-client';

async function exploreTransferData() {
    console.log('=== Exploring HIS Database for Transfer Data ===\n');

    try {
        // 1. Check all columns in tb_patientrecord
        console.log('1. All columns in tb_patientrecord:');
        const allColumnsQuery = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tb_patientrecord'
            ORDER BY ordinal_position;
        `;

        const { rows: allColumns } = await queryHis(allColumnsQuery, []);
        console.log(JSON.stringify(allColumns, null, 2));

        // 2. Check for dm_* tables related to treatment/outcome
        console.log('\n2. Domain tables for treatment outcomes:');
        const dmTablesQuery = `
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

        const { rows: dmTables } = await queryHis(dmTablesQuery, []);
        console.log(JSON.stringify(dmTables, null, 2));

        // 3. Sample recent patient records to see actual data structure
        console.log('\n3. Sample patient record columns (first record):');
        const sampleQuery = `
            SELECT *
            FROM tb_patientrecord
            ORDER BY receptiondate DESC
            LIMIT 1;
        `;

        const { rows: samples } = await queryHis(sampleQuery, []);
        if (samples.length > 0) {
            console.log('Column names:', Object.keys(samples[0]));
        }

    } catch (error) {
        console.error('Error during exploration:', error);
        throw error;
    }
}

exploreTransferData()
    .then(() => {
        console.log('\n=== Exploration Complete ===');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
