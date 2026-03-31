import React, { useState } from 'react';
import { useAppContext } from '../../lib/AppContext';
import { RoomBlock } from './RoomBlock';
import { Room } from '../../lib/types';
import { RoomDrawer } from '../room-detail/RoomDrawer';

export const FloorPlan: React.FC = () => {
  const { rooms, maintenanceRequests } = useAppContext();
  const [activeFloor, setActiveFloor] = useState<number>(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const floorRooms = rooms.filter(r => r.floor === activeFloor).sort((a, b) => a.position_order - b.position_order);
  
  const leftWing = floorRooms.filter(r => r.wing === 'left');
  const rightWing = floorRooms.filter(r => r.wing === 'right');
  const centerWing = floorRooms.filter(r => r.wing === 'center' || r.wing === null);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      {/* Floor Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {[1, 2, 3].map(floor => (
          <button
            key={floor}
            onClick={() => setActiveFloor(floor)}
            className={`flex-1 py-4 font-semibold text-sm transition-colors ${
              activeFloor === floor 
                ? 'text-primary border-b-2 border-primary bg-white' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Tầng {floor}
          </button>
        ))}
      </div>

      {/* Floor Map Container */}
      <div className="flex-1 overflow-auto p-4 md:p-8 bg-[#f8f9fa] relative">
        <div className="max-w-4xl mx-auto min-w-[320px]">
          {activeFloor === 1 || activeFloor === 2 ? (
            <div className="grid grid-cols-[1fr_60px_1fr] md:grid-cols-[1fr_100px_1fr] gap-4">
              {/* Left Wing */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Cánh Trái</div>
                {leftWing.map(room => (
                  <RoomBlock key={room.id} room={room} onClick={setSelectedRoom} maintenanceRequests={maintenanceRequests} />
                ))}
              </div>

              {/* Hallway */}
              <div className="bg-gray-200/50 rounded-lg border border-gray-200 flex items-center justify-center relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 font-medium tracking-[0.2em] opacity-50" style={{ writingMode: 'vertical-rl' }}>
                  HÀNH LANG GIỮA
                </div>
              </div>

              {/* Right Wing */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Cánh Phải</div>
                {rightWing.map(room => (
                  <RoomBlock key={room.id} room={room} onClick={setSelectedRoom} maintenanceRequests={maintenanceRequests} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_60px] md:grid-cols-[1fr_100px] gap-4 max-w-2xl mx-auto">
              {/* Single Row for T3 */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Phòng</div>
                {centerWing.map(room => (
                  <RoomBlock key={room.id} room={room} onClick={setSelectedRoom} maintenanceRequests={maintenanceRequests} />
                ))}
              </div>

              {/* Hallway */}
              <div className="bg-gray-200/50 rounded-lg border border-gray-200 flex items-center justify-center relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 font-medium tracking-[0.2em] opacity-50" style={{ writingMode: 'vertical-rl' }}>
                  HÀNH LANG
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedRoom && (
        <RoomDrawer 
          room={selectedRoom} 
          isOpen={!!selectedRoom} 
          onClose={() => setSelectedRoom(null)} 
        />
      )}
    </div>
  );
};
