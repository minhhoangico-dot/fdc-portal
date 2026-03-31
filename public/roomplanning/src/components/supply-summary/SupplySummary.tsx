import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../lib/AppContext';
import { SupplyPrint } from './SupplyPrint';
import { X, Printer, Filter, Calendar, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const SupplySummary: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { supplyRequests, rooms } = useAppContext();
  const [isPrinting, setIsPrinting] = useState(false);
  const [filterFloor, setFilterFloor] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  const filteredRequests = useMemo(() => {
    return supplyRequests.filter(req => {
      const room = rooms.find(r => r.id === req.room_id);
      if (filterFloor !== 'all' && room?.floor.toString() !== filterFloor) return false;
      if (filterStatus !== 'all' && req.status !== filterStatus) return false;
      return true;
    });
  }, [supplyRequests, rooms, filterFloor, filterStatus]);

  // Group items by name and unit
  const aggregatedItems = useMemo(() => {
    const map = new Map<string, { name: string; unit: string; total: number; rooms: Set<string>; notes: Set<string>; priorities: Set<string> }>();
    
    filteredRequests.forEach(req => {
      const room = rooms.find(r => r.id === req.room_id);
      const roomName = room ? `${room.name} (${room.code})` : 'Không rõ';
      
      req.items.forEach(item => {
        const key = `${item.item_name.toLowerCase().trim()}_${item.unit}`;
        if (!map.has(key)) {
          map.set(key, { name: item.item_name, unit: item.unit, total: 0, rooms: new Set(), notes: new Set(), priorities: new Set() });
        }
        const entry = map.get(key)!;
        entry.total += item.quantity;
        entry.rooms.add(roomName);
        entry.priorities.add(req.priority);
        if (item.notes) entry.notes.add(item.notes);
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRequests, rooms]);

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Khẩn cấp';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
      default: return priority;
    }
  };

  if (!isOpen) return null;

  if (isPrinting) {
    return <SupplyPrint items={aggregatedItems} onClose={() => setIsPrinting(false)} filterFloor={filterFloor} filterStatus={filterStatus} />;
  }

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">Tổng hợp đề xuất vật tư</h2>
        </div>
        <button 
          onClick={() => setIsPrinting(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">In / Xuất PDF</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-gray-500 font-medium text-sm mr-2">
              <Filter className="w-4 h-4" /> Bộ lọc:
            </div>
            
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-400" />
              <select 
                value={filterFloor} 
                onChange={e => setFilterFloor(e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="all">Tất cả các tầng</option>
                <option value="1">Tầng 1</option>
                <option value="2">Tầng 2</option>
                <option value="3">Tầng 3</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="purchased">Đã mua</option>
                <option value="rejected">Từ chối</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">STT</th>
                    <th className="px-4 py-3">Tên vật tư</th>
                    <th className="px-4 py-3 w-24">Đơn vị</th>
                    <th className="px-4 py-3 w-24 text-center">Tổng SL</th>
                    <th className="px-4 py-3">Phòng yêu cầu</th>
                    <th className="px-4 py-3">Mức độ</th>
                    <th className="px-4 py-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aggregatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Không có dữ liệu phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    aggregatedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-center text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                        <td className="px-4 py-3 text-center font-bold text-primary">{item.total}</td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="flex flex-wrap gap-1">
                            {Array.from(item.rooms).map((room, i) => (
                              <span key={i} className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs">{room}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {Array.from(item.priorities).map(p => getPriorityText(p as string)).join(', ')}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {Array.from(item.notes).join('; ')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
