import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatItem {
    key: string;
    name: string;
    current: number;
    previous: number;
    is_bhyt: boolean;
}

interface TransferStatsCardProps {
    data: StatItem[] | undefined;
    isLoading?: boolean;
    startDate?: Date;
    endDate?: Date;
}

export function TransferStatsCard({ data, isLoading, startDate, endDate }: TransferStatsCardProps) {
    // Handle navigation to detail page
    const handleClick = () => {
        if (startDate && endDate) {
            const params = new URLSearchParams({
                key: 'chuyen_vien',
                type: 'transfer',
                title: 'Chuyển viện',
                start: startDate.toISOString(),
                end: endDate.toISOString()
            });
            window.location.href = `/report/details?${params.toString()}`;
        }
    };

    if (isLoading || !data) {
        return (
            <Card className="h-auto shadow-md border-slate-200">
                <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg shadow-sm">
                    <CardTitle className="text-[15px] font-bold uppercase tracking-wider opacity-95">
                        CHUYỂN VIỆN
                    </CardTitle>
                </CardHeader>
            </Card>
        );
    }

    // Calculate totals from all transfer types
    const totalCurrent = data.reduce((sum, item) => sum + item.current, 0);
    const totalPrevious = data.reduce((sum, item) => sum + item.previous, 0);
    const diffValue = totalCurrent - totalPrevious;

    return (
        <Card className="h-auto shadow-md border-slate-200 cursor-pointer hover:shadow-lg transition-shadow" onClick={handleClick}>
            {/* COMPACT HEADER - Polished */}
            <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg shadow-sm relative overflow-hidden">
                {/* Decorative background accent */}
                <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-12 -mr-8 pointer-events-none" />

                <div className="flex items-center justify-between gap-3 h-8 relative z-10">
                    {/* Left: Title */}
                    <CardTitle className="text-[15px] font-bold uppercase tracking-wider opacity-95 truncate flex-1 min-w-0 drop-shadow-sm" title="Chuyển viện">
                        CHUYỂN VIỆN
                    </CardTitle>

                    {/* Right: Data */}
                    <div className="flex items-center gap-4 shrink-0">
                        {/* KPI */}
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black leading-none tracking-tight drop-shadow-sm">
                                {totalCurrent.toLocaleString()}
                            </span>
                            <span className="text-white/80 text-[11px] font-medium uppercase transform translate-y-[-2px] hidden sm:inline-block">
                                ca
                            </span>
                        </div>

                        {/* Trend Badge - Glassmorphism */}
                        <div className={cn(
                            "text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm border shadow-sm",
                            diffValue > 0 ? "bg-white/10 border-white/20 text-white" :
                                (diffValue < 0 ? "bg-white/5 border-white/10 text-white/90" : "bg-white/5 border-white/10 text-white/80")
                        )}>
                            {diffValue > 0 ? <TrendingUp className="w-3 h-3" /> :
                                (diffValue < 0 ? <TrendingDown className="w-3 h-3" /> :
                                    <Minus className="w-3 h-3" />)}
                            <span className="tabular-nums">{Math.abs(diffValue)}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
}
