import React from 'react';
import { Room } from '../../lib/types';
import { Building, MapPin, Tag, Activity, FileText } from 'lucide-react';

export const RoomInfo: React.FC<{ room: Room }> = ({ room }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Hoạt động';
      case 'maintenance': return 'Đang bảo trì';
      case 'closed': return 'Tạm đóng';
      default: return status;
    }
  };

  const getRoomTypeText = (type: string) => {
    const map: Record<string, string> = {
      medical: 'Phòng khám',
      lab: 'Xét nghiệm / Cận lâm sàng',
      reception: 'Tiếp đón / Thu ngân',
      pharmacy: 'Nhà thuốc',
      utility: 'Tiện ích / Vệ sinh',
      vaccine: 'Tiêm chủng',
      office: 'Văn phòng',
      waiting: 'Phòng chờ',
      storage: 'Kho',
      inpatient: 'Lưu bệnh nhân',
      stairs: 'Cầu thang'
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          Chi tiết phòng
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">Mã phòng</p>
              <p className="text-base font-mono font-semibold text-gray-900">{room.code}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">Vị trí</p>
              <p className="text-base text-gray-900">
                Tầng {room.floor} 
                {room.wing === 'left' ? ' - Cánh trái' : room.wing === 'right' ? ' - Cánh phải' : room.wing === 'center' ? ' - Hành lang giữa' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Trạng thái</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(room.status)}`}>
                {getStatusText(room.status)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">Loại phòng</p>
              <p className="text-base text-gray-900">{getRoomTypeText(room.room_type)}</p>
            </div>
          </div>
        </div>
      </div>

      {room.notes && (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Ghi chú
          </h3>
          <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
            {room.notes}
          </p>
        </div>
      )}
    </div>
  );
};
