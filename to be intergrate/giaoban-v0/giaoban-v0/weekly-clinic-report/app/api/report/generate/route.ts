
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/db/app-client';
import { GET as getReport } from '../current/route';

export async function POST(request: Request) {
    const logId = (await prisma.wcrReportLog.create({
        data: {
            action_type: 'GENERATE',
            status: 'RUNNING'
        }
    })).id;

    try {
        // 1. Fetch Report Data using the existing logic
        // We can reuse the GET handler logic or call the internal function if refactored.
        // For now, let's call the URL internally or extract logic. 
        // "NextJS API Routes calling each other" -> better to extract logic.
        // But since 'route.ts' exports GET, we can't easily import it as a function without request object mock.
        // I'll fetch via absolute URL if possible, OR refactor. 
        // Refactor is cleaner, but for speed, I will mock a request or just copy logic? 
        // Copying logic is bad. Let's assume we can fetch internal URL.

        // Actually, simpler: I'll just import the query functions again.
        // Re-importing queries is safe. The 'GET' in current/route.ts aggregates them.
        // I will duplicate the aggregation logic here or move aggregation to a lib function.

        // Let's rely on importing queries directly to avoid HTTP loop overhead/issues.
        const { startOfWeek, endOfWeek, subWeeks, format } = await import('date-fns');
        const { getExaminationStats } = await import('@/lib/queries/examination');
        const { getLaboratoryStats } = await import('@/lib/queries/laboratory');
        const { getImagingStats } = await import('@/lib/queries/imaging');
        const { getSpecialistStats } = await import('@/lib/queries/procedures');
        const { getInfectiousStats } = await import('@/lib/queries/infectious');

        // Logic from current/route.ts
        const refDate = new Date();
        const startDate = startOfWeek(refDate, { weekStartsOn: 1 });
        const endDate = endOfWeek(refDate, { weekStartsOn: 1 });
        const prevStartDate = subWeeks(startDate, 1);
        const prevEndDate = subWeeks(endDate, 1);

        // Fetch Data
        const [examination, laboratory, imaging, specialist, infectious] = await Promise.all([
            getExaminationStats(startDate, endDate, prevStartDate, prevEndDate),
            getLaboratoryStats(startDate, endDate, prevStartDate, prevEndDate),
            getImagingStats(startDate, endDate, prevStartDate, prevEndDate),
            getSpecialistStats(startDate, endDate, prevStartDate, prevEndDate),
            getInfectiousStats(startDate, endDate)
        ]);

        const reportData = {
            meta: {
                generated_at: new Date().toISOString(),
                week_start: startDate.toISOString(),
                week_end: endDate.toISOString(),
                week_number: parseInt(format(startDate, 'w')),
                year: parseInt(format(startDate, 'yyyy'))
            },
            data: { examination, laboratory, imaging, specialist, infectious }
        };

        // 2. Save Snapshot
        // Check if exists
        const existing = await prisma.wcrReportSnapshot.findUnique({
            where: {
                year_week_number: {
                    year: reportData.meta.year,
                    week_number: reportData.meta.week_number
                }
            }
        });

        if (existing) {
            await prisma.wcrReportSnapshot.update({
                where: { id: existing.id },
                data: {
                    report_data: reportData as any,
                    generated_at: new Date()
                }
            });
        } else {
            await prisma.wcrReportSnapshot.create({
                data: {
                    year: reportData.meta.year,
                    week_number: reportData.meta.week_number,
                    week_start: startDate,
                    week_end: endDate,
                    report_data: reportData as any
                }
            });
        }

        // 3. Update Log
        await prisma.wcrReportLog.update({
            where: { id: logId },
            data: {
                status: 'SUCCESS',
                completed_at: new Date(),
                details: { week: reportData.meta.week_number, year: reportData.meta.year }
            }
        });

        return NextResponse.json({ success: true, week: reportData.meta.week_number });

    } catch (error: any) {
        console.error('Generate error:', error);
        await prisma.wcrReportLog.update({
            where: { id: logId },
            data: {
                status: 'FAILED',
                completed_at: new Date(),
                error_message: error.message || 'Unknown error'
            }
        });
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
