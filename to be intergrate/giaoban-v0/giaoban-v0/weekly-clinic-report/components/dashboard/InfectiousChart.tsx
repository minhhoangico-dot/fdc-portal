'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InfectiousStat {
    icd_code: string;
    disease_name: string;
    periods: {
        current: number;
        previous: number;
        last_year: number;
    };
}

interface InfectiousChartProps {
    data: InfectiousStat[] | undefined;
}

export function InfectiousChart({ data }: InfectiousChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-[300px] items-center justify-center text-slate-400 border rounded-lg bg-slate-50">
                Không có dữ liệu bệnh truyền nhiễm
            </div>
        );
    }

    // Transform data for Recharts - filter out diseases with no cases in current AND previous week
    const chartData = data
        .map(item => ({
            name: item.disease_name,
            current: item.periods.current,
            previous: item.periods.previous,
            last_year: item.periods.last_year
        }))
        .filter(item => item.current > 0 || item.previous > 0)
        .sort((a, b) => b.current - a.current)
        .sort((a, b) => b.current - a.current)
        .slice(0, 3);

    // Calculate dynamic height based on number of items (min 150px, or 40px per item)
    const dynamicHeight = Math.max(150, chartData.length * 40);

    return (
        <ResponsiveContainer width="100%" height={dynamicHeight}>
            <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 50, left: 0, bottom: 5 }}
                barSize={20}
                barGap={4}
            >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    tick={{ fontSize: 13, fill: '#334155', fontWeight: 500 }}
                    interval={0}
                />
                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                />
                <Legend verticalAlign="top" height={36} />

                {/* Tuần này - Prominent */}
                <Bar dataKey="current" name="Tuần này" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {/* Label at the end of the bar */}
                    {/* @ts-ignore */}
                    <LabelList dataKey="current" position="right" fill="#3b82f6" fontSize={12} fontWeight="bold" formatter={(val: number) => val > 0 ? val : ''} />
                </Bar>

                {/* Reference bars */}
                <Bar dataKey="previous" name="TB Tuần (Tháng trước)" fill="#fb923c" radius={[0, 4, 4, 0]}>
                    {/* @ts-ignore */}
                    <LabelList dataKey="previous" position="right" fill="#fb923c" fontSize={11} formatter={(val: number) => val > 0 ? val : ''} />
                </Bar>

                <Bar dataKey="last_year" name="Tuần này năm ngoái" fill="#94a3b8" radius={[0, 4, 4, 0]}>
                    {/* @ts-ignore */}
                    <LabelList dataKey="last_year" position="right" fill="#94a3b8" fontSize={11} formatter={(val: number) => val > 0 ? val : ''} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
