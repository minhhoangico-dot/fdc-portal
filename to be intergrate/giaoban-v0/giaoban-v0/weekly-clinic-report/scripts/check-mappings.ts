// Check specific "nội" mappings and add missing one
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Get the nội-related mappings
    const mappings = await prisma.wcrServiceMapping.findMany({
        where: {
            display_group: 'kham_benh',
            category_key: { in: ['kham_noi_cki', 'kham_noi_bhyt', 'tai_kham_noi_tt', 'kham_noi_tai_nha'] }
        }
    });

    console.log('Nội-related mappings:');
    for (const m of mappings) {
        console.log(`  ${m.category_key}: ${m.match_type}="${m.match_value}" (order: ${m.display_order}, active: ${m.is_active})`);
    }

    // Test matching against "Khám Nội khoa dịch vụ (TS, Ths các BV tại HN)"
    const testServiceName = "Khám Nội khoa dịch vụ (TS, Ths các BV tại HN)";
    console.log(`\nTesting: "${testServiceName}"`);

    for (const m of mappings) {
        let matched = false;
        if (m.match_type === 'exact' && testServiceName === m.match_value) matched = true;
        else if (m.match_type === 'contains' && testServiceName.includes(m.match_value)) matched = true;
        else if (m.match_type === 'starts_with' && testServiceName.startsWith(m.match_value)) matched = true;
        else if (m.match_type === 'regex') {
            try {
                matched = new RegExp(m.match_value, 'i').test(testServiceName);
            } catch (e) {
                console.log(`  Invalid regex: ${m.match_value}`);
            }
        }
        console.log(`  ${m.category_key}: ${matched ? 'MATCH' : 'no match'}`);
    }

    // Also test "Công khám 0 đồng"
    console.log('\nTesting: "Công khám 0 đồng"');
    const allMappings = await prisma.wcrServiceMapping.findMany({
        where: { display_group: 'kham_benh', is_active: true }
    });
    let found = false;
    for (const m of allMappings) {
        let matched = false;
        if (m.match_type === 'exact' && "Công khám 0 đồng" === m.match_value) matched = true;
        else if (m.match_type === 'contains' && "Công khám 0 đồng".includes(m.match_value)) matched = true;
        else if (m.match_type === 'starts_with' && "Công khám 0 đồng".startsWith(m.match_value)) matched = true;
        else if (m.match_type === 'regex') {
            try {
                matched = new RegExp(m.match_value, 'i').test("Công khám 0 đồng");
            } catch (e) { }
        }
        if (matched) {
            console.log(`  Matched by: ${m.category_key}`);
            found = true;
            break;
        }
    }
    if (!found) console.log('  No match found!');

    await prisma.$disconnect();
}

main();
