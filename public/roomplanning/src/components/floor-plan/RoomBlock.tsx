import React from 'react';
import { Room, MaintenanceRequest } from '../../lib/types';
import { Stethoscope, FlaskConical, Users, Pill, Wrench, Syringe, Briefcase, Clock, Package, Bed, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';

interface RoomBlockProps {
  room: Room;
  onClick: (room: Room) => void;
  maintenanceRequests: MaintenanceRequest[];
}

export const RoomBlock: React.FC<RoomBlockProps> = ({ room, onClick, maintenanceRequests }) => {
  const activeRequests = maintenanceRequests.filter(r => r.room_id === room.id && r.status !== 'completed' && r.status !== 'cancelled');
  
  const hasUrgent = activeRequests.some(r => r.priority === 'urgent');
  const hasHigh = activeRequests.some(r => r.priority === 'high');
  const hasMedium = activeRequests.some(r => r.priority === 'medium');

  let badgeColor = '';
  if (hasUrgent) badgeColor = 'bg-red-500';
  else if (hasHigh) badgeColor = 'bg-orange-500';
  else if (hasMedium) badgeColor = 'bg-yellow-500';
  else if (activeRequests.length > 0) badgeColor = 'bg-blue-500';

  const getIcon = () => {
    switch (room.room_type) {
      case 'medical': return <Stethoscope className="w-5 h-5 opacity-70" />;
      case 'lab': return <FlaskConical className="w-5 h-5 opacity-70" />;
      case 'reception': return <Users className="w-5 h-5 opacity-70" />;
      case 'pharmacy': return <Pill className="w-5 h-5 opacity-70" />;
      case 'utility': return <Wrench className="w-5 h-5 opacity-70" />;
      case 'vaccine': return <Syringe className="w-5 h-5 opacity-70" />;
      case 'office': return <Briefcase className="w-5 h-5 opacity-70" />;
      case 'waiting': return <Clock className="w-5 h-5 opacity-70" />;
      case 'storage': return <Package className="w-5 h-5 opacity-70" />;
      case 'inpatient': return <Bed className="w-5 h-5 opacity-70" />;
      case 'stairs': return <ArrowUpDown className="w-5 h-5 opacity-70" />;
      default: return null;
    }
  };

  const getBgColor = () => {
    switch (room.room_type) {
      case 'medical': return 'bg-[#e8f5ee] border-[#bce3d0]';
      case 'lab': return 'bg-[#fde8e8] border-[#f8c4c4]';
      case 'reception': return 'bg-[#dceef8] border-[#b6dcf2]';
      case 'pharmacy': return 'bg-[#f0e8f5] border-[#d9c4e8]';
      case 'utility': return 'bg-[#f5f5f5] border-[#e0e0e0]';
      case 'vaccine': return 'bg-[#e8eef5] border-[#c4d6e8]';
      case 'office': return 'bg-[#fdf6e8] border-[#f8e4b6]';
      case 'waiting': return 'bg-[#fef3e2] border-[#fce0b0]';
      case 'storage': return 'bg-[#f5f5f5] border-[#e0e0e0]';
      case 'inpatient': return 'bg-[#e8f0fe] border-[#c4d8f8]';
      case 'stairs': return 'bg-[#e0e0e0] border-[#bdbdbd]';
      default: return 'bg-white border-gray-200';
    }
  };

  return (
    <div 
      onClick={() => onClick(room)}
      className={clsx(
        'relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md flex flex-col items-center justify-center text-center',
        getBgColor(),
        room.code === 'T3-PHONGHOP' ? 'min-h-[160px]' : 'min-h-[80px]'
      )}
    >
      {badgeColor && (
        <div className={clsx('absolute -top-2 -right-2 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-sm', badgeColor)}>
          {activeRequests.length}
        </div>
      )}
      <div className="mb-1 text-gray-700">
        {getIcon()}
      </div>
      <div className="font-semibold text-sm text-gray-800 leading-tight">{room.name}</div>
      <div className="text-[10px] text-gray-500 mt-1 font-mono bg-white/50 px-1.5 py-0.5 rounded">{room.code}</div>
    </div>
  );
};
