import React, { useState } from 'react';
import { AppProvider } from './lib/AppContext';
import { FloorPlan } from './components/floor-plan/FloorPlan';
import { DashboardCards } from './components/dashboard/DashboardCards';
import { SupplySummary } from './components/supply-summary/SupplySummary';
import { LayoutDashboard, FileText } from 'lucide-react';

export default function App() {
  const [isSupplySummaryOpen, setIsSupplySummaryOpen] = useState(false);

  return (
    <AppProvider>
      <div className="min-h-screen bg-[#f5f0eb] flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 leading-tight">Quản Lý Phòng</h1>
                <p className="text-xs text-gray-500 font-medium tracking-wide">FDC Phòng Khám Gia Đình</p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSupplySummaryOpen(true)}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Tổng hợp vật tư</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col">
          <DashboardCards />
          
          <div className="flex-1 min-h-[600px] mb-8">
            <FloorPlan />
          </div>
        </main>

        <SupplySummary 
          isOpen={isSupplySummaryOpen} 
          onClose={() => setIsSupplySummaryOpen(false)} 
        />
      </div>
    </AppProvider>
  );
}
