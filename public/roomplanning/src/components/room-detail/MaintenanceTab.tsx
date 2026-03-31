import React, { useState } from 'react';
import { Room, MaintenanceRequest } from '../../lib/types';
import { useAppContext } from '../../lib/AppContext';
import { Plus, AlertTriangle, Clock, CheckCircle2, XCircle, Wrench, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MaintenanceForm } from './MaintenanceForm';

export const MaintenanceTab: React.FC<{ room: Room }> = ({ room }) => {
  const { maintenanceRequests } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const roomRequests = maintenanceRequests
    .filter(r => r.room_id === room.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Khẩn cấp</span>;
      case 'high': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">Cao</span>;
      case 'medium': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">Trung bình</span>;
      case 'low': return <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Thấp</span>;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Mới</span>;
      case 'in_progress': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Đang xử lý</span>;
      case 'completed': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Hoàn thành</span>;
      case 'cancelled': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Đã hủy</span>;
      default: return null;
    }
  };

  if (isFormOpen) {
    return <MaintenanceForm room={room} onCancel={() => setIsFormOpen(false)} onSuccess={() => setIsFormOpen(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" />
          Lịch sử sự cố
        </h3>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Báo sự cố
        </button>
      </div>

      {roomRequests.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-100 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h4 className="text-gray-900 font-medium mb-1">Không có sự cố nào</h4>
          <p className="text-gray-500 text-sm">Phòng đang hoạt động bình thường, chưa có yêu cầu bảo trì hay sự cố nào được ghi nhận.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roomRequests.map(req => (
            <div key={req.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900 text-base">{req.title}</h4>
                <div className="flex gap-2 ml-2 shrink-0">
                  {getPriorityBadge(req.priority)}
                  {getStatusBadge(req.status)}
                </div>
              </div>
              
              {req.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{req.description}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </div>
                {req.reported_by && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">Báo cáo:</span> {req.reported_by}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700">Loại:</span> 
                  {req.request_type === 'incident' ? 'Sự cố' : req.request_type === 'maintenance' ? 'Bảo trì' : 'Sửa chữa'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
