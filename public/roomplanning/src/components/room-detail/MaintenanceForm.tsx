import React, { useState } from 'react';
import { Room, Priority } from '../../lib/types';
import { useAppContext } from '../../lib/AppContext';
import { ArrowLeft, Save, Image as ImageIcon, X } from 'lucide-react';

export const MaintenanceForm: React.FC<{ room: Room; onCancel: () => void; onSuccess: () => void }> = ({ room, onCancel, onSuccess }) => {
  const { addMaintenanceRequest } = useAppContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [requestType, setRequestType] = useState<'maintenance' | 'incident' | 'repair'>('incident');
  const [reportedBy, setReportedBy] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addMaintenanceRequest({
      room_id: room.id,
      title,
      description,
      priority,
      request_type: requestType,
      reported_by: reportedBy || 'Nhân viên',
      images
    });
    
    // In a real app, show a toast here
    onSuccess();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mock image upload
    if (images.length >= 3) return;
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <button onClick={onCancel} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="text-lg font-bold text-gray-900">Báo cáo sự cố mới</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder="VD: Điều hòa không mát"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Loại yêu cầu</label>
            <select
              value={requestType}
              onChange={e => setRequestType(e.target.value as any)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
            >
              <option value="incident">Sự cố</option>
              <option value="repair">Sửa chữa</option>
              <option value="maintenance">Bảo trì định kỳ</option>
            </select>
          </div>
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Mô tả chi tiết</label>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            placeholder="Mô tả rõ tình trạng sự cố..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Người báo cáo</label>
          <input
            type="text"
            value={reportedBy}
            onChange={e => setReportedBy(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            placeholder="Tên người báo cáo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh đính kèm ({images.length}/3)</label>
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden group">
                <img src={img} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-primary hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors">
                <ImageIcon className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Thêm ảnh</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
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
            Gửi yêu cầu
          </button>
        </div>
      </form>
    </div>
  );
};
