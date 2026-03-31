'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    BarChart3,
    Calendar,
    Download,
    Loader2,
    FileSpreadsheet,
    Stethoscope,
    TestTube,
    ScanLine,
    Scissors,
    Bug,
    Ambulance,
    CheckCircle2,
    Circle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';

// Available indicators with metadata
const INDICATORS = [
    { key: 'examination', name: 'Khám bệnh', icon: Stethoscope, color: 'text-blue-600' },
    { key: 'laboratory', name: 'Xét nghiệm', icon: TestTube, color: 'text-purple-600' },
    { key: 'imaging', name: 'Chẩn đoán hình ảnh', icon: ScanLine, color: 'text-cyan-600' },
    { key: 'specialist', name: 'Thủ thuật/Chuyên khoa', icon: Scissors, color: 'text-orange-600' },
    { key: 'infectious', name: 'Bệnh truyền nhiễm', icon: Bug, color: 'text-red-600' },
    { key: 'transfer', name: 'Chuyển viện', icon: Ambulance, color: 'text-emerald-600' },
];

// Preset date ranges
const DATE_PRESETS = [
    { label: 'Hôm nay', getValue: () => ({ start: new Date(), end: new Date() }) },
    { label: '7 ngày', getValue: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
    { label: '30 ngày', getValue: () => ({ start: subDays(new Date(), 29), end: new Date() }) },
    { label: 'Tuần này', getValue: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
    { label: 'Tháng này', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
];

interface StatItem {
    key: string;
    name: string;
    current: number;
    previous: number;
    is_bhyt?: boolean;
}

interface InfectiousStat {
    icd_code: string;
    disease_name: string;
    group: string;
    periods: { current: number; previous: number; last_year: number };
    age_groups: Record<string, number>;
}

export function CustomReportBuilder() {
    const router = useRouter();
    const [selectedIndicators, setSelectedIndicators] = useState<string[]>(['examination']);
    const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [error, setError] = useState<string>('');

    const toggleIndicator = (key: string) => {
        setSelectedIndicators(prev =>
            prev.includes(key)
                ? prev.filter(k => k !== key)
                : [...prev, key]
        );
    };

    const selectAllIndicators = () => {
        setSelectedIndicators(INDICATORS.map(i => i.key));
    };

    const applyPreset = (preset: typeof DATE_PRESETS[0]) => {
        const { start, end } = preset.getValue();
        setStartDate(format(start, 'yyyy-MM-dd'));
        setEndDate(format(end, 'yyyy-MM-dd'));
    };

    const generateReport = async () => {
        if (selectedIndicators.length === 0) {
            setError('Vui lòng chọn ít nhất một chỉ số');
            return;
        }

        setIsLoading(true);
        setError('');
        setReportData(null);

        try {
            const res = await fetch('/api/report/custom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    indicators: selectedIndicators,
                    startDate: startDate,
                    endDate: endDate,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Lỗi không xác định');
            }

            setReportData(data);
        } catch (err: any) {
            setError(err.message || 'Lỗi khi tạo báo cáo');
        } finally {
            setIsLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!reportData) return;

        const rows: string[][] = [['Nhóm', 'Chỉ số', 'Kỳ hiện tại', 'Kỳ trước', 'Thay đổi']];

        for (const [groupKey, items] of Object.entries(reportData.data)) {
            const groupName = INDICATORS.find(i => i.key === groupKey)?.name || groupKey;

            if (groupKey === 'infectious') {
                (items as InfectiousStat[]).forEach((item) => {
                    rows.push([
                        groupName,
                        item.disease_name,
                        item.periods.current.toString(),
                        item.periods.previous.toString(),
                        (item.periods.current - item.periods.previous).toString()
                    ]);
                });
            } else {
                (items as StatItem[]).forEach((item) => {
                    rows.push([
                        groupName,
                        item.name,
                        item.current.toString(),
                        item.previous.toString(),
                        (item.current - item.previous).toString()
                    ]);
                });
            }
        }

        const csvContent = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bao-cao-${startDate}_${endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Handle row click to show patient list
    const handleRowClick = (groupKey: string, itemKey: string, itemName: string) => {
        // For infectious diseases, pass icd_code as key and type=infectious
        // For other categories, pass category key and appropriate type
        const params = new URLSearchParams({
            key: itemKey,
            type: groupKey === 'infectious' ? 'infectious' : groupKey,
            title: itemName,
            start: new Date(startDate).toISOString(),
            end: new Date(endDate).toISOString()
        });
        router.push(`/report/details?${params.toString()}`);
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <BarChart3 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Báo cáo Tùy chọn</CardTitle>
                        <CardDescription>Tạo báo cáo thống kê theo chỉ số và khoảng thời gian</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
                {/* Indicator Selection */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-slate-700">Chọn chỉ số</h3>
                        <Button variant="ghost" size="sm" onClick={selectAllIndicators}>
                            Chọn tất cả
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {INDICATORS.map(indicator => {
                            const Icon = indicator.icon;
                            const isSelected = selectedIndicators.includes(indicator.key);
                            return (
                                <button
                                    key={indicator.key}
                                    onClick={() => toggleIndicator(indicator.key)}
                                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${isSelected
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {isSelected ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                    ) : (
                                        <Circle className="h-4 w-4 text-slate-300 flex-shrink-0" />
                                    )}
                                    <Icon className={`h-4 w-4 ${indicator.color} flex-shrink-0`} />
                                    <span className="text-sm truncate">{indicator.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Date Range Selection */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-700">Khoảng thời gian</h3>

                    {/* Presets */}
                    <div className="flex flex-wrap gap-2">
                        {DATE_PRESETS.map(preset => (
                            <Button
                                key={preset.label}
                                variant="outline"
                                size="sm"
                                onClick={() => applyPreset(preset)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>

                    {/* Custom Date Inputs */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <span className="text-slate-400">→</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                </div>

                {/* Generate Button */}
                <div className="flex items-center gap-3">
                    <Button
                        onClick={generateReport}
                        disabled={isLoading || selectedIndicators.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <BarChart3 className="h-4 w-4 mr-2" />
                        )}
                        Tạo báo cáo
                    </Button>

                    {reportData && (
                        <Button variant="outline" onClick={exportToCSV}>
                            <Download className="h-4 w-4 mr-2" />
                            Xuất CSV
                        </Button>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Results Display */}
                {reportData && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-slate-900">
                                Kết quả báo cáo
                            </h3>
                            <Badge variant="outline">
                                {format(new Date(reportData.meta.start_date), 'dd/MM/yyyy', { locale: vi })} - {format(new Date(reportData.meta.end_date), 'dd/MM/yyyy', { locale: vi })}
                            </Badge>
                        </div>

                        <ScrollArea className="max-h-[500px]">
                            {Object.entries(reportData.data).map(([groupKey, items]) => {
                                const indicator = INDICATORS.find(i => i.key === groupKey);
                                if (!indicator || !items) return null;

                                const Icon = indicator.icon;

                                return (
                                    <div key={groupKey} className="mb-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon className={`h-5 w-5 ${indicator.color}`} />
                                            <h4 className="font-medium">{indicator.name}</h4>
                                        </div>

                                        <div className="border rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-slate-50">
                                                        <TableHead>Chỉ số</TableHead>
                                                        <TableHead className="text-right w-24">Kỳ hiện tại</TableHead>
                                                        <TableHead className="text-right w-24">Kỳ trước</TableHead>
                                                        <TableHead className="text-right w-24">Thay đổi</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {groupKey === 'infectious' ? (
                                                        (items as InfectiousStat[]).map((item, idx) => {
                                                            const change = item.periods.current - item.periods.previous;
                                                            return (
                                                                <TableRow
                                                                    key={idx}
                                                                    className="cursor-pointer hover:bg-emerald-50 transition-colors"
                                                                    onClick={() => handleRowClick(groupKey, item.icd_code, item.disease_name)}
                                                                >
                                                                    <TableCell className="font-medium">{item.disease_name}</TableCell>
                                                                    <TableCell className="text-right text-blue-600 font-semibold">{item.periods.current}</TableCell>
                                                                    <TableCell className="text-right text-slate-500">{item.periods.previous.toFixed(1)}</TableCell>
                                                                    <TableCell className={`text-right font-medium ${change > 0 ? 'text-red-600' : change < 0 ? 'text-green-600' : ''}`}>
                                                                        {change > 0 ? '+' : ''}{change.toFixed(1)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })
                                                    ) : (
                                                        (items as StatItem[]).map((item, idx) => {
                                                            const change = item.current - item.previous;
                                                            return (
                                                                <TableRow
                                                                    key={idx}
                                                                    className="cursor-pointer hover:bg-emerald-50 transition-colors"
                                                                    onClick={() => handleRowClick(groupKey, item.key, item.name)}
                                                                >
                                                                    <TableCell className="font-medium">
                                                                        {item.name}
                                                                        {item.is_bhyt && (
                                                                            <Badge variant="secondary" className="ml-2 text-xs">BHYT</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-blue-600 font-semibold">{item.current}</TableCell>
                                                                    <TableCell className="text-right text-slate-500">{item.previous}</TableCell>
                                                                    <TableCell className={`text-right font-medium ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : ''}`}>
                                                                        {change > 0 ? '+' : ''}{change}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                );
                            })}
                        </ScrollArea>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
