import { create } from 'zustand';

// Types
export type WasteCategory = 'Recyclable' | 'Organic' | 'General Waste';
export type CollectionStatus = 'scheduled' | 'in-progress' | 'completed';

export interface Collection {
  id: string;
  type: WasteCategory;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  status: CollectionStatus;
  items: string[];
  createdAt: number;
}

export interface SortRecord {
  id: string;
  item: string;
  category: WasteCategory;
  confidence: number;
  points: number;
  tips?: string[];
  timestamp: number;
}

export interface RewardClaim {
  id: number; // reward id
  title: string;
  pointsSpent: number;
  claimedAt: number;
}

interface EcoState {
  points: number;
  collections: Collection[];
  recentSorts: SortRecord[];
  claimedRewards: RewardClaim[];
}

interface EcoActions {
  addPoints: (amount: number) => void;
  addSort: (record: Omit<SortRecord, 'id' | 'timestamp'>) => SortRecord;
  addCollection: (col: Omit<Collection, 'id' | 'createdAt' | 'status'> & { status?: CollectionStatus }) => Collection;
  updateCollectionStatus: (id: string, status: CollectionStatus) => void;
  addCollectionFromHub: (hubName: string, type?: WasteCategory) => Collection;
  claimReward: (rewardId: number, title: string, cost: number) => boolean;
  reset: () => void;
}

const STORAGE_KEY = 'eco-store-v1';

function safeLoad(): EcoState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EcoState;
  } catch {
    return null;
  }
}

function safeSave(state: EcoState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const defaultState: EcoState = {
  points: 250, // start with some demo points
  collections: [],
  recentSorts: [],
  claimedRewards: [],
};

export const useEcoStore = create<EcoState & EcoActions>((set, get) => ({
  ...(safeLoad() ?? defaultState),

  addPoints: (amount) => set((s) => {
    const next = { ...s, points: Math.max(0, s.points + amount) };
    safeSave(next);
    return next;
  }),

  addSort: (record) => {
    const newRec: SortRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: Date.now(),
      ...record,
    };
    set((s) => {
      const next: EcoState = {
        ...s,
        points: s.points + (record.points ?? 0),
        recentSorts: [newRec, ...s.recentSorts].slice(0, 20),
      };
      safeSave(next);
      return next;
    });
    return newRec;
  },

  addCollection: (col) => {
    const newCol: Collection = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36),
      createdAt: Date.now(),
      status: col.status ?? 'scheduled',
      ...col,
    };
    set((s) => {
      const next = { ...s, collections: [newCol, ...s.collections] };
      safeSave(next);
      return next;
    });
    return newCol;
  },

  updateCollectionStatus: (id, status) => set((s) => {
    const collections = s.collections.map((c) => (c.id === id ? { ...c, status } : c));
    const next = { ...s, collections };
    safeSave(next);
    return next;
  }),

  addCollectionFromHub: (hubName, type = 'Recyclable') => {
    // Next hour rounded
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 5);
    return get().addCollection({ type, date, time, location: hubName, items: [] });
  },

  claimReward: (rewardId, title, cost) => {
    const s = get();
    if (s.points < cost) return false;
    const claim: RewardClaim = { id: rewardId, title, pointsSpent: cost, claimedAt: Date.now() };
    const next: EcoState = {
      ...s,
      points: s.points - cost,
      claimedRewards: [claim, ...s.claimedRewards],
    };
    set(next);
    safeSave(next);
    return true;
  },

  reset: () => set(() => {
    safeSave(defaultState);
    return defaultState;
  }),
}));

