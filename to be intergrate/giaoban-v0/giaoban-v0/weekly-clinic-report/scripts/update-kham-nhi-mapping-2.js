
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

    // New regex to include "Khám nhi (Trực trưa)"
    // We escape parenthesis in regex if we use exact match, but for | in regex string we need to be careful.
    // simpler: (Nhi TW|Khám nhi TUD|Khám nhi.*Trực trưa)

    const updated = await prisma.wcrServiceMapping.update({
        where: { category_key: key },
        data: {
            match_value: '(Nhi TW|Khám nhi TUD|Khám nhi.*Trực trưa)'
        }
    });

    console.log('Updated mapping:', updated);
}

run()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
