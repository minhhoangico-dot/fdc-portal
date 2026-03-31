import React, { useRef } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Printer, ArrowLeft } from 'lucide-react';

interface SupplyPrintProps {
  items: any[];
  onClose: () => void;
  filterFloor: string;
  filterStatus: string;
}

export const SupplyPrint: React.FC<SupplyPrintProps> = ({ items, onClose, filterFloor, filterStatus }) => {
  const handlePrint = () => {
    window.print();
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ duyệt';
      case 'approved': return 'Đã duyệt';
      case 'purchased': return 'Đã mua';
      case 'rejected': return 'Từ chối';
      default: return 'Tất cả';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return priority;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-[60] flex flex-col overflow-auto">
      {/* Print Controls (Hidden when printing) */}
      <div className="print:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 text-gray-600 font-medium">
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </button>
        <button 
          onClick={handlePrint}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-md"
        >
          <Printer className="w-5 h-5" />
          In tài liệu
        </button>
      </div>

      {/* A4 Page Container */}
      <div className="flex-1 p-4 md:p-8 flex justify-center print:p-0 print:bg-white">
        <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-lg print:shadow-none p-10 md:p-12 print:p-0 mx-auto font-serif text-black">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider">FDC Phòng Khám Gia Đình</h1>
              <p className="text-sm mt-1">123 Đường ABC, Quận XYZ, Hà Nội</p>
              <p className="text-sm">SĐT: 0123.456.789</p>
            </div>
            <div className="text-right">
              <p className="text-sm italic">Hà Nội, ngày {format(new Date(), 'dd')} tháng {format(new Date(), 'MM')} năm {format(new Date(), 'yyyy')}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold uppercase mb-2">Tổng Hợp Đề Xuất Vật Tư</h2>
            <p className="text-sm italic">
              (Bộ lọc: Tầng {filterFloor === 'all' ? 'Tất cả' : filterFloor} - Trạng thái: {getStatusText(filterStatus)})
            </p>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-black text-sm mb-12">
            <thead>
              <tr className="bg-gray-100 print:bg-transparent">
                <th className="border border-black px-2 py-2 text-center w-10">STT</th>
                <th className="border border-black px-3 py-2 text-left">Tên vật tư</th>
                <th className="border border-black px-2 py-2 text-center w-16">ĐVT</th>
                <th className="border border-black px-2 py-2 text-center w-16">Tổng SL</th>
                <th className="border border-black px-3 py-2 text-left w-48">Phòng yêu cầu</th>
                <th className="border border-black px-3 py-2 text-center w-24">Mức độ</th>
                <th className="border border-black px-3 py-2 text-left">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-black px-4 py-8 text-center italic">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={index}>
                    <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                    <td className="border border-black px-3 py-2 font-medium">{item.name}</td>
                    <td className="border border-black px-2 py-2 text-center">{item.unit}</td>
                    <td className="border border-black px-2 py-2 text-center font-bold">{item.total}</td>
                    <td className="border border-black px-3 py-2 text-xs leading-tight">
                      {Array.from(item.rooms).join(', ')}
                    </td>
                    <td className="border border-black px-3 py-2 text-center text-xs">
                      {Array.from(item.priorities).map(p => getPriorityText(p as string)).join(', ')}
                    </td>
                    <td className="border border-black px-3 py-2 text-xs">
                      {Array.from(item.notes).join('; ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="flex justify-between mt-16 px-8">
            <div className="text-center">
              <p className="font-bold mb-20">Người lập biểu</p>
              <p className="italic text-sm">(Ký, ghi rõ họ tên)</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-20">Trưởng bộ phận duyệt</p>
              <p className="italic text-sm">(Ký, ghi rõ họ tên)</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-20">Giám đốc</p>
              <p className="italic text-sm">(Ký, đóng dấu)</p>
            </div>
          </div>

        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:bg-white, .print\\:bg-white * {
            visibility: visible;
          }
          .print\\:bg-white {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
        }
      `}} />
    </div>
  );
};
