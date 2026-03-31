
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const key = 'kham_nhi_tw';

    // Check if exists
    const existing = await prisma.wcrServiceMapping.findUnique({
        where: { category_key: key }
    });

    if (!existing) {
        console.log(`Mapping ${key} not found.`);
        return;
    }

    const updated = await prisma.wcrServiceMapping.update({
        where: { category_key: key },
        data: {
            category_name_vi: 'Khám Nhi chung (dịch vụ, gói...)',
            match_type: 'regex',
            match_value: '(Nhi TW|Khám nhi TUD)'
        }
    });

    console.log('Updated mapping:', updated);
}

run()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
