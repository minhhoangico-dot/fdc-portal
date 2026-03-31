import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Room, MaintenanceRequest, SupplyRequest } from './types';
import { seedRooms, seedMaintenance, seedSupply } from './seed-data';

interface AppContextType {
  rooms: Room[];
  maintenanceRequests: MaintenanceRequest[];
  supplyRequests: SupplyRequest[];
  addMaintenanceRequest: (request: Omit<MaintenanceRequest, 'id' | 'created_at' | 'status'>) => void;
  addSupplyRequest: (request: Omit<SupplyRequest, 'id' | 'created_at' | 'status'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);

  useEffect(() => {
    // Load from localStorage or use seed data
    const storedRooms = localStorage.getItem('fdc_rooms');
    const storedMaintenance = localStorage.getItem('fdc_maintenance');
    const storedSupply = localStorage.getItem('fdc_supply');

    if (storedRooms) setRooms(JSON.parse(storedRooms));
    else setRooms(seedRooms);

    if (storedMaintenance) setMaintenanceRequests(JSON.parse(storedMaintenance));
    else setMaintenanceRequests(seedMaintenance);

    if (storedSupply) setSupplyRequests(JSON.parse(storedSupply));
    else setSupplyRequests(seedSupply);
  }, []);

  useEffect(() => {
    if (rooms.length > 0) localStorage.setItem('fdc_rooms', JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    if (maintenanceRequests.length > 0) localStorage.setItem('fdc_maintenance', JSON.stringify(maintenanceRequests));
  }, [maintenanceRequests]);

  useEffect(() => {
    if (supplyRequests.length > 0) localStorage.setItem('fdc_supply', JSON.stringify(supplyRequests));
  }, [supplyRequests]);

  const addMaintenanceRequest = (request: Omit<MaintenanceRequest, 'id' | 'created_at' | 'status'>) => {
    const newRequest: MaintenanceRequest = {
      ...request,
      id: `m${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'new',
    };
    setMaintenanceRequests(prev => [newRequest, ...prev]);
  };

  const addSupplyRequest = (request: Omit<SupplyRequest, 'id' | 'created_at' | 'status'>) => {
    const newRequest: SupplyRequest = {
      ...request,
      id: `s${Date.now()}`,
      created_at: new Date().toISOString(),
      status: 'pending',
      items: request.items.map((item, index) => ({
        ...item,
        id: `si${Date.now()}_${index}`,
        supply_request_id: `s${Date.now()}`
      }))
    };
    setSupplyRequests(prev => [newRequest, ...prev]);
  };

  return (
    <AppContext.Provider value={{ rooms, maintenanceRequests, supplyRequests, addMaintenanceRequest, addSupplyRequest }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
