import React from 'react';
import { useAppContext } from '../../lib/AppContext';
import { Building2, AlertTriangle, Wrench, Package } from 'lucide-react';

export const DashboardCards: React.FC = () => {
  const { rooms, maintenanceRequests, supplyRequests } = useAppContext();

  const totalRooms = rooms.length;
  
  const activeIncidents = maintenanceRequests.filter(r => r.request_type === 'incident' && r.status !== 'completed' && r.status !== 'cancelled');
  const hasUrgentIncident = activeIncidents.some(r => r.priority === 'urgent');
  
  const activeMaintenance = maintenanceRequests.filter(r => r.request_type !== 'incident' && r.status !== 'completed' && r.status !== 'cancelled');
  
  const pendingSupply = supplyRequests.filter(r => r.status === 'pending');

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-0.5">Tổng số phòng</p>
          <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${hasUrgentIncident ? 'bg-red-50' : 'bg-orange-50'}`}>
          <AlertTriangle className={`w-6 h-6 ${hasUrgentIncident ? 'text-red-600' : 'text-orange-600'}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-0.5">Sự cố đang mở</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900">{activeIncidents.length}</p>
            {hasUrgentIncident && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">Khẩn cấp</span>
            )}
          </div>
        </div>
        {hasUrgentIncident && <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500" />}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
          <Wrench className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-0.5">Bảo trì đang XL</p>
          <p className="text-2xl font-bold text-gray-900">{activeMaintenance.length}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500 mb-0.5">Vật tư chờ duyệt</p>
          <p className="text-2xl font-bold text-gray-900">{pendingSupply.length}</p>
        </div>
      </div>
    </div>
  );
};
