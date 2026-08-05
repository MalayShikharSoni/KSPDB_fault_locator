import { create } from 'zustand';

export type PoleState = 'live' | 'dark' | 'unknown';
export type TopologySource = 'surveyed' | 'inferred' | 'inferred_ambiguous';

export interface GridPole {
  id: string;
  dtId: string;
  lat: number;
  lon: number;
  deviceId: string | null;
  state: PoleState;
}

export interface GridDT {
  id: string;
  lat: number;
  lon: number;
  capacityKva: number;
}

export interface TopologyEdge {
  parentPoleId: string | null;
  childPoleId: string;
  topologySource: TopologySource;
}

export interface Incident {
  id: string;
  type: string;
  affectedPoles: GridPole[];
  confidenceScore: number;
  factors: {
    topology: number;
    corroboration: number;
    freshness: number;
    clarity: number;
  };
}

export interface HardwareIssue {
  id: string;
  type: 'HardwareIssue';
  affectedPoles: GridPole[];
}

export interface GridStateData {
  dts: GridDT[];
  poles: GridPole[];
  edges: TopologyEdge[];
}

export interface ActiveIncidentsData {
  incidents: Incident[];
  hardwareIssues: HardwareIssue[];
}

interface StoreState {
  gridState: GridStateData | null;
  activeIncidents: ActiveIncidentsData | null;
  isConnected: boolean;
  selectedTargetId: string | null;
  selectedContextDtId: string | null;
  setSelectedTargetId: (id: string | null) => void;
  setSelectedContextDtId: (id: string | null) => void;
  initStream: () => () => void;
}

export const useStore = create<StoreState>((set) => ({
  gridState: null,
  activeIncidents: null,
  isConnected: false,
  selectedTargetId: null,
  selectedContextDtId: null,
  
  setSelectedTargetId: (id) => set({ selectedTargetId: id }),
  setSelectedContextDtId: (id) => set({ selectedContextDtId: id }),
  
  initStream: () => {
    const API_URL = import.meta.env.VITE_API_URL || '';
    const eventSource = new EventSource(`${API_URL}/api/stream/state`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        set({
          gridState: data.gridState,
          activeIncidents: data.activeIncidents,
          isConnected: true
        });
      } catch (e) {
        console.error('Failed to parse SSE data', e);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      set({ isConnected: false });
      // EventSource automatically attempts to reconnect
    };

    return () => eventSource.close();
  }
}));
