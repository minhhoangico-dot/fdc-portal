import React, { useState } from 'react';
import { Room } from '../../lib/types';
import { useAppContext } from '../../lib/AppContext';
import { Plus, Package, CheckCircle2, XCircle, Clock, FileText, AlertCircle, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SupplyForm } from './SupplyForm';

export const SupplyTab: React.FC<{ room: Room }> = ({ room }) => {
  const { supplyRequests } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const roomRequests = supplyRequests
    .filter(r => r.room_id === room.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Chờ duyệt</span>;
      case 'approved': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Đã duyệt</span>;
      case 'purchased': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Đã mua</span>;
      case 'rejected': return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Từ chối</span>;
      default: return null;
    }
  };

  if (isFormOpen) {
    return <SupplyForm room={room} onCancel={() => setIsFormOpen(false)} onSuccess={() => setIsFormOpen(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Lịch sử đề xuất
        </h3>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tạo đề xuất
        </button>
      </div>

      {roomRequests.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-100 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-300" />
          </div>
          <h4 className="text-gray-900 font-medium mb-1">Chưa có đề xuất vật tư</h4>
          <p className="text-gray-500 text-sm">Phòng này chưa có yêu cầu cấp phát vật tư nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roomRequests.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 text-base mb-1">{req.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                    {req.requested_by && <span>• {req.requested_by}</span>}
                  </div>
                </div>
                <div className="shrink-0 ml-3">
                  {getStatusBadge(req.status)}
                </div>
              </div>
              
              {req.reason && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4 border border-gray-100">
                  <span className="font-medium text-gray-900 mr-1">Lý do:</span> {req.reason}
                </div>
              )}
              
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2">Tên vật tư</th>
                      <th className="px-3 py-2 text-center w-20">SL</th>
                      <th className="px-3 py-2 w-20">Đơn vị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {req.items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 text-gray-900 font-medium">{item.item_name}</td>
                        <td className="px-3 py-2.5 text-center text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-gray-500">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
