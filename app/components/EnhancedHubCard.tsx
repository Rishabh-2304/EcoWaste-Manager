// Enhanced Hub Card with backend integration features
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Phone, 
  Star, 
  Calendar,
  Route,
  Users,
  Zap,
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import type { Hub, HubService } from '../services/hubService';

interface EnhancedHubCardProps {
  hub: Hub;
  onGetDirections: (hub: Hub) => void;
  onScheduleVisit: (hub: Hub) => void;
  onViewDetails: (hub: Hub) => void;
  userLocation: { lat: number; lng: number } | null;
}

const serviceIcons: Record<string, any> = {
  'Recyclables': '♻️',
  'Electronics': '💻',
  'Batteries': '🔋',
  'Organic': '🌱',
  'Hazardous': '☠️',
  'Textiles': '👕',
  'General': '🗑️'
};

const statusColors = {
  'open': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'busy': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'closed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'maintenance': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
};

export default function EnhancedHubCard({ hub, onGetDirections, onScheduleVisit, onViewDetails, userLocation }: EnhancedHubCardProps) {
  const [imageError, setImageError] = useState(false);

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 90) return 'bg-red-500';
    if (capacity >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCurrentDayHours = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()] as keyof typeof hub.hours;
    const todayHours = hub.hours[today];
    
    if (todayHours?.closed) {
      return 'Closed today';
    }
    
    return `${todayHours?.open} - ${todayHours?.close}`;
  };

  const isOpenNow = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()] as keyof typeof hub.hours;
    const todayHours = hub.hours[today];
    
    if (todayHours?.closed) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = (todayHours?.open || '09:00').split(':').map(Number);
    const [closeHour, closeMin] = (todayHours?.close || '17:00').split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-gray-700/20 hover:shadow-3xl transition-all duration-300"
    >
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start space-x-4">
          {/* Hub Image/Icon */}
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
              {hub.image || '🏢'}
            </div>
            {/* Status Indicator */}
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
              hub.status === 'open' ? 'bg-green-500' : 
              hub.status === 'busy' ? 'bg-yellow-500' : 
              'bg-red-500'
            }`} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {hub.name}
            </h3>
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600 dark:text-gray-400 text-sm">
                {hub.address}
              </span>
            </div>
            {hub.distance !== undefined && (
              <div className="flex items-center space-x-2">
                <Navigation className="h-4 w-4 text-teal-500" />
                <span className="text-teal-600 dark:text-teal-400 font-medium text-sm">
                  {hub.distance} km away
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[hub.status]}`}>
            {hub.status === 'open' && isOpenNow() ? 'Open Now' : 
             hub.status === 'busy' ? 'Busy' : 
             hub.status === 'closed' ? 'Closed' : 
             'Maintenance'}
          </span>
          
          {/* Rating */}
          <div className="flex items-center space-x-1">
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
            <span className="font-medium text-gray-900 dark:text-white">
              {hub.rating.toFixed(1)}
            </span>
            <span className="text-gray-500 text-sm">
              ({hub.reviews.length})
            </span>
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {getCurrentDayHours()}
        </span>
        {hub.statusMessage && (
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
            {hub.statusMessage}
          </span>
        )}
      </div>

      {/* Services */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Available Services:</h4>
        <div className="grid grid-cols-2 gap-2">
          {hub.services.map((service, index) => (
            <div 
              key={index} 
              className={`flex items-center space-x-2 p-2 rounded-lg text-xs ${
                service.available 
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                  : 'bg-gray-50 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'
              }`}
            >
              <span className="text-sm">{serviceIcons[service.type] || '📦'}</span>
              <span className="font-medium">{service.type}</span>
              {service.available && (
                <span className="ml-auto text-xs">
                  {service.capacity}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Current Capacity
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {hub.capacity.current}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getCapacityColor(hub.capacity.current)}`}
            style={{ width: `${hub.capacity.current}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            Last updated: {new Date(hub.capacity.updated).toLocaleTimeString()}
          </span>
          <span className="text-xs text-gray-500">
            Max: {hub.capacity.max} items/day
          </span>
        </div>
      </div>

      {/* Specialties */}
      {hub.specialties.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Specialties:</h4>
          <div className="flex flex-wrap gap-1">
            {hub.specialties.map((specialty, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 rounded-full text-xs"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {hub.certifications.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-green-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Certifications:</h4>
          </div>
          <div className="flex flex-wrap gap-1">
            {hub.certifications.map((cert, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full text-xs flex items-center space-x-1"
              >
                <CheckCircle className="h-3 w-3" />
                <span>{cert}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50/50 dark:bg-gray-700/30 rounded-xl">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Manager</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{hub.manager}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Throughput</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{hub.throughput}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onGetDirections(hub)}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-colors"
        >
          <Route className="h-4 w-4" />
          <span className="text-sm font-medium">Directions</span>
        </button>
        
        <button
          onClick={() => onScheduleVisit(hub)}
          disabled={hub.status === 'closed' || hub.status === 'maintenance'}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">Schedule</span>
        </button>
        
        <button
          onClick={() => onViewDetails(hub)}
          className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="text-sm font-medium">Details</span>
        </button>
      </div>

      {/* Contact Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <a 
              href={`tel:${hub.phone}`}
              className="text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              {hub.phone}
            </a>
          </div>
          {hub.website && (
            <a 
              href={hub.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-teal-600 dark:text-teal-400 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Website</span>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}