'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgeGroupData {
    age_0_2: number;
    age_3_12: number;
    age_13_18: number;
    age_18_50: number;
    age_over_50: number;
}

interface InfectiousStat {
    icd_code: string;
    disease_name: string;
    periods: {
        current: number;
        previous: number;
        last_year: number;
    };
    age_groups: AgeGroupData;
}

interface InfectiousDiseaseCardProps {
    data: InfectiousStat[] | undefined;
    isLoading?: boolean;
    startDate?: Date;
    endDate?: Date;
}

const AGE_GROUPS = [
    { key: 'age_0_2', label: '0-2', color: 'bg-blue-500' },
    { key: 'age_3_12', label: '3-12', color: 'bg-green-500' },
    { key: 'age_13_18', label: '13-18', color: 'bg-amber-500' },
    { key: 'age_18_50', label: '18-50', color: 'bg-red-500' },
    { key: 'age_over_50', label: '>50', color: 'bg-purple-500' },
];

export function InfectiousDiseaseCard({ data, isLoading, startDate, endDate }: InfectiousDiseaseCardProps) {
    if (isLoading || !data) {
        return (
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-2">
                    <CardTitle className="text-[length:var(--card-title)] font-bold uppercase text-slate-700">
                        Bệnh Truyền Nhiễm
                    </CardTitle>
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

    // Filter and sort diseases with cases
    const filteredData = data
        .filter(item => item.periods.current > 0 || item.periods.previous > 0)
        .sort((a, b) => b.periods.current - a.periods.current)
        .slice(0, 8);

    // Calculate totals
    const totalCurrent = data.reduce((acc, item) => acc + item.periods.current, 0);
    const totalPrevious = data.reduce((acc, item) => acc + item.periods.previous, 0);
    const diffPercent = totalPrevious > 0
        ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
        : 0;

    // Find max for bar scaling
    const maxCurrent = Math.max(...filteredData.map(d => d.periods.current), 1);

    // Aggregate age groups
    const ageAggregated: Record<string, number> = {
        age_0_2: 0, age_3_12: 0, age_13_18: 0, age_18_50: 0, age_over_50: 0
    };
    data.forEach(item => {
        ageAggregated.age_0_2 += item.age_groups.age_0_2;
        ageAggregated.age_3_12 += item.age_groups.age_3_12;
        ageAggregated.age_13_18 += item.age_groups.age_13_18;
        ageAggregated.age_18_50 += item.age_groups.age_18_50;
        ageAggregated.age_over_50 += item.age_groups.age_over_50;
    });

    return (
        <Card className="h-full flex flex-col shadow-md border-slate-200 overflow-hidden">
            {/* HEADER */}
            {/* HEADER - Polished */}
            <CardHeader className="py-2.5 px-4 border-b bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg shrink-0 shadow-sm relative overflow-hidden">
                {/* Decorative background accent */}
                <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-12 -mr-8 pointer-events-none" />

                <div className="flex items-center justify-between gap-3 h-8 relative z-10">
                    {/* Left: Title */}
                    <CardTitle className="text-[15px] font-bold uppercase tracking-wider opacity-95 truncate flex-1 min-w-0 drop-shadow-sm" title="Bệnh Truyền Nhiễm">
                        BỆNH TRUYỀN NHIỄM
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
            <CardContent className="p-0 flex-1 min-h-0 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="pl-2 text-[length:var(--table-font)] font-bold text-slate-600"
                                style={{ height: 'var(--row-height)' }}>
                                Bệnh
                            </TableHead>
                            <TableHead className="w-[100px] text-[length:var(--table-font)] font-bold text-slate-600">

                            </TableHead>
                            <TableHead className="text-right text-[length:var(--table-font)] font-bold text-slate-600 w-[50px]">
                                Nay
                            </TableHead>
                            <TableHead className="text-right pr-2 text-[length:var(--table-font)] font-bold text-slate-600 w-[60px]">
                                TB 4 tuần
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.map((item, idx) => {
                            const barWidth = (item.periods.current / maxCurrent) * 100;
                            const itemDiff = item.periods.current - item.periods.previous;

                            const handleClick = () => {
                                if (startDate && endDate) {
                                    const params = new URLSearchParams({
                                        key: item.icd_code,
                                        type: 'infectious',
                                        title: item.disease_name,
                                        start: startDate.toISOString(),
                                        end: endDate.toISOString()
                                    });
                                    window.location.href = `/report/details?${params.toString()}`;
                                }
                            };

                            return (
                                <TableRow
                                    key={idx}
                                    className="hover:bg-orange-100 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                                    style={{ height: 'var(--row-height)' }}
                                    onClick={handleClick}
                                >
                                    <TableCell className="font-medium pl-2 text-[length:var(--table-font)] text-slate-700 truncate max-w-[120px]" title={item.disease_name}>
                                        {item.disease_name}
                                    </TableCell>
                                    <TableCell className="py-1">
                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
                                                style={{ width: `${barWidth}%` }}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-black text-[length:var(--table-font)] text-slate-900">
                                        {item.periods.current}
                                    </TableCell>
                                    <TableCell className="text-right pr-2 text-slate-500 text-[length:var(--table-font)] flex justify-end items-center gap-1">
                                        {item.periods.previous}
                                        {itemDiff !== 0 && (
                                            <span className={cn(
                                                "text-sm font-bold",
                                                itemDiff > 0 ? "text-red-500" : "text-green-500"
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

            {/* AGE DISTRIBUTION FOOTER - MORE PROMINENT */}
            <div className="px-3 py-3 bg-gradient-to-r from-slate-100 to-slate-50 border-t shrink-0">
                <p className="text-[length:var(--table-font)] font-bold text-slate-700 mb-2">
                    📊 Phân bổ độ tuổi
                </p>
                <div className="grid grid-cols-5 gap-2">
                    {AGE_GROUPS.map(group => {
                        const value = ageAggregated[group.key];
                        const totalAge = Object.values(ageAggregated).reduce((a, b) => a + b, 0);
                        const percent = totalAge > 0 ? (value / totalAge) * 100 : 0;
                        const isClickable = value > 0 && startDate && endDate;

                        const handleAgeClick = () => {
                            if (isClickable) {
                                const params = new URLSearchParams({
                                    key: group.key,
                                    type: 'age_group',
                                    title: `Bệnh truyền nhiễm - ${group.label} tuổi`,
                                    start: startDate!.toISOString(),
                                    end: endDate!.toISOString()
                                });
                                window.location.href = `/report/details?${params.toString()}`;
                            }
                        };

                        return (
                            <div
                                key={group.key}
                                className={cn(
                                    "flex flex-col items-center p-1.5 rounded-lg bg-white shadow-sm border border-slate-200",
                                    isClickable && "cursor-pointer hover:bg-slate-50 hover:border-orange-300 transition-colors"
                                )}
                                onClick={handleAgeClick}
                            >
                                <span className={cn("w-3 h-3 rounded-full mb-1", group.color)} />
                                <span className="text-xs font-semibold text-slate-500">{group.label}</span>
                                <span className={cn(
                                    "text-[length:var(--table-font)] font-black",
                                    isClickable ? "text-blue-600 underline" : "text-slate-900"
                                )}>{value}</span>
                                {percent > 0 && (
                                    <span className="text-xs text-slate-400">{percent.toFixed(0)}%</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
