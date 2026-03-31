import { NextResponse } from 'next/server';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';
import { getExaminationStats } from '@/lib/queries/examination';
import { getLaboratoryStats } from '@/lib/queries/laboratory';
import { getImagingStats } from '@/lib/queries/imaging';
import { getSpecialistStats } from '@/lib/queries/procedures';
import { getInfectiousStats } from '@/lib/queries/infectious';
import { getTransferStats } from '@/lib/queries/transfer';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateParam = searchParams.get('date');

        // Default to current date or provided date
        const refDate = dateParam ? new Date(dateParam) : new Date();

        // Calculate Week Range (Mon - Sun)
        // Note: date-fns startOfWeek defaults to Sunday (0) unless configured. 
        // Creating report for "This Week".
        // If running on Sunday 23:00, we want the week ending today.

        const startDate = startOfWeek(refDate, { weekStartsOn: 1 }); // Monday
        const endDate = endOfWeek(refDate, { weekStartsOn: 1 });     // Sunday

        // Previous Week (for comparison)
        const prevStartDate = subWeeks(startDate, 1);
        const prevEndDate = subWeeks(endDate, 1);

        console.log(`Generating report for week: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

        // Parallel Fetching
        const [
            examination,
            laboratory,
            imaging,
            specialist,
            infectious,
            transfer
        ] = await Promise.all([
            getExaminationStats(startDate, endDate, prevStartDate, prevEndDate),
            getLaboratoryStats(startDate, endDate, prevStartDate, prevEndDate),
            getImagingStats(startDate, endDate, prevStartDate, prevEndDate),
            getSpecialistStats(startDate, endDate, prevStartDate, prevEndDate),
            getInfectiousStats(startDate, endDate), // Weekly Scale
            getTransferStats(startDate, endDate, prevStartDate, prevEndDate)
        ]);

        const reportData = {
            meta: {
                generated_at: new Date().toISOString(),
                week_start: startDate.toISOString(),
                week_end: endDate.toISOString(),
                week_number: parseInt(format(startDate, 'w')),
                year: parseInt(format(startDate, 'yyyy'))
            },
            data: {
                examination,
                laboratory,
                imaging,
                specialist,
                infectious,
                transfer
            }
        };

        return NextResponse.json(reportData);
    } catch (error) {
        console.error('Error generating report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
