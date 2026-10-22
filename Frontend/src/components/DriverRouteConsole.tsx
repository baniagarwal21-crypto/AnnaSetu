'use client';

import { useState, useEffect } from 'react';
import { OptimizedRoute } from '@/types';
import { api } from '@/lib/api';
import { Truck, Clock, ShieldCheck, RefreshCw } from 'lucide-react';

interface DriverRouteConsoleProps {
  onRefreshAll: () => void;
}

export default function DriverRouteConsole({ onRefreshAll }: DriverRouteConsoleProps) {
  const [route, setRoute] = useState<OptimizedRoute | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [inputCodes, setInputCodes] = useState<Record<number, string>>({});
  const [verifyMessage, setVerifyMessage] = useState<{ id: number; text: string; isError: boolean } | null>(null);

  const loadRoute = async () => {
    setLoading(true);
    try {
      const data = await api.getOptimizedRoute(150);
      setRoute(data);
    } catch (e) {
      console.error('Error loading route', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoute();
  }, []);

  const handleVerifyOTP = async (claimId: number) => {
    const code = inputCodes[claimId];
    if (!code || code.trim().length !== 6) {
      setVerifyMessage({ id: claimId, text: 'Please enter the complete 6-digit OTP code.', isError: true });
      return;
    }

    setVerifyingId(claimId);
    setVerifyMessage(null);
    try {
      const result = await api.verifyOTP(claimId, code.trim());
      setVerifyMessage({ id: claimId, text: result.message, isError: false });
      // Reload route to update completed status
      setTimeout(() => {
        loadRoute();
        onRefreshAll();
      }, 1500);
    } catch (err: any) {
      setVerifyMessage({ id: claimId, text: err.message, isError: true });
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Route Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 dark:from-blue-800 dark:to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-semibold backdrop-blur-xs">
              <Truck className="w-4 h-4" />
              <span>Smart Logistics & Route Optimization</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Active Delivery Dispatch</h1>
            <p className="text-blue-100 text-xs sm:text-sm max-w-xl leading-relaxed">
              Consolidated traveling-salesperson route planner sequencing pickups and deliveries to guarantee arrival inside microbiological safe windows.
            </p>
          </div>

          <button
            onClick={loadRoute}
            className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalculate Route</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {route && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#13241d] p-4 rounded-xl border border-slate-200 dark:border-[#223d32] transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Travel Distance</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{route.total_km} km</div>
            <div className="text-[10px] text-slate-400">Hub roundtrip</div>
          </div>

          <div className="bg-white dark:bg-[#13241d] p-4 rounded-xl border border-slate-200 dark:border-[#223d32] transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Estimated Transit Time</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{route.total_minutes} mins</div>
            <div className="text-[10px] text-slate-400">At 28 km/h city speed</div>
          </div>

          <div className="bg-white dark:bg-[#13241d] p-4 rounded-xl border border-slate-200 dark:border-[#223d32] transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Route Efficiency Savings</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{route.distance_savings_percent}%</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">vs separate uncoordinated trips</div>
          </div>

          <div className="bg-white dark:bg-[#13241d] p-4 rounded-xl border border-slate-200 dark:border-[#223d32] transition-colors">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Vehicle Payload</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{route.vehicle_capacity_kg} kg max</div>
            <div className="text-[10px] text-slate-400">Insulated EV Van</div>
          </div>
        </div>
      )}

      {/* Route Stops List */}
      <div className="bg-white dark:bg-[#13241d] rounded-2xl border border-slate-200 dark:border-[#223d32] shadow-xs p-6 transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">Turn-by-Turn Delivery Itinerary</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Physical handoffs require cryptographic 6-digit OTP verification provided by the receiving shelter coordinator.
        </p>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Optimizing trip schedule...</div>
        ) : !route || route.stops.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No active delivery jobs currently waiting. Once NGOs claim surplus batches, optimized multi-stop itineraries will appear here.
          </div>
        ) : (
          <div className="space-y-4">
            {route.stops.map((stop) => {
              const isDelivery = stop.type === 'delivery';

              return (
                <div
                  key={stop.stop_number}
                  className={`p-4 rounded-xl border transition ${
                    isDelivery
                      ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/20'
                      : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isDelivery ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {stop.stop_number}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isDelivery
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {isDelivery ? 'Drop-off / Delivery' : 'Pickup'}
                          </span>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{stop.location_name}</h4>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stop.address}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold text-slate-800 dark:text-slate-100">
                            {stop.kg} kg · {stop.category}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            ETA: ~{stop.eta_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delivery OTP verification section */}
                    {isDelivery && stop.claim_id && (
                      <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-[#223d32] pt-3 md:pt-0 md:pl-4 min-w-[240px]">
                        <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          Verify Handoff OTP:
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="6-digit OTP"
                            value={inputCodes[stop.claim_id] || ''}
                            onChange={(e) =>
                              setInputCodes({ ...inputCodes, [stop.claim_id!]: e.target.value })
                            }
                            className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#294c3d] bg-white dark:bg-[#182d24] text-xs font-mono font-bold tracking-wider text-slate-800 dark:text-slate-100 text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleVerifyOTP(stop.claim_id!)}
                            disabled={verifyingId === stop.claim_id}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 disabled:opacity-60"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                        </div>

                        {verifyMessage && verifyMessage.id === stop.claim_id && (
                          <div
                            className={`mt-2 text-[11px] font-semibold ${
                              verifyMessage.isError ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {verifyMessage.text}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
