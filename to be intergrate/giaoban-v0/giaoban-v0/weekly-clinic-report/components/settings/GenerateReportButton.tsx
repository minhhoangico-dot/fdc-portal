
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';

export function GenerateReportButton() {
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!confirm('Bạn có chắc chắn muốn tạo báo cáo ngay bây giờ?')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/report/generate', { method: 'POST' });
            if (res.ok) {
                alert('Tạo báo cáo thành công!');
            } else {
                alert('Có lỗi xảy ra khi tạo báo cáo.');
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi kết nối.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Tạo báo cáo ngay
        </Button>
    );
}
