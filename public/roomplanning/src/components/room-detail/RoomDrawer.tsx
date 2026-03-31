import React, { useState } from 'react';
import { Room } from '../../lib/types';
import { X, Info, Wrench, PackagePlus } from 'lucide-react';
import { RoomInfo } from './RoomInfo';
import { MaintenanceTab } from './MaintenanceTab';
import { SupplyTab } from './SupplyTab';
import { AnimatePresence, motion } from 'framer-motion';

interface RoomDrawerProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
}

export const RoomDrawer: React.FC<RoomDrawerProps> = ({ room, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'maintenance' | 'supply'>('info');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-2xl z-50 flex flex-col shadow-2xl md:right-0 md:left-auto md:top-0 md:h-full md:w-[450px] md:rounded-l-2xl md:rounded-tr-none md:transform-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{room.name}</h2>
                <p className="text-sm text-gray-500 font-mono">{room.code} • Tầng {room.floor}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'info' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Info className="w-4 h-4" />
                Thông tin
              </button>
              <button 
                onClick={() => setActiveTab('maintenance')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'maintenance' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Wrench className="w-4 h-4" />
                Sự cố
              </button>
              <button 
                onClick={() => setActiveTab('supply')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'supply' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <PackagePlus className="w-4 h-4" />
                Vật tư
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {activeTab === 'info' && <RoomInfo room={room} />}
              {activeTab === 'maintenance' && <MaintenanceTab room={room} />}
              {activeTab === 'supply' && <SupplyTab room={room} />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
