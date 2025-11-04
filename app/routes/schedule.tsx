import type { Route } from "./+types/schedule";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  Plus, 
  MapPin, 
  Edit2, 
  X,
  Check,
  AlertCircle,
  Loader2,
  Star
} from "lucide-react";
import { format, addDays, startOfWeek, isToday, isSameDay } from "date-fns";
import { 
  scheduleService, 
  type ScheduledPickup, 
  type CreatePickupData,
  type PickupStats 
} from "../services/scheduleService";
import { authService } from "../services/authService";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Schedule Collection - EcoWaste Manager" },
    { name: "description", content: "Schedule waste collection at your convenience to reduce unnecessary pickups." },
  ];
}

const wasteTypes: ScheduledPickup['wasteType'][] = ["General", "Recyclables", "Organic", "Hazardous", "Electronic"];

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduledPickups, setScheduledPickups] = useState<ScheduledPickup[]>([]);
  const [pickupStats, setPickupStats] = useState<PickupStats | null>(null);
  const [showNewPickupModal, setShowNewPickupModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [newPickup, setNewPickup] = useState<CreatePickupData>({
    date: addDays(new Date(), 1), // Default to tomorrow
    time: "10:00 AM",
    wasteType: "General",
    estimatedWeight: 10
  });
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Load data from backend service
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setError('Loading is taking longer than expected. Please refresh the page.');
      }
    }, 10000); // 10 seconds timeout

    try {
      // Listen for auth changes
      const unsubscribeAuth = authService.onAuthStateChange((user) => {
        setCurrentUser(user);
        // Reinitialize the schedule service when user changes
        if (user) {
          scheduleService.reinitialize();
        }
      });

      // Listen for pickup changes
      const unsubscribePickups = scheduleService.onPickupsChange((pickups) => {
        try {
          clearTimeout(loadingTimeout);
          setScheduledPickups(pickups);
          setPickupStats(scheduleService.getPickupStats());
          setIsLoading(false);
        } catch (err: any) {
          console.error('Error processing pickup data:', err);
          clearTimeout(loadingTimeout);
          setError('Failed to load pickup data. Please refresh the page.');
          setIsLoading(false);
        }
      });

      return () => {
        clearTimeout(loadingTimeout);
        unsubscribeAuth();
        unsubscribePickups();
      };
    } catch (err: any) {
      console.error('Error initializing schedule component:', err);
      clearTimeout(loadingTimeout);
      setError('Failed to initialize schedule. Please refresh the page.');
      setIsLoading(false);
    }
  }, []);

  // Update available time slots when date changes
  useEffect(() => {
    const slots = scheduleService.getAvailableTimeSlots(newPickup.date);
    setAvailableTimeSlots(slots);
    
    // Update time if current selection is not available
    if (slots.length > 0 && !slots.includes(newPickup.time)) {
      setNewPickup(prev => ({ ...prev, time: slots[0] }));
    }
  }, [newPickup.date]);

  const handleSchedulePickup = async () => {
    if (!currentUser) {
      setError('Please sign in to schedule pickups');
      return;
    }

    // Validate pickup date
    const validation = scheduleService.validatePickupDate(newPickup.date);
    if (!validation.isValid) {
      setError(validation.message || 'Invalid pickup date');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const pickupData: CreatePickupData = {
        ...newPickup,
        address: currentUser.city || 'Address not set'
      };

      await scheduleService.createPickup(pickupData);
      
      // Reset form and close modal
      setShowNewPickupModal(false);
      setNewPickup({
        date: addDays(new Date(), 1),
        time: "10:00 AM",
        wasteType: "General",
        estimatedWeight: 10
      });

      // Show success message (you can add a toast notification here)
      console.log('Pickup scheduled successfully!');
      
    } catch (err: any) {
      setError(err.message || 'Failed to schedule pickup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPickup = async (id: string) => {
    try {
      await scheduleService.cancelPickup(id);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel pickup');
    }
  };

  const handleCompletePickup = async (id: string, actualWeight?: number) => {
    try {
      await scheduleService.completePickup(id, actualWeight);
    } catch (err: any) {
      setError(err.message || 'Failed to complete pickup');
    }
  };

  const getStatusColor = (status: ScheduledPickup['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'in_progress': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getWasteTypeColor = (type: ScheduledPickup['wasteType']) => {
    switch (type) {
      case 'Recyclables': return 'bg-green-500';
      case 'Organic': return 'bg-yellow-500';
      case 'Hazardous': return 'bg-red-500';
      case 'Electronic': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading your schedule...</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 mt-2">
              Debug: currentUser = {currentUser ? currentUser.name : 'null'}, 
              pickups = {scheduledPickups.length}, 
              stats = {pickupStats ? 'exists' : 'null'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Authentication check
  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Sign In Required
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Please sign in to view and manage your collection schedule.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 mt-4">
            Debug: currentUser = {currentUser ? 'exists' : 'null'}, 
            isLoading = {isLoading.toString()}, 
            error = {error || 'none'}
          </div>
        )}
      </div>
    );
  }

  // Generate week view
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const upcomingPickups = scheduledPickups.filter(p => 
    p.status === 'scheduled' && p.date >= new Date()
  ).sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Collection Schedule
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your waste collection appointments
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowNewPickupModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mt-4 sm:mt-0"
        >
          <Plus className="h-5 w-5 mr-2" />
          Schedule Pickup
        </motion.button>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pickupStats?.upcomingThisWeek || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pickupStats?.totalCompleted || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Trash2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Weight</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pickupStats?.totalWeight.toFixed(1) || '0'} kg
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Eco Points</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pickupStats?.totalSaved.points || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Week View */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Week of {format(weekStart, 'MMM d, yyyy')}
          </h2>
          
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayPickups = scheduledPickups.filter(p => 
                isSameDay(p.date, day) && p.status === 'scheduled'
              );
              
              return (
                <div
                  key={day.toISOString()}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isToday(day) 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {format(day, 'EEE')}
                    </p>
                    <p className={`text-lg font-bold ${
                      isToday(day) ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    {dayPickups.slice(0, 2).map((pickup) => (
                      <div
                        key={pickup.id}
                        className={`w-full h-1 rounded-full ${getWasteTypeColor(pickup.wasteType)}`}
                      />
                    ))}
                    {dayPickups.length > 2 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        +{dayPickups.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Pickups */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Upcoming Pickups
          </h2>
          
          <div className="space-y-4">
            {upcomingPickups.map((pickup) => (
              <motion.div
                key={pickup.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getWasteTypeColor(pickup.wasteType)}`} />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {pickup.wasteType}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                      <span className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {format(pickup.date, 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {pickup.time}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {pickup.address}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pickup.status)}`}>
                    {pickup.status}
                  </span>
                  <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
            
            {upcomingPickups.length === 0 && (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No upcoming pickups scheduled
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Pickup Modal */}
      {showNewPickupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Schedule New Pickup
                </h3>
                <button
                  onClick={() => setShowNewPickupModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={format(newPickup.date, 'yyyy-MM-dd')}
                    onChange={(e) => setNewPickup({...newPickup, date: new Date(e.target.value)})}
                    min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time
                  </label>
                  <select
                    value={newPickup.time}
                    onChange={(e) => setNewPickup({...newPickup, time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={availableTimeSlots.length === 0}
                  >
                    {availableTimeSlots.length === 0 ? (
                      <option value="">No available time slots</option>
                    ) : (
                      availableTimeSlots.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))
                    )}
                  </select>
                  {availableTimeSlots.length === 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      All time slots are booked for this date. Please choose a different date.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Waste Type
                  </label>
                  <select
                    value={newPickup.wasteType}
                    onChange={(e) => setNewPickup({...newPickup, wasteType: e.target.value as ScheduledPickup['wasteType']})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {wasteTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estimated Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={newPickup.estimatedWeight}
                    onChange={(e) => setNewPickup({...newPickup, estimatedWeight: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    step="0.5"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowNewPickupModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSchedulePickup}
                  disabled={isSubmitting || availableTimeSlots.length === 0}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Pickup'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
