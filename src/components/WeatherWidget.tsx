'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  RefreshCw,
  MapPin,
} from 'lucide-react';

interface WeatherData {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
}

interface WeatherWidgetProps {
  location?: string;
  latitude?: number;
  longitude?: number;
  apiKey?: string;
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  location,
  latitude,
  longitude,
  apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY,
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string>('Miami');
  const [isVisible, setIsVisible] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cache for stale-while-revalidate strategy
  const cache = useRef<{
    data: WeatherData | null;
    timestamp: number;
    location: string;
  }>({
    data: null,
    timestamp: 0,
    location: '',
  });

  // Visibility change detection for smart refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const getCurrentLocation = () => {
      return new Promise<{ lat: number; lon: number; city: string }>(
        (resolve, reject) => {
          if (latitude && longitude) {
            // Use provided coordinates
            resolve({
              lat: latitude,
              lon: longitude,
              city: location || 'Current Location',
            });
            return;
          }

          if (location) {
            // Use provided location string
            resolve({ lat: 0, lon: 0, city: location });
            return;
          }

          // Try to get user's current location
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude: lat, longitude: lon } = position.coords;

                // Reverse geocoding to get city name
                try {
                  const geoResponse = await fetch(
                    `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
                  );
                  const geoData = await geoResponse.json();
                  const cityName = geoData[0]?.name || 'Current Location';
                  resolve({ lat, lon, city: cityName });
                } catch {
                  resolve({ lat, lon, city: 'Current Location' });
                }
              },
              (error) => {
                console.warn('Geolocation error:', error);
                // Fallback to default location
                resolve({ lat: 25.7617, lon: -80.1918, city: 'Miami' });
              },
              { timeout: 5000, enableHighAccuracy: false }
            );
          } else {
            // Fallback to default location
            resolve({ lat: 25.7617, lon: -80.1918, city: 'Miami' });
          }
        }
      );
    };

    const fetchWeather = async (forceRefresh = false) => {
      if (!apiKey) {
        setError('Weather API key not configured');
        setLoading(false);
        return;
      }

      try {
        const { lat, lon, city } = await getCurrentLocation();
        setUserLocation(city);

        const cacheKey = `${lat},${lon}`;
        const now = Date.now();
        const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

        // Check if we have valid cached data and don't need to force refresh
        if (
          !forceRefresh &&
          cache.current.data &&
          cache.current.location === cacheKey &&
          now - cache.current.timestamp < CACHE_DURATION
        ) {
          // Use cached data immediately (stale-while-revalidate)
          setWeatherData(cache.current.data);
          setLoading(false);
          setError(null);

          // Still fetch fresh data in background if cache is getting stale
          if (now - cache.current.timestamp > CACHE_DURATION * 0.8) {
            setIsRefreshing(true);
          }
        } else {
          // Show loading only if no cached data or force refresh
          if (!cache.current.data || forceRefresh) {
            setLoading(true);
          }
        }

        let apiUrl: string;
        if (lat !== 0 && lon !== 0) {
          // Use coordinates for more accurate weather data
          apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        } else {
          // Use city name
          apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
        }

        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();

        // Update cache with fresh data
        cache.current = {
          data,
          timestamp: now,
          location: cacheKey,
        };

        setWeatherData(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load weather data'
        );
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    // Initial fetch
    fetchWeather();

    // Smart refresh interval - only refresh when visible
    const interval = setInterval(() => {
      if (isVisible) {
        fetchWeather();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [location, latitude, longitude, apiKey, isVisible]);

  const getWeatherIcon = (weatherMain: string) => {
    const iconClass = 'h-10 w-10';

    switch (weatherMain.toLowerCase()) {
      case 'clear':
        return (
          <div className="relative">
            <Sun className={`${iconClass} text-amber-400 drop-shadow-sm`} />
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/20 to-amber-300/20 rounded-full blur-sm"></div>
          </div>
        );
      case 'clouds':
        return (
          <div className="relative">
            <Cloud className={`${iconClass} text-slate-500 drop-shadow-sm`} />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200/20 to-slate-400/20 rounded-full blur-sm"></div>
          </div>
        );
      case 'rain':
        return (
          <div className="relative">
            <CloudRain
              className={`${iconClass} text-blue-500 drop-shadow-sm`}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-blue-400/20 rounded-full blur-sm"></div>
          </div>
        );
      case 'snow':
        return (
          <div className="relative">
            <CloudSnow
              className={`${iconClass} text-blue-200 drop-shadow-sm`}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-blue-300/20 rounded-full blur-sm"></div>
          </div>
        );
      case 'thunderstorm':
        return (
          <div className="relative">
            <CloudRain
              className={`${iconClass} text-purple-600 drop-shadow-sm`}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-200/20 to-purple-400/20 rounded-full blur-sm"></div>
          </div>
        );
      case 'drizzle':
        return (
          <div className="relative">
            <CloudRain
              className={`${iconClass} text-blue-400 drop-shadow-sm`}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-blue-300/20 rounded-full blur-sm"></div>
          </div>
        );
      case 'mist':
      case 'fog':
      case 'haze':
        return (
          <div className="relative">
            <Cloud className={`${iconClass} text-slate-400 drop-shadow-sm`} />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200/30 to-slate-300/30 rounded-full blur-sm"></div>
          </div>
        );
      default:
        return (
          <div className="relative">
            <Cloud className={`${iconClass} text-slate-500 drop-shadow-sm`} />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-200/20 to-slate-400/20 rounded-full blur-sm"></div>
          </div>
        );
    }
  };

  const formatTemperature = (temp: number) => {
    return `${Math.round(temp)}°C`;
  };

  const formatWindSpeed = (speed: number) => {
    return `${Math.round(speed * 3.6)} km/h`; // Convert m/s to km/h
  };

  if (loading) {
    return (
      <Card className="w-[300px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800 mb-1">
                {userLocation}
              </CardTitle>
              <p className="text-xs text-slate-600">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Loading</p>
              <p className="text-xs text-slate-600 font-medium">...</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-center h-24">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600"></div>
              <p className="text-xs text-slate-500 font-medium">
                Fetching weather data...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-[300px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-800 mb-1">
                {userLocation}
              </CardTitle>
              <p className="text-xs text-slate-600">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Status</p>
              <p className="text-xs text-red-500 font-medium">Offline</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center justify-center h-24 gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <Cloud className="h-6 w-6 text-red-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                Weather Unavailable
              </p>
              <p className="text-xs text-slate-500">Check your connection</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) return null;

  return (
    <Card className="w-[300px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
      {/* Header with location and time */}
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-slate-600" />
              <CardTitle className="text-sm font-semibold sidebar-gradient-text mb-1">
                {weatherData.name}
              </CardTitle>
            </div>
            <p className="text-xs text-slate-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Updated</p>
            <p className="text-xs text-slate-600 font-medium">
              {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-2">
        <div className="space-y-4">
          {/* Main temperature display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                {getWeatherIcon(weatherData.weather[0].main)}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <div className="text-3xl font-bold sidebar-gradient-text tracking-tight">
                  {formatTemperature(weatherData.main.temp)}
                </div>
                <div className="text-sm text-slate-600 capitalize font-medium">
                  {weatherData.weather[0].description}
                </div>
              </div>
            </div>

            {/* Feels like with better styling */}
            <div className="text-right bg-white/30 rounded-lg px-3 py-1 backdrop-blur-sm">
              <div className="text-xs text-slate-500 font-medium">
                Feels like
              </div>
              <div className="text-lg font-semibold text-slate-700">
                {formatTemperature(weatherData.main.feels_like)}
              </div>
            </div>
          </div>
          <div className="h-px bg-slate-300"></div>
          {/* Weather metrics with improved design */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Droplets className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">
                    Humidity
                  </div>
                  <div className="text-sm font-bold text-slate-700">
                    {weatherData.main.humidity}%
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Wind className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">Wind</div>
                  <div className="text-sm font-bold text-slate-700">
                    {formatWindSpeed(weatherData.wind.speed)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Weather condition indicator */}
          <div className="flex items-center justify-center pt-1">
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-1 backdrop-blur-sm border border-white/20">
              <div
                className={`w-2 h-2 rounded-full ${
                  isRefreshing
                    ? 'bg-blue-400 animate-pulse'
                    : 'bg-green-400 animate-pulse'
                }`}
              ></div>
              <span className="text-xs text-slate-600 font-medium">
                {isRefreshing ? 'Updating...' : 'Live Weather Data'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
