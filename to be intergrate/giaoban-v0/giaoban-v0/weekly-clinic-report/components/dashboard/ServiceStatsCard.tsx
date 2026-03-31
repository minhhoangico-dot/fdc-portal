import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDown, ArrowUp, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatItem {
    key: string;
    name: string;
    current: number;
    previous: number;
    is_bhyt: boolean;
}


interface ServiceStatsCardProps {
    title: string;
    data: StatItem[] | undefined;
    isLoading?: boolean;
    startDate?: Date;
    endDate?: Date;
}

export function ServiceStatsCard({ title, data, isLoading, startDate, endDate }: ServiceStatsCardProps) {
    if (isLoading || !data) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[length:var(--card-title)] font-bold uppercase text-slate-700">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-3">
                        <div className="h-6 bg-slate-200 rounded w-full"></div>
                        <div className="h-6 bg-slate-200 rounded w-5/6"></div>
                        <div className="h-6 bg-slate-200 rounded w-4/6"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const totalCurrent = data.reduce((acc, item) => acc + item.current, 0);
    const totalPrevious = data.reduce((acc, item) => acc + item.previous, 0);
    const diffPercent = totalPrevious > 0
        ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
        : 0;

    return (
        <Card className="h-full flex flex-col shadow-md border-slate-200">
            {/* COMPACT HEADER with inline KPI */}
            {/* COMPACT HEADER - Redesigned */}
            {/* COMPACT HEADER - Polished */}
            <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg shadow-sm relative overflow-hidden">
                {/* Decorative background accent */}
                <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-12 -mr-8 pointer-events-none" />

                <div className="flex items-center justify-between gap-3 h-8 relative z-10">
                    {/* Left: Title */}
                    <CardTitle className="text-[15px] font-bold uppercase tracking-wider opacity-95 truncate flex-1 min-w-0 drop-shadow-sm" title={title}>
                        {title}
                    </CardTitle>

                    {/* Right: Data */}
                    <div className="flex items-center gap-4 shrink-0">
                        {/* KPI */}
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black leading-none tracking-tight drop-shadow-sm">
                                {totalCurrent.toLocaleString()}
                            </span>
                            <span className="text-white/80 text-[11px] font-medium uppercase transform translate-y-[-2px] hidden sm:inline-block">
                                lượt
                            </span>
                        </div>

                        {/* Trend Badge - Glassmorphism */}
                        <div className={cn(
                            "text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 backdrop-blur-sm border shadow-sm",
                            diffPercent > 0 ? "bg-white/10 border-white/20 text-white" :
                                (diffPercent < 0 ? "bg-white/5 border-white/10 text-white/90" : "bg-white/5 border-white/10 text-white/80")
                        )}>
                            {diffPercent > 0 ? <TrendingUp className="w-3 h-3" /> :
                                (diffPercent < 0 ? <TrendingDown className="w-3 h-3" /> :
                                    <Minus className="w-3 h-3" />)}
                            <span className="tabular-nums">{Math.abs(diffPercent).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </CardHeader>

            {/* TABLE CONTENT */}
            <CardContent className="p-0 flex-1 relative overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="pl-2 text-[length:var(--table-font)] font-bold text-slate-600"
                                style={{ height: 'var(--row-height)' }}>
                                Loại Dịch vụ
                            </TableHead>
                            <TableHead className="text-right text-[length:var(--table-font)] font-bold text-slate-600"
                                style={{ height: 'var(--row-height)' }}>
                                Tuần này
                            </TableHead>
                            <TableHead className="text-right pr-4 text-[length:var(--table-font)] font-bold text-slate-600"
                                style={{ height: 'var(--row-height)' }}>
                                Trước
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item, idx) => {
                            const itemDiff = item.current - item.previous;
                            return (
                                <TableRow
                                    key={idx}
                                    className="hover:bg-blue-50/50 border-b border-slate-100 last:border-0 cursor-pointer transition-colors group"
                                    style={{ minHeight: 'var(--row-height)' }}
                                    onClick={() => {
                                        if (startDate && endDate) {
                                            const params = new URLSearchParams({
                                                key: item.key,
                                                title: item.name,
                                                start: startDate.toISOString(),
                                                end: endDate.toISOString()
                                            });
                                            window.location.href = `/report/details?${params.toString()}`;
                                        }
                                    }}
                                >
                                    <TableCell
                                        className="font-medium pl-2 text-[length:var(--table-font)] text-slate-700 whitespace-normal group-hover:text-blue-700 py-2"
                                        title={item.name}
                                    >
                                        {item.name}
                                    </TableCell>
                                    <TableCell className="text-right font-black text-[length:var(--table-font)] text-slate-900 group-hover:text-blue-900 py-2">
                                        {item.current.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right pr-4 text-slate-500 text-[length:var(--table-font)] flex justify-end items-center gap-1.5 py-2">
                                        {item.previous.toLocaleString()}
                                        {itemDiff !== 0 && (
                                            <span className={cn(
                                                "text-lg 2xl:text-xl font-bold",
                                                itemDiff > 0 ? "text-green-500" : "text-red-400"
                                            )}>
                                                {itemDiff > 0 ? "▲" : "▼"}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
