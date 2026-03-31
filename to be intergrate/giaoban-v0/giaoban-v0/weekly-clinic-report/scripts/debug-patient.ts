// Debug script to investigate why patient 25015292 is not showing in khám bệnh
import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

const hisPool = new Pool({
    connectionString: process.env.HIS_DATABASE_URL,
});

const prisma = new PrismaClient();

async function debugPatient(patientCode: string) {
    console.log(`\n=== Debugging patient: ${patientCode} ===`);

    // 1. Check if patient exists
    const patientQuery = `
        SELECT patientid, patientcode, patientname
        FROM tb_patient
        WHERE patientcode = $1
    `;
    const { rows: patients } = await hisPool.query(patientQuery, [patientCode]);
    if (patients.length === 0) {
        console.log('Patient not found!');
        return;
    }
    console.log(`Patient: ${patients[0].patientname} (ID: ${patients[0].patientid})`);

    const patientId = patients[0].patientid;

    // 2. This week's date range
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log(`Week: ${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]}`);

    // 3. Check khám bệnh services this week
    const thisWeekQuery = `
        SELECT 
            sd.servicename,
            TO_CHAR(sd.servicedatausedate, 'YYYY-MM-DD') as usedate,
            pr.dm_patientobjectid
        FROM tb_servicedata sd
        JOIN tb_patientrecord pr ON pr.patientrecordid = sd.patientrecordid
        WHERE pr.patientid = $1
        AND sd.dm_servicegroupid = 1
        AND sd.servicedatausedate BETWEEN $2 AND $3
        ORDER BY sd.servicedatausedate
    `;
    const { rows: services } = await hisPool.query(thisWeekQuery, [patientId, startOfWeek, endOfWeek]);

    console.log(`\nKhám bệnh services this week: ${services.length}`);

    // 4. Check if any services pass the filter
    const passFilter = services.filter(s => s.dm_patientobjectid !== 3);
    console.log(`Services with dm_patientobjectid != 3: ${passFilter.length}`);

    for (const s of passFilter) {
        console.log(`  [${s.usedate}] "${s.servicename}" (objectid=${s.dm_patientobjectid})`);
    }

    // 5. Check service name matching
    const mappings = await prisma.wcrServiceMapping.findMany({
        where: { display_group: 'kham_benh', is_active: true },
        orderBy: { display_order: 'asc' }
    });

    console.log(`\nMatching check:`);
    for (const s of passFilter) {
        let matched = false;
        let matchedKey = '';
        for (const m of mappings) {
            if (m.match_type === 'exact' && s.servicename === m.match_value) {
                matched = true; matchedKey = m.category_key;
            } else if (m.match_type === 'contains' && s.servicename.includes(m.match_value)) {
                matched = true; matchedKey = m.category_key;
            } else if (m.match_type === 'starts_with' && s.servicename.startsWith(m.match_value)) {
                matched = true; matchedKey = m.category_key;
            } else if (m.match_type === 'regex' && new RegExp(m.match_value, 'i').test(s.servicename)) {
                matched = true; matchedKey = m.category_key;
            }
            if (matched) break;
        }
        console.log(`  "${s.servicename}" -> ${matched ? matchedKey : 'NO MATCH!'}`);
    }

    await hisPool.end();
    await prisma.$disconnect();
}

debugPatient('25015292');
