// Update mappings: "dịch vụ" = "tại nhà"
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating mappings for "dịch vụ" = "tại nhà"...\n');

    // Update kham_noi_tai_nha to also match "nội.*dịch vụ" or "nội khoa dịch vụ"
    const noiUpdate = await prisma.wcrServiceMapping.update({
        where: { category_key: 'kham_noi_tai_nha' },
        data: {
            match_type: 'regex',
            match_value: 'nội.*(tại nhà|dịch vụ)'
        }
    });
    console.log('Updated kham_noi_tai_nha:', noiUpdate.match_type, '=', noiUpdate.match_value);

    // Update kham_nhi_tai_nha to also match "nhi.*dịch vụ"
    const nhiUpdate = await prisma.wcrServiceMapping.update({
        where: { category_key: 'kham_nhi_tai_nha' },
        data: {
            match_type: 'regex',
            match_value: 'nhi.*(tại nhà|dịch vụ)'
        }
    });
    console.log('Updated kham_nhi_tai_nha:', nhiUpdate.match_type, '=', nhiUpdate.match_value);

    // Verify the test case now matches
    const testServiceName = "Khám Nội khoa dịch vụ (TS, Ths các BV tại HN)";
    const regex = new RegExp(noiUpdate.match_value, 'i');
    console.log(`\nTest: "${testServiceName}"`);
    console.log(`Regex: /${noiUpdate.match_value}/i`);
    console.log(`Match: ${regex.test(testServiceName) ? 'YES ✓' : 'NO ✗'}`);

    await prisma.$disconnect();
}

main();
