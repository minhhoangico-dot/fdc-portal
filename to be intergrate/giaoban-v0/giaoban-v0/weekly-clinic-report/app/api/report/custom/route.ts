import { NextRequest, NextResponse } from 'next/server';
import { getExaminationStats } from '@/lib/queries/examination';
import { getLaboratoryStats } from '@/lib/queries/laboratory';
import { getImagingStats } from '@/lib/queries/imaging';
import { getSpecialistStats } from '@/lib/queries/procedures';
import { getInfectiousStats } from '@/lib/queries/infectious';
import { getTransferStats } from '@/lib/queries/transfer';
import { subWeeks } from 'date-fns';

// Supported indicator types
const INDICATOR_MAP = {
    examination: getExaminationStats,
    laboratory: getLaboratoryStats,
    imaging: getImagingStats,
    specialist: getSpecialistStats,
    infectious: getInfectiousStats,
    transfer: getTransferStats,
} as const;

type IndicatorKey = keyof typeof INDICATOR_MAP;

interface CustomReportRequest {
    indicators: IndicatorKey[];
    startDate: string; // ISO date string
    endDate: string;   // ISO date string
}

export async function POST(request: NextRequest) {
    try {
        const body: CustomReportRequest = await request.json();
        const { indicators, startDate, endDate } = body;

        // Validation
        if (!indicators || !Array.isArray(indicators) || indicators.length === 0) {
            return NextResponse.json(
                { error: 'Vui lòng chọn ít nhất một chỉ số' },
                { status: 400 }
            );
        }

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'Vui lòng chọn khoảng thời gian' },
                { status: 400 }
            );
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json(
                { error: 'Định dạng ngày không hợp lệ' },
                { status: 400 }
            );
        }

        if (start > end) {
            return NextResponse.json(
                { error: 'Ngày bắt đầu phải trước ngày kết thúc' },
                { status: 400 }
            );
        }

        // Calculate previous period (same duration, immediately before)
        const durationMs = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1); // 1ms before start
        const prevStart = new Date(prevEnd.getTime() - durationMs);

        // Fetch selected indicators in parallel
        const results: Record<string, any> = {};
        const fetchPromises = indicators.map(async (key) => {
            if (!(key in INDICATOR_MAP)) {
                console.warn(`Unknown indicator: ${key}`);
                return;
            }

            const fetchFn = INDICATOR_MAP[key];

            // infectious has different signature (only 2 params)
            if (key === 'infectious') {
                results[key] = await (fetchFn as typeof getInfectiousStats)(start, end);
            } else {
                results[key] = await (fetchFn as typeof getExaminationStats)(
                    start, end, prevStart, prevEnd
                );
            }
        });

        await Promise.all(fetchPromises);

        return NextResponse.json({
            meta: {
                generated_at: new Date().toISOString(),
                start_date: start.toISOString(),
                end_date: end.toISOString(),
                indicators: indicators,
            },
            data: results,
        });
    } catch (error) {
        console.error('Error generating custom report:', error);
        return NextResponse.json(
            { error: 'Lỗi hệ thống khi tạo báo cáo' },
            { status: 500 }
        );
    }
}
