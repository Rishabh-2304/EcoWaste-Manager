// Schedule Service - Backend integration for waste collection scheduling
// Supports both Firebase Firestore and localStorage (demo mode)

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, DEMO_MODE } from '../lib/firebase';
import { authService } from './authService';

export interface ScheduledPickup {
  id: string;
  userId: string;
  date: Date;
  time: string;
  wasteType: 'General' | 'Recyclables' | 'Organic' | 'Hazardous' | 'Electronic';
  address: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
  estimatedWeight: number;
  actualWeight?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Optional fields for enhanced tracking
  collectorId?: string;
  pickupWindow?: {
    start: string;
    end: string;
  };
  specialInstructions?: string;
  recurringSchedule?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    dayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
    dayOfMonth?: number; // 1-31
  };
}

export interface CreatePickupData {
  date: Date;
  time: string;
  wasteType: ScheduledPickup['wasteType'];
  estimatedWeight: number;
  address?: string;
  notes?: string;
  specialInstructions?: string;
  recurringSchedule?: ScheduledPickup['recurringSchedule'];
}

export interface UpdatePickupData extends Partial<CreatePickupData> {
  status?: ScheduledPickup['status'];
  actualWeight?: number;
  collectorId?: string;
}

export interface PickupStats {
  totalScheduled: number;
  totalCompleted: number;
  totalWeight: number;
  upcomingThisWeek: number;
  completedThisWeek: number;
  totalSaved: {
    weight: number;
    co2: number;
    points: number;
  };
}

class ScheduleService {
  private pickups: ScheduledPickup[] = [];
  private listeners: Array<(pickups: ScheduledPickup[]) => void> = [];
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    // Delay initialization to avoid SSR issues
    if (typeof window !== 'undefined') {
      setTimeout(() => this.initializeService(), 100);
    }
  }

  private initializeService() {
    if (typeof window === 'undefined') return;
    
    try {
      if (DEMO_MODE) {
        this.loadLocalPickups();
      } else {
        this.setupFirestoreListener();
      }
    } catch (error) {
      console.error('Failed to initialize schedule service:', error);
      // Fall back to empty array
      this.pickups = [];
      this.notifyListeners();
    }
  }

  // Local storage methods for demo mode
  private loadLocalPickups() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('scheduled-pickups');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.pickups = parsed.map((pickup: any) => ({
          ...pickup,
          date: new Date(pickup.date),
          createdAt: new Date(pickup.createdAt),
          updatedAt: new Date(pickup.updatedAt)
        }));
        this.notifyListeners();
      } else {
        // Initialize with some demo data
        this.initializeDemoData();
      }
    } catch (error) {
      console.error('Failed to load local pickups:', error);
      this.initializeDemoData();
    }
  }

  private saveLocalPickups() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('scheduled-pickups', JSON.stringify(this.pickups));
    } catch (error) {
      console.error('Failed to save local pickups:', error);
    }
  }

  private initializeDemoData() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      // If no user is available, initialize with empty array and notify listeners
      this.pickups = [];
      this.notifyListeners();
      return;
    }

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    this.pickups = [
      {
        id: 'demo-pickup-1',
        userId: currentUser.id,
        date: tomorrow,
        time: '10:00 AM',
        wasteType: 'Recyclables',
        address: currentUser.city ? `${currentUser.city}` : '123 Green St, Eco City',
        status: 'scheduled',
        estimatedWeight: 15,
        createdAt: now,
        updatedAt: now,
        notes: 'Mixed recyclables - paper, plastic, glass'
      },
      {
        id: 'demo-pickup-2',
        userId: currentUser.id,
        date: nextWeek,
        time: '2:00 PM',
        wasteType: 'Organic',
        address: currentUser.city ? `${currentUser.city}` : '123 Green St, Eco City',
        status: 'scheduled',
        estimatedWeight: 8,
        createdAt: now,
        updatedAt: now,
        recurringSchedule: {
          frequency: 'weekly',
          dayOfWeek: nextWeek.getDay()
        }
      },
      {
        id: 'demo-pickup-3',
        userId: currentUser.id,
        date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        time: '9:00 AM',
        wasteType: 'General',
        address: currentUser.city ? `${currentUser.city}` : '123 Green St, Eco City',
        status: 'completed',
        estimatedWeight: 12,
        actualWeight: 11.5,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    this.saveLocalPickups();
    this.notifyListeners();
  }

  // Firestore methods
  private setupFirestoreListener() {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || !db) return;

    try {
      const pickupsRef = collection(db, 'pickups');
      const q = query(
        pickupsRef,
        where('userId', '==', currentUser.id),
        orderBy('date', 'asc')
      );

      this.unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        this.pickups = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt)
          } as ScheduledPickup;
        });
        this.notifyListeners();
      });
    } catch (error) {
      console.error('Failed to setup Firestore listener:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.pickups]));
  }

  // Public API methods
  public onPickupsChange(listener: (pickups: ScheduledPickup[]) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current data
    listener([...this.pickups]);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async createPickup(data: CreatePickupData): Promise<ScheduledPickup> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to schedule pickups');
    }

    const now = new Date();
    const pickup: ScheduledPickup = {
      id: '', // Will be set below
      userId: currentUser.id,
      address: data.address || currentUser.city || 'Address not set',
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
      ...data
    };

    if (DEMO_MODE) {
      pickup.id = `pickup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.pickups.push(pickup);
      this.pickups.sort((a, b) => a.date.getTime() - b.date.getTime());
      this.saveLocalPickups();
      this.notifyListeners();
      return pickup;
    } else {
      if (!db) throw new Error('Firestore not available');
      
      const pickupsRef = collection(db, 'pickups');
      const docRef = await addDoc(pickupsRef, {
        ...pickup,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { ...pickup, id: docRef.id };
    }
  }

  public async updatePickup(id: string, updates: UpdatePickupData): Promise<void> {
    if (DEMO_MODE) {
      const index = this.pickups.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Pickup not found');
      
      this.pickups[index] = {
        ...this.pickups[index],
        ...updates,
        updatedAt: new Date()
      };
      
      this.saveLocalPickups();
      this.notifyListeners();
    } else {
      if (!db) throw new Error('Firestore not available');
      
      const pickupRef = doc(db, 'pickups', id);
      await updateDoc(pickupRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
  }

  public async deletePickup(id: string): Promise<void> {
    if (DEMO_MODE) {
      this.pickups = this.pickups.filter(p => p.id !== id);
      this.saveLocalPickups();
      this.notifyListeners();
    } else {
      if (!db) throw new Error('Firestore not available');
      
      const pickupRef = doc(db, 'pickups', id);
      await deleteDoc(pickupRef);
    }
  }

  public async cancelPickup(id: string): Promise<void> {
    await this.updatePickup(id, { 
      status: 'cancelled',
      updatedAt: new Date()
    });
  }

  public async completePickup(id: string, actualWeight?: number): Promise<void> {
    await this.updatePickup(id, { 
      status: 'completed',
      actualWeight: actualWeight,
      updatedAt: new Date()
    });

    // Award eco points for completed pickup
    if (actualWeight) {
      const points = Math.round(actualWeight * 2); // 2 points per kg
      const co2Saved = actualWeight * 0.5; // Estimate 0.5 kg CO2 saved per kg waste
      
      await authService.addEcoPoints(points);
      await authService.updateWasteStats(actualWeight, co2Saved);
    }
  }

  public getPickups(): ScheduledPickup[] {
    return [...this.pickups];
  }

  public getUpcomingPickups(): ScheduledPickup[] {
    const now = new Date();
    return this.pickups
      .filter(p => p.status === 'scheduled' && p.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  public getPickupsByStatus(status: ScheduledPickup['status']): ScheduledPickup[] {
    return this.pickups.filter(p => p.status === status);
  }

  public getPickupStats(): PickupStats {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of this week
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const scheduled = this.pickups.filter(p => p.status === 'scheduled');
    const completed = this.pickups.filter(p => p.status === 'completed');
    
    const upcomingThisWeek = this.pickups.filter(p => 
      p.status === 'scheduled' && 
      p.date >= weekStart && 
      p.date < weekEnd
    );
    
    const completedThisWeek = this.pickups.filter(p => 
      p.status === 'completed' && 
      p.updatedAt >= weekStart && 
      p.updatedAt < weekEnd
    );

    const totalWeight = completed.reduce((sum, p) => sum + (p.actualWeight || p.estimatedWeight), 0);
    const co2Saved = totalWeight * 0.5; // Estimate
    const points = Math.round(totalWeight * 2);

    return {
      totalScheduled: scheduled.length,
      totalCompleted: completed.length,
      totalWeight,
      upcomingThisWeek: upcomingThisWeek.length,
      completedThisWeek: completedThisWeek.length,
      totalSaved: {
        weight: totalWeight,
        co2: co2Saved,
        points
      }
    };
  }

  // Utility methods
  public getAvailableTimeSlots(date: Date): string[] {
    const dayPickups = this.pickups.filter(p => 
      p.status === 'scheduled' && 
      p.date.toDateString() === date.toDateString()
    );
    
    const allTimeSlots = [
      '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
      '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM'
    ];
    
    const takenSlots = dayPickups.map(p => p.time);
    return allTimeSlots.filter(slot => !takenSlots.includes(slot));
  }

  public validatePickupDate(date: Date): { isValid: boolean; message?: string } {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    if (date < tomorrow) {
      return { 
        isValid: false, 
        message: 'Pickup must be scheduled at least 24 hours in advance' 
      };
    }

    const maxDate = new Date(now);
    maxDate.setMonth(now.getMonth() + 2); // Max 2 months in advance

    if (date > maxDate) {
      return { 
        isValid: false, 
        message: 'Pickup cannot be scheduled more than 2 months in advance' 
      };
    }

    // Check if it's a weekend (Saturday = 6, Sunday = 0)
    if (date.getDay() === 0 || date.getDay() === 6) {
      return { 
        isValid: false, 
        message: 'Weekend pickups are not available. Please choose a weekday.' 
      };
    }

    return { isValid: true };
  }

  public reinitialize() {
    // Clean up existing listeners
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
    
    // Reinitialize the service
    this.initializeService();
  }

  public cleanup() {
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
    this.listeners = [];
  }
}

// Export singleton instance
export const scheduleService = new ScheduleService();
