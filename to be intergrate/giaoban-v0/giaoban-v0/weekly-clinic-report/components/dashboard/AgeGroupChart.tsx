'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface AgeGroupData {
    age_0_2: number;
    age_3_12: number;
    age_13_18: number;
    age_18_50: number;
    age_over_50: number;
}

interface InfectiousStat {
    age_groups: AgeGroupData;
}

interface AgeGroupChartProps {
    data: InfectiousStat[] | undefined;
    startDate?: Date;
    endDate?: Date;
}

// Fixed order mapping
const AGE_GROUPS = [
    { key: 'age_0_2', label: '0-2 tuổi', color: '#3b82f6' },
    { key: 'age_3_12', label: '3-12 tuổi', color: '#10b981' },
    { key: 'age_13_18', label: '13-18 tuổi', color: '#f59e0b' },
    { key: 'age_18_50', label: '18-50 tuổi', color: '#ef4444' },
    { key: 'age_over_50', label: '>50 tuổi', color: '#8b5cf6' },
];

export function AgeGroupChart({ data, startDate, endDate }: AgeGroupChartProps) {
    if (!data || data.length === 0) return null;

    // Aggregate age groups across all diseases
    const aggregated: Record<string, number> = {
        age_0_2: 0,
        age_3_12: 0,
        age_13_18: 0,
        age_18_50: 0,
        age_over_50: 0
    };

    data.forEach(item => {
        aggregated.age_0_2 += item.age_groups.age_0_2;
        aggregated.age_3_12 += item.age_groups.age_3_12;
        aggregated.age_13_18 += item.age_groups.age_13_18;
        aggregated.age_18_50 += item.age_groups.age_18_50;
        aggregated.age_over_50 += item.age_groups.age_over_50;
    });

    // Build chart data in FIXED order
    const chartData = AGE_GROUPS.map(group => ({
        name: group.label,
        value: aggregated[group.key],
        color: group.color
    })).filter(d => d.value > 0);

    // Handle click on legend item to navigate to details
    const handleAgeGroupClick = (ageKey: string, label: string) => {
        if (startDate && endDate && aggregated[ageKey] > 0) {
            const params = new URLSearchParams({
                key: ageKey,
                type: 'age_group',
                title: `Bệnh truyền nhiễm - ${label}`,
                start: startDate.toISOString(),
                end: endDate.toISOString()
            });
            window.location.href = `/report/details?${params.toString()}`;
        }
    };

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-[200px] text-sm text-slate-400 italic">
                Chưa có dữ liệu độ tuổi
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center h-full w-full">
            {/* Pie Chart */}
            <div className="w-1/2 h-full min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            fill="#8884d8"
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip cursor={false} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Custom Legend - FIXED ORDER */}
            <div className="w-1/2 flex flex-col justify-center gap-1.5 pl-4">
                {AGE_GROUPS.map((group) => {
                    const value = aggregated[group.key];
                    const isClickable = value > 0 && startDate && endDate;
                    return (
                        <div
                            key={group.key}
                            className={`flex items-center gap-2 text-sm ${value === 0 ? 'opacity-40' : ''} ${isClickable ? 'cursor-pointer hover:bg-slate-100 rounded px-1 -mx-1' : ''}`}
                            onClick={() => isClickable && handleAgeGroupClick(group.key, group.label)}
                        >
                            <span
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: group.color }}
                            />
                            <span className="text-slate-700">{group.label}</span>
                            {value > 0 && (
                                <span className={`font-bold ml-auto ${isClickable ? 'text-blue-600 underline' : 'text-slate-900'}`}>{value}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
