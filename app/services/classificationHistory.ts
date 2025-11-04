// Classification History Service
// Records and manages all waste classifications for analytics and tracking

export interface ClassificationRecord {
  id: string;
  timestamp: Date;
  filename: string;
  fileSize: number;
  itemName: string;
  category: 'Recyclable' | 'Organic' | 'Hazardous' | 'General Waste';
  confidence: number;
  recyclableRate: number;
  points: number;
  description: string;
  disposalMethod: string;
  tips: string[];
  imageUrl?: string;
  userLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  sessionId: string;
}

export interface ClassificationStats {
  totalClassifications: number;
  totalPoints: number;
  categoryBreakdown: Record<string, number>;
  averageRecyclableRate: number;
  topItems: Array<{ item: string; count: number; totalPoints: number }>;
  weeklyStats: Array<{ date: string; count: number; points: number }>;
  environmentalImpact: {
    itemsRecycled: number;
    itemsComposted: number;
    wasteReduced: number; // in kg
    co2Saved: number; // in kg
  };
}

class ClassificationHistoryService {
  private storageKey = 'ecowaste-classification-history';
  private sessionId: string;

  constructor() {
    // Generate or retrieve session ID
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
      return `session_${Date.now()}_fallback`;
    }
    
    try {
      const stored = localStorage.getItem('ecowaste-session-id');
      if (stored) return stored;
      
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ecowaste-session-id', newSessionId);
      return newSessionId;
    } catch (error) {
      console.warn('Failed to access localStorage for session ID:', error);
      return `session_${Date.now()}_fallback`;
    }
  }

  // Save a new classification record
  saveClassification(record: Omit<ClassificationRecord, 'id' | 'timestamp' | 'sessionId'>): ClassificationRecord {
    const fullRecord: ClassificationRecord = {
      ...record,
      id: `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      sessionId: this.sessionId
    };

    // Skip saving if not in browser environment
    if (typeof window === 'undefined') {
      console.log('Classification recorded (server-side, not saved):', fullRecord);
      return fullRecord;
    }

    try {
      const history = this.getAllRecords();
      history.unshift(fullRecord); // Add to beginning for most recent first

      // Keep only last 1000 records to prevent storage bloat
      const trimmedHistory = history.slice(0, 1000);
      
      localStorage.setItem(this.storageKey, JSON.stringify(trimmedHistory));
      
      console.log('Classification saved:', fullRecord);
    } catch (error) {
      console.error('Failed to save classification to localStorage:', error);
    }
    
    return fullRecord;
  }

  // Get all classification records
  getAllRecords(): ClassificationRecord[] {
    if (typeof window === 'undefined') {
      return [];
    }
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const records = JSON.parse(stored);
      return records.map((record: any) => ({
        ...record,
        timestamp: new Date(record.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load classification history:', error);
      return [];
    }
  }

  // Get records with pagination
  getRecords(page: number = 1, limit: number = 10): { records: ClassificationRecord[]; total: number; hasMore: boolean } {
    const allRecords = this.getAllRecords();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      records: allRecords.slice(startIndex, endIndex),
      total: allRecords.length,
      hasMore: endIndex < allRecords.length
    };
  }

  // Get recent records (last 7 days)
  getRecentRecords(days: number = 7): ClassificationRecord[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.getAllRecords().filter(record => 
      record.timestamp >= cutoffDate
    );
  }

  // Get records by category
  getRecordsByCategory(category: ClassificationRecord['category']): ClassificationRecord[] {
    return this.getAllRecords().filter(record => record.category === category);
  }

  // Search records by item name
  searchRecords(query: string): ClassificationRecord[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllRecords().filter(record => 
      record.itemName.toLowerCase().includes(lowerQuery) ||
      record.filename.toLowerCase().includes(lowerQuery) ||
      record.description.toLowerCase().includes(lowerQuery)
    );
  }

  // Generate comprehensive statistics
  getStatistics(): ClassificationStats {
    const records = this.getAllRecords();
    
    if (records.length === 0) {
      return {
        totalClassifications: 0,
        totalPoints: 0,
        categoryBreakdown: {},
        averageRecyclableRate: 0,
        topItems: [],
        weeklyStats: [],
        environmentalImpact: {
          itemsRecycled: 0,
          itemsComposted: 0,
          wasteReduced: 0,
          co2Saved: 0
        }
      };
    }

    // Basic stats
    const totalClassifications = records.length;
    const totalPoints = records.reduce((sum, record) => sum + record.points, 0);
    
    // Category breakdown
    const categoryBreakdown = records.reduce((acc, record) => {
      acc[record.category] = (acc[record.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average recyclable rate
    const averageRecyclableRate = records.reduce((sum, record) => sum + record.recyclableRate, 0) / records.length;

    // Top items
    const itemCounts = records.reduce((acc, record) => {
      const key = record.itemName;
      if (!acc[key]) {
        acc[key] = { count: 0, totalPoints: 0 };
      }
      acc[key].count += 1;
      acc[key].totalPoints += record.points;
      return acc;
    }, {} as Record<string, { count: number; totalPoints: number }>);

    const topItems = Object.entries(itemCounts)
      .map(([item, data]) => ({ item, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Weekly stats (last 4 weeks)
    const weeklyStats = this.generateWeeklyStats(records, 4);

    // Environmental impact calculations
    const environmentalImpact = this.calculateEnvironmentalImpact(records);

    return {
      totalClassifications,
      totalPoints,
      categoryBreakdown,
      averageRecyclableRate: Math.round(averageRecyclableRate * 100) / 100,
      topItems,
      weeklyStats,
      environmentalImpact
    };
  }

  private generateWeeklyStats(records: ClassificationRecord[], weeks: number) {
    const stats = [];
    const now = new Date();
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - 6);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekRecords = records.filter(record => 
        record.timestamp >= weekStart && record.timestamp <= weekEnd
      );
      
      stats.push({
        date: weekStart.toISOString().split('T')[0],
        count: weekRecords.length,
        points: weekRecords.reduce((sum, record) => sum + record.points, 0)
      });
    }
    
    return stats;
  }

  private calculateEnvironmentalImpact(records: ClassificationRecord[]) {
    let itemsRecycled = 0;
    let itemsComposted = 0;
    let wasteReduced = 0;
    let co2Saved = 0;

    records.forEach(record => {
      if (record.category === 'Recyclable') {
        itemsRecycled += 1;
        // Average waste item weight: 0.2kg, CO2 saving factor: 2.5kg CO2 per kg recycled
        wasteReduced += 0.2;
        co2Saved += 0.2 * 2.5;
      } else if (record.category === 'Organic') {
        itemsComposted += 1;
        // Composting saves methane emissions: 1.2kg CO2 equivalent per kg composted
        wasteReduced += 0.15;
        co2Saved += 0.15 * 1.2;
      }
    });

    return {
      itemsRecycled,
      itemsComposted,
      wasteReduced: Math.round(wasteReduced * 100) / 100,
      co2Saved: Math.round(co2Saved * 100) / 100
    };
  }

  // Export data for backup or analysis
  exportData(): string {
    const data = {
      exportDate: new Date().toISOString(),
      sessionId: this.sessionId,
      records: this.getAllRecords(),
      statistics: this.getStatistics()
    };
    
    return JSON.stringify(data, null, 2);
  }

  // Import data (for restoring from backup)
  importData(jsonData: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    try {
      const data = JSON.parse(jsonData);
      if (data.records && Array.isArray(data.records)) {
        localStorage.setItem(this.storageKey, JSON.stringify(data.records));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Clear all records (with confirmation)
  clearAllRecords(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  }

  // Get user location (if available)
  async getUserLocation(): Promise<{ latitude: number; longitude: number; address?: string } | null> {
    if (!navigator.geolocation) return null;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: false
        });
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (error) {
      console.warn('Failed to get user location:', error);
      return null;
    }
  }
}

// Export singleton instance
export const classificationHistory = new ClassificationHistoryService();

// Export helper functions
export const recordClassification = (data: Omit<ClassificationRecord, 'id' | 'timestamp' | 'sessionId'>) => {
  return classificationHistory.saveClassification(data);
};

export const getClassificationStats = () => {
  return classificationHistory.getStatistics();
};

export const getRecentClassifications = (limit: number = 10) => {
  return classificationHistory.getRecords(1, limit);
};