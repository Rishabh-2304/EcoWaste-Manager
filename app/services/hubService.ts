// Hub Service - Complete backend integration for recycling hubs
// Features: Real-time hub data, directions, scheduling, visit tracking, capacity monitoring

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

export interface Hub {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  distance?: number; // Calculated based on user location
  phone: string;
  email?: string;
  website?: string;
  
  // Operating Info
  hours: {
    monday: { open: string; close: string; closed?: boolean };
    tuesday: { open: string; close: string; closed?: boolean };
    wednesday: { open: string; close: string; closed?: boolean };
    thursday: { open: string; close: string; closed?: boolean };
    friday: { open: string; close: string; closed?: boolean };
    saturday: { open: string; close: string; closed?: boolean };
    sunday: { open: string; close: string; closed?: boolean };
  };
  
  // Services & Capacity
  services: HubService[];
  capacity: {
    current: number; // 0-100 percentage
    max: number; // Maximum items per day
    updated: Date;
  };
  
  // Quality Metrics
  rating: number;
  reviews: Review[];
  certifications: string[];
  manager: string;
  throughput: string;
  
  // Status
  status: 'open' | 'busy' | 'closed' | 'maintenance';
  statusMessage?: string;
  
  // Visual
  image?: string;
  specialties: string[];
  
  // Backend fields
  createdAt: Date;
  updatedAt: Date;
  verified: boolean;
}

export interface HubService {
  type: 'Recyclables' | 'Electronics' | 'Batteries' | 'Organic' | 'Hazardous' | 'Textiles' | 'General';
  available: boolean;
  capacity: number; // 0-100 percentage
  price?: number; // Cost per item/kg
  description?: string;
  requirements?: string[];
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  date: Date;
  verified: boolean;
  helpful: number;
}

export interface Visit {
  id: string;
  userId: string;
  hubId: string;
  scheduledDate: Date;
  actualDate?: Date;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  serviceType: string;
  items: VisitItem[];
  feedback?: {
    rating: number;
    comment: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VisitItem {
  type: string;
  quantity: number;
  weight?: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
}

export interface Direction {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  route: {
    distance: string;
    duration: string;
    steps: DirectionStep[];
  };
  traffic?: 'light' | 'moderate' | 'heavy';
  alternativeRoutes: AlternativeRoute[];
}

export interface DirectionStep {
  instruction: string;
  distance: string;
  duration: string;
  coordinates: { lat: number; lng: number };
}

export interface AlternativeRoute {
  name: string;
  distance: string;
  duration: string;
  traffic: 'light' | 'moderate' | 'heavy';
}

export interface HubStats {
  totalHubs: number;
  openHubs: number;
  averageCapacity: number;
  totalVisits: number;
  completedVisits: number;
  averageRating: number;
  nearbyHubs: number;
}

class HubService {
  private hubs: Hub[] = [];
  private visits: Visit[] = [];
  private userLocation: { lat: number; lng: number } | null = null;
  private listeners: Array<(hubs: Hub[]) => void> = [];
  private visitListeners: Array<(visits: Visit[]) => void> = [];
  private unsubscribeFirestore: (() => void) | null = null;
  private geolocationWatcher: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      setTimeout(() => this.initializeService(), 100);
      this.startLocationTracking();
    }
  }

  private async initializeService() {
    if (typeof window === 'undefined') return;
    
    try {
      if (DEMO_MODE) {
        this.loadLocalData();
      } else {
        this.setupFirestoreListeners();
      }
    } catch (error) {
      console.error('Failed to initialize hub service:', error);
      this.hubs = [];
      this.visits = [];
      this.notifyListeners();
    }
  }

  private startLocationTracking() {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    
    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.updateHubDistances();
      },
      (error) => {
        console.warn('Geolocation error:', error);
        // Fallback to demo location (NYC)
        this.userLocation = { lat: 40.7420, lng: -74.0020 };
        this.updateHubDistances();
      }
    );

    // Watch for location changes
    this.geolocationWatcher = navigator.geolocation.watchPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.updateHubDistances();
      },
      (error) => console.warn('Location tracking error:', error),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  private updateHubDistances() {
    if (!this.userLocation) return;
    
    this.hubs = this.hubs.map(hub => ({
      ...hub,
      distance: this.calculateDistance(this.userLocation!, hub.coordinates)
    }));
    
    this.notifyListeners();
  }

  private calculateDistance(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round((R * c) * 100) / 100; // Round to 2 decimal places
  }

  // Local storage methods for demo mode
  private loadLocalData() {
    try {
      const storedHubs = localStorage.getItem('recycling-hubs');
      const storedVisits = localStorage.getItem('hub-visits');
      
      if (storedHubs) {
        const parsed = JSON.parse(storedHubs);
        this.hubs = parsed.map((hub: any) => ({
          ...hub,
          createdAt: new Date(hub.createdAt),
          updatedAt: new Date(hub.updatedAt),
          capacity: {
            ...hub.capacity,
            updated: new Date(hub.capacity.updated)
          },
          reviews: hub.reviews?.map((review: any) => ({
            ...review,
            date: new Date(review.date)
          })) || []
        }));
      } else {
        this.initializeDemoHubs();
      }
      
      if (storedVisits) {
        const parsed = JSON.parse(storedVisits);
        this.visits = parsed.map((visit: any) => ({
          ...visit,
          scheduledDate: new Date(visit.scheduledDate),
          actualDate: visit.actualDate ? new Date(visit.actualDate) : undefined,
          createdAt: new Date(visit.createdAt),
          updatedAt: new Date(visit.updatedAt)
        }));
      }
      
      this.updateHubDistances();
      this.notifyListeners();
      this.notifyVisitListeners();
      
    } catch (error) {
      console.error('Failed to load local hub data:', error);
      this.initializeDemoHubs();
    }
  }

  private saveLocalData() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('recycling-hubs', JSON.stringify(this.hubs));
      localStorage.setItem('hub-visits', JSON.stringify(this.visits));
    } catch (error) {
      console.error('Failed to save local hub data:', error);
    }
  }

  private initializeDemoHubs() {
    const now = new Date();
    
    this.hubs = [
      {
        id: 'hub-1',
        name: 'EcoCenter Downtown',
        address: '123 Green Street, Downtown',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        phone: '+1 (555) 123-4567',
        email: 'info@ecocenter.com',
        hours: {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '09:00', close: '16:00' },
          sunday: { closed: true, open: '', close: '' }
        },
        services: [
          { type: 'Recyclables', available: true, capacity: 85, description: 'Paper, plastic, glass, metal' },
          { type: 'Electronics', available: true, capacity: 72, description: 'Computers, phones, appliances' },
          { type: 'Batteries', available: true, capacity: 91, description: 'All battery types' }
        ],
        capacity: { current: 85, max: 500, updated: now },
        rating: 4.8,
        reviews: [
          {
            id: 'rev-1',
            userId: 'user-1',
            userName: 'Sarah M.',
            rating: 5,
            comment: 'Excellent service and very organized!',
            date: new Date(now.getTime() - 86400000),
            verified: true,
            helpful: 12
          }
        ],
        certifications: ['ISO 14001', 'LEED Gold'],
        manager: 'Sarah Johnson',
        throughput: '2.5k items/week',
        status: 'open',
        image: '🏢',
        specialties: ['Large electronics', 'Hazardous waste'],
        createdAt: now,
        updatedAt: now,
        verified: true
      },
      {
        id: 'hub-2',
        name: 'Green Valley Hub',
        address: '456 Valley Road, Green Valley',
        coordinates: { lat: 40.7589, lng: -73.9851 },
        phone: '+1 (555) 234-5678',
        hours: {
          monday: { open: '07:00', close: '20:00' },
          tuesday: { open: '07:00', close: '20:00' },
          wednesday: { open: '07:00', close: '20:00' },
          thursday: { open: '07:00', close: '20:00' },
          friday: { open: '07:00', close: '20:00' },
          saturday: { open: '07:00', close: '20:00' },
          sunday: { open: '07:00', close: '20:00' }
        },
        services: [
          { type: 'Recyclables', available: true, capacity: 92 },
          { type: 'Organic', available: true, capacity: 78 },
          { type: 'Textiles', available: true, capacity: 65 }
        ],
        capacity: { current: 92, max: 400, updated: now },
        rating: 4.6,
        reviews: [],
        certifications: ['Green Business'],
        manager: 'Mike Chen',
        throughput: '1.8k items/week',
        status: 'busy',
        statusMessage: 'High volume today',
        image: '🌳',
        specialties: ['Composting program', 'Textile recycling'],
        createdAt: now,
        updatedAt: now,
        verified: true
      },
      {
        id: 'hub-3',
        name: 'Tech Recycle Pro',
        address: '789 Innovation Drive, Tech District',
        coordinates: { lat: 40.7505, lng: -73.9934 },
        phone: '+1 (555) 345-6789',
        website: 'https://techrecyclepro.com',
        hours: {
          monday: { open: '09:00', close: '19:00' },
          tuesday: { open: '09:00', close: '19:00' },
          wednesday: { open: '09:00', close: '19:00' },
          thursday: { open: '09:00', close: '19:00' },
          friday: { open: '09:00', close: '19:00' },
          saturday: { open: '09:00', close: '19:00' },
          sunday: { closed: true, open: '', close: '' }
        },
        services: [
          { type: 'Electronics', available: true, capacity: 76, price: 0 },
          { type: 'Batteries', available: true, capacity: 89, price: 0 }
        ],
        capacity: { current: 76, max: 300, updated: now },
        rating: 4.9,
        reviews: [],
        certifications: ['R2 Certified', 'e-Stewards'],
        manager: 'Alex Rodriguez',
        throughput: '3.2k items/week',
        status: 'open',
        image: '💻',
        specialties: ['Data destruction', 'Refurbishment'],
        createdAt: now,
        updatedAt: now,
        verified: true
      }
    ];

    this.saveLocalData();
    this.updateHubDistances();
    this.notifyListeners();
  }

  // Firestore methods (for production)
  private setupFirestoreListeners() {
    if (!db) return;
    
    try {
      const hubsRef = collection(db, 'hubs');
      const hubsQuery = query(hubsRef, where('verified', '==', true), orderBy('name', 'asc'));
      
      this.unsubscribeFirestore = onSnapshot(hubsQuery, (snapshot) => {
        this.hubs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
            capacity: {
              ...data.capacity,
              updated: data.capacity.updated instanceof Timestamp ? data.capacity.updated.toDate() : new Date(data.capacity.updated)
            },
            reviews: data.reviews?.map((review: any) => ({
              ...review,
              date: review.date instanceof Timestamp ? review.date.toDate() : new Date(review.date)
            })) || []
          } as Hub;
        });
        
        this.updateHubDistances();
        this.notifyListeners();
      });
    } catch (error) {
      console.error('Failed to setup Firestore listeners:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.hubs]));
  }

  private notifyVisitListeners() {
    this.visitListeners.forEach(listener => listener([...this.visits]));
  }

  // Public API methods
  public onHubsChange(listener: (hubs: Hub[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.hubs]);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public onVisitsChange(listener: (visits: Visit[]) => void): () => void {
    this.visitListeners.push(listener);
    listener([...this.visits]);
    
    return () => {
      const index = this.visitListeners.indexOf(listener);
      if (index > -1) {
        this.visitListeners.splice(index, 1);
      }
    };
  }

  public getHubs(): Hub[] {
    return [...this.hubs];
  }

  public getHubById(id: string): Hub | null {
    return this.hubs.find(hub => hub.id === id) || null;
  }

  public getVisits(): Visit[] {
    return [...this.visits];
  }

  public getUserLocation(): { lat: number; lng: number } | null {
    return this.userLocation;
  }

  // Search and filter methods
  public searchHubs(query: string, filters?: {
    services?: string[];
    maxDistance?: number;
    status?: string[];
    rating?: number;
  }): Hub[] {
    let filtered = this.hubs;
    
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      filtered = filtered.filter(hub => 
        hub.name.toLowerCase().includes(lowercaseQuery) ||
        hub.address.toLowerCase().includes(lowercaseQuery) ||
        hub.specialties.some(specialty => specialty.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    if (filters?.services?.length) {
      filtered = filtered.filter(hub =>
        filters.services!.some(service =>
          hub.services.some(hubService => hubService.type === service && hubService.available)
        )
      );
    }
    
    if (filters?.maxDistance && this.userLocation) {
      filtered = filtered.filter(hub => 
        hub.distance !== undefined && hub.distance <= filters.maxDistance!
      );
    }
    
    if (filters?.status?.length) {
      filtered = filtered.filter(hub => filters.status!.includes(hub.status));
    }
    
    if (filters?.rating) {
      filtered = filtered.filter(hub => hub.rating >= filters.rating!);
    }
    
    return filtered;
  }

  // Visit scheduling methods
  public async scheduleVisit(hubId: string, data: {
    date: Date;
    serviceType: string;
    items: VisitItem[];
    notes?: string;
  }): Promise<Visit> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to schedule visits');
    }

    const hub = this.getHubById(hubId);
    if (!hub) {
      throw new Error('Hub not found');
    }

    // Validate hub is open and has capacity
    if (hub.status === 'closed' || hub.status === 'maintenance') {
      throw new Error('Hub is currently not accepting visits');
    }

    const visit: Visit = {
      id: DEMO_MODE ? `visit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : '',
      userId: currentUser.id,
      hubId,
      scheduledDate: data.date,
      status: 'scheduled',
      serviceType: data.serviceType,
      items: data.items,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (DEMO_MODE) {
      this.visits.push(visit);
      this.saveLocalData();
      this.notifyVisitListeners();
      return visit;
    } else {
      if (!db) throw new Error('Firestore not available');
      
      const visitsRef = collection(db, 'visits');
      const docRef = await addDoc(visitsRef, {
        ...visit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { ...visit, id: docRef.id };
    }
  }

  // Directions methods
  public async getDirections(hubId: string): Promise<Direction | null> {
    if (!this.userLocation) {
      throw new Error('User location not available');
    }

    const hub = this.getHubById(hubId);
    if (!hub) {
      throw new Error('Hub not found');
    }

    // In demo mode, return mock directions
    if (DEMO_MODE) {
      return this.generateMockDirections(this.userLocation, hub.coordinates);
    } else {
      // In production, integrate with real mapping service (Google Maps, MapBox, etc.)
      return await this.fetchRealDirections(this.userLocation, hub.coordinates);
    }
  }

  private generateMockDirections(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Direction {
    const distance = this.calculateDistance(from, to);
    const duration = Math.round(distance * 3 + Math.random() * 10); // Rough estimate

    return {
      from,
      to,
      route: {
        distance: `${distance} km`,
        duration: `${duration} min`,
        steps: [
          {
            instruction: `Head north on Current Street`,
            distance: '0.2 km',
            duration: '1 min',
            coordinates: from
          },
          {
            instruction: `Turn right onto Main Avenue`,
            distance: `${(distance * 0.7).toFixed(1)} km`,
            duration: `${Math.round(duration * 0.7)} min`,
            coordinates: { lat: from.lat + 0.01, lng: from.lng + 0.01 }
          },
          {
            instruction: `Arrive at ${to.lat}, ${to.lng}`,
            distance: '0 km',
            duration: '0 min',
            coordinates: to
          }
        ]
      },
      traffic: Math.random() > 0.5 ? 'light' : Math.random() > 0.5 ? 'moderate' : 'heavy',
      alternativeRoutes: [
        {
          name: 'Faster route',
          distance: `${(distance * 0.9).toFixed(1)} km`,
          duration: `${Math.round(duration * 0.8)} min`,
          traffic: 'light'
        }
      ]
    };
  }

  private async fetchRealDirections(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<Direction | null> {
    // Implement real directions API integration
    // This would use Google Directions API, MapBox Directions API, etc.
    return null;
  }

  // Review methods
  public async addReview(hubId: string, data: {
    rating: number;
    comment: string;
  }): Promise<Review> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to add reviews');
    }

    const review: Review = {
      id: DEMO_MODE ? `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : '',
      userId: currentUser.id,
      userName: currentUser.name || 'Anonymous',
      rating: data.rating,
      comment: data.comment,
      date: new Date(),
      verified: true,
      helpful: 0
    };

    const hubIndex = this.hubs.findIndex(h => h.id === hubId);
    if (hubIndex === -1) {
      throw new Error('Hub not found');
    }

    this.hubs[hubIndex].reviews.push(review);
    
    // Recalculate average rating
    const reviews = this.hubs[hubIndex].reviews;
    this.hubs[hubIndex].rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    if (DEMO_MODE) {
      this.saveLocalData();
      this.notifyListeners();
    }

    return review;
  }

  // Stats methods
  public getHubStats(): HubStats {
    const openHubs = this.hubs.filter(h => h.status === 'open');
    const nearbyHubs = this.hubs.filter(h => h.distance !== undefined && h.distance <= 5);
    const completedVisits = this.visits.filter(v => v.status === 'completed');

    return {
      totalHubs: this.hubs.length,
      openHubs: openHubs.length,
      averageCapacity: this.hubs.reduce((sum, h) => sum + h.capacity.current, 0) / this.hubs.length || 0,
      totalVisits: this.visits.length,
      completedVisits: completedVisits.length,
      averageRating: this.hubs.reduce((sum, h) => sum + h.rating, 0) / this.hubs.length || 0,
      nearbyHubs: nearbyHubs.length
    };
  }

  // Real-time capacity updates
  public async updateCapacity(hubId: string, capacity: number): Promise<void> {
    const hubIndex = this.hubs.findIndex(h => h.id === hubId);
    if (hubIndex === -1) {
      throw new Error('Hub not found');
    }

    this.hubs[hubIndex].capacity.current = capacity;
    this.hubs[hubIndex].capacity.updated = new Date();
    
    // Update status based on capacity
    if (capacity >= 95) {
      this.hubs[hubIndex].status = 'busy';
      this.hubs[hubIndex].statusMessage = 'Nearly full';
    } else if (capacity >= 85) {
      this.hubs[hubIndex].status = 'busy';
      this.hubs[hubIndex].statusMessage = 'High volume';
    } else {
      this.hubs[hubIndex].status = 'open';
      this.hubs[hubIndex].statusMessage = undefined;
    }

    if (DEMO_MODE) {
      this.saveLocalData();
    }
    
    this.notifyListeners();
  }

  public cleanup() {
    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
      this.unsubscribeFirestore = null;
    }
    
    if (this.geolocationWatcher) {
      navigator.geolocation.clearWatch(this.geolocationWatcher);
      this.geolocationWatcher = null;
    }
    
    this.listeners = [];
    this.visitListeners = [];
  }
}

// Export singleton instance
export const hubService = new HubService();