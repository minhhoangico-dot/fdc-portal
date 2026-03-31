'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Settings, RefreshCw, Calendar, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceStatsCard } from '@/components/dashboard/ServiceStatsCard';
import { InfectiousDiseaseCard } from '@/components/dashboard/InfectiousDiseaseCard';
import { TransferStatsCard } from '@/components/dashboard/TransferStatsCard';
import { format, addWeeks, isSameWeek } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ReportData {
    meta: {
        generated_at: string;
        week_start: string;
        week_end: string;
        week_number: number;
        year: number;
    };
    data: {
        examination: any[];
        laboratory: any[];
        imaging: any[];
        specialist: any[];
        infectious: any[];
        transfer: any[];
    };
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="h-screen flex items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-slate-500">Đang tải...</p>
                </div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const searchParams = useSearchParams();
    const dateParam = searchParams.get('date');

    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        // Initialize from URL param if present
        if (dateParam) {
            const parsed = new Date(dateParam);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        return new Date();
    });
    const [tvMode, setTvMode] = useState(false);

    const fetchReport = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/report/current?date=${selectedDate.toISOString()}`);
            const data = await res.json();
            setReport(data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch report', error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchReport();
        const interval = setInterval(fetchReport, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchReport]);

    const navigateWeek = (weeks: number) => {
        setSelectedDate(prev => addWeeks(prev, weeks));
    };

    const resetToday = () => {
        setSelectedDate(new Date());
    };

    const toggleTvMode = () => {
        setTvMode(prev => !prev);
        document.documentElement.classList.toggle('tv-mode');
    };

    if (!report && loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-slate-500 text-[length:var(--base-font)]">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-100 p-3 font-sans text-slate-900 overflow-hidden flex flex-col">
            {/* ULTRA-MINIMAL HEADER */}
            <header className="bg-white rounded-lg shadow-sm px-3 py-1.5 mb-2 flex justify-between items-center border border-slate-200 shrink-0" style={{ height: 'var(--header-height)' }}>
                <div className="flex items-center gap-3">
                    <h1 className="text-[length:var(--title-font)] font-black text-slate-800 tracking-tight">
                        BÁO CÁO HOẠT ĐỘNG PHÒNG KHÁM
                    </h1>
                    <div className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 rounded px-1 border border-blue-100">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateWeek(-4)} title="Lùi 4 tuần">
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateWeek(-1)} title="Tuần trước">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="mx-1 text-[length:var(--base-font)] font-black">
                            {report ? `Tuần ${report.meta.week_number}` : '...'}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateWeek(1)} title="Tuần sau">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigateWeek(4)} title="Tới 4 tuần">
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                    {report && (
                        <span className="text-[length:var(--base-font)] text-slate-500">
                            ({format(new Date(report.meta.week_start), 'dd/MM', { locale: vi })} - {format(new Date(report.meta.week_end), 'dd/MM/yyyy', { locale: vi })})
                        </span>
                    )}
                    {!isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 }) && (
                        <Button variant="link" className="h-auto p-0 text-[length:var(--base-font)]" onClick={resetToday}>
                            (Tuần này)
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant={tvMode ? "default" : "outline"}
                        size="icon"
                        onClick={toggleTvMode}
                        title="Chế độ TV"
                        className="h-7 w-7"
                    >
                        <Tv className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={fetchReport} title="Làm mới" className="h-7 w-7">
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Link href="/settings">
                        <Button variant="ghost" size="icon" title="Cài đặt" className="h-7 w-7">
                            <Settings className="h-4 w-4 text-slate-500" />
                        </Button>
                    </Link>
                </div>
            </header>

            {/* MAIN CONTENT - Uses remaining height */}
            <main className="flex-1 min-h-0 grid grid-cols-12 gap-3">
                {/* COLUMN 1: KHÁM BỆNH */}
                <div className="col-span-12 lg:col-span-3 min-h-0">
                    <ServiceStatsCard
                        title="Khám Bệnh"
                        data={report?.data.examination}
                        isLoading={loading}
                        startDate={report ? new Date(report.meta.week_start) : undefined}
                        endDate={report ? new Date(report.meta.week_end) : undefined}
                    />
                </div>

                {/* COLUMN 2: CẬN LÂM SÀNG */}
                <div className="col-span-12 lg:col-span-3 min-h-0 flex flex-col gap-3">
                    <div className="flex-1 min-h-0">
                        <ServiceStatsCard
                            title="Xét Nghiệm"
                            data={report?.data.laboratory}
                            isLoading={loading}
                            startDate={report ? new Date(report.meta.week_start) : undefined}
                            endDate={report ? new Date(report.meta.week_end) : undefined}
                        />
                    </div>
                    <div className="flex-1 min-h-0">
                        <ServiceStatsCard
                            title="Chẩn Đoán Hình Ảnh"
                            data={report?.data.imaging?.filter((item: any) => item.name !== 'CDHA khác' && item.name !== 'CĐHA khác')}
                            isLoading={loading}
                            startDate={report ? new Date(report.meta.week_start) : undefined}
                            endDate={report ? new Date(report.meta.week_end) : undefined}
                        />
                    </div>
                </div>

                {/* COLUMN 3: CHUYÊN KHOA & CHUYỂN VIỆN */}
                <div className="col-span-12 lg:col-span-3 min-h-0 flex flex-col gap-3">
                    <div className="flex-1 min-h-0">
                        <ServiceStatsCard
                            title="Chuyên Khoa"
                            data={report?.data.specialist}
                            isLoading={loading}
                            startDate={report ? new Date(report.meta.week_start) : undefined}
                            endDate={report ? new Date(report.meta.week_end) : undefined}
                        />
                    </div>
                    <div>
                        <TransferStatsCard
                            data={report?.data.transfer}
                            isLoading={loading}
                            startDate={report ? new Date(report.meta.week_start) : undefined}
                            endDate={report ? new Date(report.meta.week_end) : undefined}
                        />
                    </div>
                </div>

                {/* COLUMN 4: BỆNH TRUYỀN NHIỄM */}
                <div className="col-span-12 lg:col-span-3 min-h-0">
                    <InfectiousDiseaseCard
                        data={report?.data.infectious}
                        isLoading={loading}
                        startDate={report ? new Date(report.meta.week_start) : undefined}
                        endDate={report ? new Date(report.meta.week_end) : undefined}
                    />
                </div>
            </main>
        </div>
    );
}
