
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';

interface PatientDetail {
    servicedataid: number;
    patientname: string;
    dob: string;
    age: number;
    gender: string;
    insuranceid: string | null;
    doituong: string;
    servicename: string;
    time: string;
    room: string;
    patientcode: string;
    // Transfer specific fields
    examtime?: string;
    hospitalname?: string;
    diagnosis?: string;
}

type SortConfig = {
    key: keyof PatientDetail;
    direction: 'asc' | 'desc';
} | null;

function DetailContent() {
    const searchParams = useSearchParams();
    const key = searchParams.get('key');
    const type = searchParams.get('type');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const isTransfer = type === 'transfer';

    // Fallback if accessed directly without params
    const queryStart = start || new Date().toISOString();
    const queryEnd = end || new Date().toISOString();

    const [data, setData] = useState<PatientDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    useEffect(() => {
        if (key) {
            let url = `/api/report/details?key=${key}&start=${queryStart}&end=${queryEnd}`;
            if (type) {
                url += `&type=${type}`;
            }

            fetch(url)
                .then(res => res.json())
                .then(res => {
                    if (Array.isArray(res)) setData(res);
                    else setData([]);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [key, type, queryStart, queryEnd]);

    const handleSort = (key: keyof PatientDetail) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc'
                    ? { key, direction: 'desc' }
                    : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig) return 0;

        const aValue: any = a[sortConfig.key];
        const bValue: any = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    if (!key) return <div>Invalid access</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <Link href={`/?date=${queryStart}`}>
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Quay lại
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold uppercase text-blue-900">Chi tiết dịch vụ</h1>
                <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" /> Xuất Excel
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Danh sách bệnh nhân - {searchParams.get('title') || key}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]">STT</TableHead>
                                <TableHead className="w-[100px]">Mã BN</TableHead>
                                <TableHead>Tên Bệnh nhân</TableHead>
                                <TableHead className="w-[60px]">GT</TableHead>

                                {isTransfer ? (
                                    <>
                                        <TableHead className="cursor-pointer hover:bg-muted/50 w-[120px]" onClick={() => handleSort('examtime')}>
                                            <div className="flex items-center gap-1">
                                                Ngày khám
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('hospitalname')}>
                                            <div className="flex items-center gap-1">
                                                Bệnh viện
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('diagnosis')}>
                                            <div className="flex items-center gap-1">
                                                Chẩn đoán
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                    </>
                                ) : (
                                    <>
                                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('doituong')}>
                                            <div className="flex items-center gap-1">
                                                Đối tượng
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('servicename')}>
                                            <div className="flex items-center gap-1">
                                                Dịch vụ
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('time')}>
                                            <div className="flex items-center gap-1">
                                                Thời gian
                                                <ArrowUpDown className="h-3 w-3" />
                                            </div>
                                        </TableHead>
                                    </>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={isTransfer ? 7 : 7} className="text-center py-8">Đang tải...</TableCell>
                                </TableRow>
                            ) : sortedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isTransfer ? 7 : 7} className="text-center py-8">Không có dữ liệu</TableCell>
                                </TableRow>
                            ) : (
                                sortedData.map((item, idx) => (
                                    <TableRow key={item.servicedataid}>
                                        <TableCell>{idx + 1}</TableCell>
                                        <TableCell>{item.patientcode}</TableCell>
                                        <TableCell className="font-medium whitespace-nowrap">{item.patientname}</TableCell>
                                        <TableCell>{item.gender}</TableCell>

                                        {isTransfer ? (
                                            <>
                                                <TableCell>{item.examtime}</TableCell>
                                                <TableCell className="whitespace-normal min-w-[200px] text-blue-700 font-medium">
                                                    {item.hospitalname}
                                                </TableCell>
                                                <TableCell className="whitespace-normal italic min-w-[300px] text-slate-600">
                                                    {item.diagnosis}
                                                </TableCell>
                                            </>
                                        ) : (
                                            <>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.doituong === 'Bảo hiểm' ? 'bg-blue-100 text-blue-700' :
                                                        item.doituong === 'Viện phí' ? 'bg-green-100 text-green-700' :
                                                            item.doituong === 'Yêu cầu' ? 'bg-purple-100 text-purple-700' :
                                                                item.doituong === 'Miễn phí' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {item.doituong}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{item.servicename}</TableCell>
                                                <TableCell>{item.time}</TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

export default function DetailsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DetailContent />
        </Suspense>
    );
}
