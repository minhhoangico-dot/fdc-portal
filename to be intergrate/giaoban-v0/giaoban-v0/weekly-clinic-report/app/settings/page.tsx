
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ServiceExplorer } from '@/components/settings/ServiceExplorer';
import { IcdCodeManager } from '@/components/settings/IcdCodeManager';
import { GenerateReportButton } from '@/components/settings/GenerateReportButton';
import { CustomReportBuilder } from '@/components/settings/CustomReportBuilder';
import { ArrowLeft, Settings } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-6 space-y-6">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Settings className="h-6 w-6 text-slate-500" />
                            Cài đặt Hệ thống
                        </h1>
                        <p className="text-slate-500">Cấu hình báo cáo và quản lý danh mục</p>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 gap-6">
                <section>
                    <CustomReportBuilder />
                </section>

                <section>
                    <ServiceExplorer />
                </section>


                <section>
                    <IcdCodeManager />
                </section>

                {/* Placeholder for Age Group Configuration if needed */}
                <section className="p-6 border rounded-lg bg-white border-slate-200">
                    <h2 className="text-lg font-semibold mb-4">Cấu hình Nhóm tuổi (Chỉ xem)</h2>
                    <div className="flex gap-2 flex-wrap mb-6">
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-sm">0-2 tuổi</span>
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-sm">3-12 tuổi</span>
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-sm">13-18 tuổi</span>
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-sm">18-50 tuổi</span>
                        <span className="px-3 py-1 bg-slate-100 rounded-full text-sm">&gt;50 tuổi</span>
                    </div>

                    <div className="pt-6 border-t">
                        <h2 className="text-lg font-semibold mb-4">Quản lý Báo cáo</h2>
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
                            <div>
                                <h3 className="font-medium">Tạo Snapshot Báo cáo Tuần</h3>
                                <p className="text-sm text-slate-500">Thủ công tạo báo cáo cho tuần hiện tại (Ghi đè nếu đã tồn tại)</p>
                            </div>
                            <GenerateReportButton />
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
