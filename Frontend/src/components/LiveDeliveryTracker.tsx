'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { LiveDeliveryTracking } from '@/types';

interface LiveDeliveryTrackerProps {
  claimId: number;
  onClose?: () => void;
  isDark?: boolean;
}

export default function LiveDeliveryTracker({
  claimId,
  onClose,
  isDark = false,
}: LiveDeliveryTrackerProps) {
  const [tracking, setTracking] = useState<LiveDeliveryTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const autoSimIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load of tracking details
  const fetchTracking = async () => {
    try {
      setLoading(true);
      const data = await api.getLiveDelivery(claimId);
      setTracking(data);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load live tracking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    return () => {
      if (autoSimIntervalRef.current) {
        clearInterval(autoSimIntervalRef.current);
      }
    };
  }, [claimId]);

  // Leaflet map setup and updating marker position
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || !tracking) return;

    let isMounted = true;

    // Clean up container if it already had a leaflet id from previous render
    if ((mapContainerRef.current as any)._leaflet_id) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if ((mapContainerRef.current as any)._leaflet_id) {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.off();
            mapInstanceRef.current.remove();
          } catch (_) {}
          mapInstanceRef.current = null;
        }
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current, {
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      }).setView([tracking.current_lat, tracking.current_lng], 13);

      mapInstanceRef.current = map;

      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      // Pickup Marker (Hostel Kitchen)
      const pickupIcon = L.divIcon({
        className: 'custom-pickup-marker',
        html: `<div style="background-color: #15803d; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">🍳</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([tracking.pickup_lat, tracking.pickup_lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<b>Pickup:</b> ${tracking.pickup_name}<br/>${tracking.food_title} (${tracking.claimed_kg} kg)`);

      // Destination Marker (NGO)
      const destIcon = L.divIcon({
        className: 'custom-dest-marker',
        html: `<div style="background-color: #0284c7; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">🏢</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([tracking.target_lat, tracking.target_lng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>Destination:</b> ${tracking.destination_name}`);

      // Draw Planned Route Line
      if (tracking.waypoints && tracking.waypoints.length > 0) {
        const polyline = L.polyline(tracking.waypoints, {
          color: '#10b981',
          weight: 5,
          opacity: 0.8,
          dashArray: '8, 8',
          lineCap: 'round',
        }).addTo(map);
        routePolylineRef.current = polyline;
      }

      // Live Delivery Vehicle Marker (Animated blinker/van)
      const vehicleIcon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
            <div style="position: absolute; width: 42px; height: 42px; background: rgba(16, 185, 129, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="background-color: #047857; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.45); z-index: 10;">
              🚐
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const vehicleMarker = L.marker([tracking.current_lat, tracking.current_lng], {
        icon: vehicleIcon,
      }).addTo(map);

      vehicleMarker.bindPopup(`<b>${tracking.driver_name}</b><br/>${tracking.vehicle_type}<br/>Speed: ${tracking.speed_kmh} km/h`);
      vehicleMarkerRef.current = vehicleMarker;

      // Fit bounds to show route nicely
      if (tracking.waypoints && tracking.waypoints.length > 1) {
        const bounds = L.latLngBounds(tracking.waypoints);
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [tracking?.id, isDark]);

  // Update vehicle position smoothly when tracking changes without resetting map
  useEffect(() => {
    if (vehicleMarkerRef.current && tracking) {
      vehicleMarkerRef.current.setLatLng([tracking.current_lat, tracking.current_lng]);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([tracking.current_lat, tracking.current_lng], {
          animate: false,
        });
      }
    }
  }, [tracking?.current_lat, tracking?.current_lng]);

  const handleStepForward = async () => {
    try {
      const updated = await api.simulateDeliveryStep(claimId, 1);
      setTracking(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Simulation error');
    }
  };

  const handleResetSimulation = async () => {
    try {
      const updated = await api.resetDeliverySimulation(claimId);
      setTracking(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Reset error');
    }
  };

  const toggleAutoSimulate = () => {
    if (isSimulating) {
      if (autoSimIntervalRef.current) {
        clearInterval(autoSimIntervalRef.current);
        autoSimIntervalRef.current = null;
      }
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      autoSimIntervalRef.current = setInterval(async () => {
        try {
          const updated = await api.simulateDeliveryStep(claimId, 1);
          setTracking(updated);
          if (updated.status === 'delivered') {
            if (autoSimIntervalRef.current) {
              clearInterval(autoSimIntervalRef.current);
              autoSimIntervalRef.current = null;
            }
            setIsSimulating(false);
          }
        } catch (_) {
          setIsSimulating(false);
        }
      }, 2500);
    }
  };

  if (loading && !tracking) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Connecting to live vehicle GPS telemetry...</p>
      </div>
    );
  }

  if (errorMessage && !tracking) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900 text-center">
        <p className="text-red-700 dark:text-red-400 font-semibold mb-3">Live Tracking Unavailable</p>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">{errorMessage}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  if (!tracking) return null;

  const isDelivered = tracking.status === 'delivered';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner">
            🛵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight">Live Food Rescue Transit</span>
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-400/30 text-white border border-white/20 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                {tracking.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              Claim #{tracking.claim_id} • {tracking.food_title} ({tracking.claimed_kg} kg)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Driver Card Pill */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs">
            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold">
              👨‍✈️
            </span>
            <div>
              <div className="font-semibold text-white">{tracking.driver_name}</div>
              <div className="text-emerald-200">{tracking.driver_phone}</div>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close Tracker"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Map & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Left: Map View */}
        <div className="lg:col-span-2 relative">
          <div ref={mapContainerRef} style={{ height: '420px', width: '100%' }} />

          {/* Floating ETA Banner (Zomato Style) */}
          <div className="absolute top-4 left-4 z-[500] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {isDelivered ? '0' : tracking.eta_minutes}
              <span className="text-xs font-semibold ml-0.5 text-slate-500 dark:text-slate-400">MIN</span>
            </div>
            <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                {isDelivered ? 'Status' : 'Est. Arrival'}
              </div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {isDelivered ? '✅ Arrived at Destination' : `${tracking.remaining_distance_km} km away • ${tracking.speed_kmh} km/h`}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Verification Panel */}
        <div className="p-5 flex flex-col justify-between bg-slate-50/70 dark:bg-slate-900/70 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800">
          <div>
            {/* Progress Step Indicator */}
            <div className="mb-5">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                <span>Trip Progress</span>
                <span className="text-emerald-600 dark:text-emerald-400">{Math.round(tracking.progress_percent)}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, tracking.progress_percent))}%` }}
                />
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Speed</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white flex items-baseline gap-1 mt-0.5">
                  {tracking.speed_kmh}
                  <span className="text-xs font-normal text-slate-500">km/h</span>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Remaining</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white flex items-baseline gap-1 mt-0.5">
                  {tracking.remaining_distance_km}
                  <span className="text-xs font-normal text-slate-500">km</span>
                </div>
              </div>
            </div>

            {/* Route Locations */}
            <div className="space-y-3 mb-5 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px] mt-0.5">
                  A
                </span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{tracking.pickup_name}</div>
                  <div className="text-slate-500 dark:text-slate-400">Origin • Campus Hostel Hub</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[10px] mt-0.5">
                  B
                </span>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{tracking.destination_name}</div>
                  <div className="text-slate-500 dark:text-slate-400">Target NGO Shelter Hub</div>
                </div>
              </div>
            </div>

            {/* OTP Handoff Code Box */}
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center mb-5">
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                🔑 Secure Delivery Handoff OTP
              </div>
              <div className="font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-widest py-1">
                {tracking.otp_code || '------'}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400/80">
                Provide this OTP upon driver arrival to complete delivery audit
              </div>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Live Simulation Controls
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleStepForward}
                disabled={isDelivered}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>▶</span> Next Step
              </button>

              <button
                onClick={toggleAutoSimulate}
                className={`px-3 py-2 text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                  isSimulating
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <span>{isSimulating ? '⏸ Pause' : '⚡ Auto-Drive'}</span>
              </button>
            </div>

            <button
              onClick={handleResetSimulation}
              className="w-full px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors"
            >
              ↺ Reset Route to Start
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
