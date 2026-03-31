import React, { useState } from 'react';
import { Room, Priority, SupplyRequestItem } from '../../lib/types';
import { useAppContext } from '../../lib/AppContext';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

export const SupplyForm: React.FC<{ room: Room; onCancel: () => void; onSuccess: () => void }> = ({ room, onCancel, onSuccess }) => {
  const { addSupplyRequest } = useAppContext();
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [requestedBy, setRequestedBy] = useState('');
  const [items, setItems] = useState<Omit<SupplyRequestItem, 'id' | 'supply_request_id'>[]>([
    { item_name: '', unit: 'cái', quantity: 1, notes: '' }
  ]);

  const units = ['cái', 'bộ', 'hộp', 'gói', 'chai', 'cuộn', 'kg', 'lít', 'thùng'];

  const handleAddItem = () => {
    setItems([...items, { item_name: '', unit: 'cái', quantity: 1, notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof Omit<SupplyRequestItem, 'id' | 'supply_request_id'>, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || items.some(i => !i.item_name.trim() || i.quantity <= 0)) return;

    addSupplyRequest({
      room_id: room.id,
      title,
      reason,
      priority,
      requested_by: requestedBy || 'Nhân viên',
      items: items as SupplyRequestItem[]
    });
    
    onSuccess();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <button onClick={onCancel} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-bold text-gray-900">Tạo đề xuất vật tư</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiêu đề đề xuất <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder="VD: Đề xuất vật tư y tế tháng 10"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mức độ ưu tiên</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as Priority)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
            >
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Người đề xuất</label>
            <input
              type="text"
              value={requestedBy}
              onChange={e => setRequestedBy(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              placeholder="Tên người đề xuất"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Lý do đề xuất</label>
          <textarea
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            placeholder="Lý do cần cấp phát vật tư..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">Danh sách vật tư <span className="text-red-500">*</span></label>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" /> Thêm dòng
            </button>
          </div>
          
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        value={item.item_name}
                        onChange={e => handleItemChange(index, 'item_name', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        placeholder="Tên vật tư"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-center"
                        placeholder="SL"
                      />
                    </div>
                    <div className="w-24">
                      <select
                        value={item.unit}
                        onChange={e => handleItemChange(index, 'unit', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
                      >
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={e => handleItemChange(index, 'notes', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder="Ghi chú (không bắt buộc)"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 mt-6 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            Tạo đề xuất
          </button>
        </div>
      </form>
    </div>
  );
};
