'use client';

import { useState, useEffect } from 'react';
import { SurplusListing, Claim } from '@/types';
import { api } from '@/lib/api';
import LeafletMap from './LeafletMap';
import LiveDeliveryTracker from './LiveDeliveryTracker';
import {
  HeartHandshake,
  Clock,
  MapPin,
  CheckCircle,
  Truck,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface NGODashboardProps {
  onRefreshAll: () => void;
}

export default function NGODashboard({ onRefreshAll }: NGODashboardProps) {
  const [availableSurplus, setAvailableSurplus] = useState<SurplusListing[]>([]);
  const [activeClaims, setActiveClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeDeliveryClaimId, setActiveDeliveryClaimId] = useState<number | null>(null);

  // Claim modal state
  const [selectedSurplus, setSelectedSurplus] = useState<SurplusListing | null>(null);
  const [claimKg, setClaimKg] = useState<number>(0);
  const [claimingLoading, setClaimingLoading] = useState<boolean>(false);
  const [claimSuccessData, setClaimSuccessData] = useState<Claim | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [surplus, claims] = await Promise.all([
        api.getSurplus('available'),
        api.getActiveClaims(),
      ]);
      setAvailableSurplus(surplus);
      setActiveClaims(claims);
    } catch (e) {
      console.error('Error loading NGO dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenClaim = (item: SurplusListing) => {
    setSelectedSurplus(item);
    setClaimKg(item.quantity_kg);
    setClaimSuccessData(null);
  };

  const handleConfirmClaim = async () => {
    if (!selectedSurplus) return;
    setClaimingLoading(true);
    try {
      const result = await api.createClaim(selectedSurplus.id, 3, claimKg);
      setClaimSuccessData(result);
      loadData();
      onRefreshAll();
    } catch (err: any) {
      alert(`Claim failed: ${err.message}`);
    } finally {
      setClaimingLoading(false);
    }
  };

  const filteredSurplus =
    categoryFilter === 'all'
      ? availableSurplus
      : availableSurplus.filter((s) => s.category === categoryFilter);

  return (
    <div className="space-y-8">
      {/* NGO Hero / Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 dark:from-amber-700 dark:to-amber-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/30 text-amber-100 text-xs font-semibold backdrop-blur-xs">
              <HeartHandshake className="w-4 h-4" />
              <span>Registered Food Rescue Partner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Robin Hood Army & Community Shelters
            </h1>
            <p className="text-amber-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Claim fresh surplus batches from university kitchens with verified food safety windows. Deliveries are protected with cryptographic one-time handoff codes.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15">
            <div>
              <div className="text-2xl font-bold">{availableSurplus.length}</div>
              <div className="text-xs text-amber-100">Batches Available</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <div className="text-2xl font-bold">
                {availableSurplus.reduce((acc, curr) => acc + curr.quantity_kg, 0)} kg
              </div>
              <div className="text-xs text-amber-100">Total Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Surplus Listings & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Available Listings Feed */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-[#13241d] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Available Surplus Feed</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live batches waiting for NGO reservation</p>
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#294c3d] text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-[#182d24] focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Categories</option>
                  <option value="Cooked rice and grains">Rice & Grains</option>
                  <option value="Dairy and paneer gravies">Dairy Gravies</option>
                  <option value="Bakery items">Bakery</option>
                  <option value="Fresh produce">Produce</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Scanning for active surplus donations...
              </div>
            ) : filteredSurplus.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No surplus food currently available. New batches will appear here as soon as mess admins log them.
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredSurplus.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-[#223d32] hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-xs transition bg-white dark:bg-[#182d24]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.urgency === 'critical'
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                                : item.urgency === 'moderate'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            {item.urgency}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.location_name || 'Hostel Central Kitchen'} · {item.category}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-extrabold text-slate-900 dark:text-white">{item.quantity_kg} kg</div>
                        <div className="text-[11px] text-slate-400">~{Math.round(item.quantity_kg / 0.4)} meals</div>
                      </div>
                    </div>

                    <div className="mt-3 py-2 px-3 rounded-lg bg-slate-50 dark:bg-[#13241d] flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-[#223d32]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>
                          Safe Window: <b>{item.remaining_hours}h remaining</b>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>KIET Campus Hub</span>
                      </div>
                    </div>

                    {item.notes && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic">{item.notes}</p>}

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleOpenClaim(item)}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                      >
                        <HeartHandshake className="w-4 h-4" />
                        <span>Claim for Shelter</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Claim Pickups & Interactive Leaflet Map */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Reservations & Handoff OTPs */}
          <div className="bg-white dark:bg-[#13241d] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                  <Truck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Handoffs & OTP Codes</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Provide code to driver at physical delivery</p>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-900">
                {activeClaims.length} Active
              </span>
            </div>

            {activeClaims.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active pickup reservations right now. Claim a batch to generate your delivery OTP.
              </div>
            ) : (
              <div className="space-y-3">
                {activeClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-4 rounded-xl border-2 border-emerald-500/40 dark:border-emerald-700/60 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">{claim.surplus_title}</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {claim.claimed_kg} kg reserved for {claim.ngo_name}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 uppercase">
                        {claim.status}
                      </span>
                    </div>

                    {/* High-visibility OTP card */}
                    <div className="p-3 rounded-lg bg-white dark:bg-[#182d24] border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Delivery Verification OTP
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Give this to the driver upon receipt</div>
                      </div>
                      <div className="font-mono text-xl font-black text-emerald-800 dark:text-emerald-300 tracking-widest bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                        {claim.otp_code}
                      </div>
                    </div>

                    {/* Live Delivery Tracker Button */}
                    <button
                      type="button"
                      onClick={() => setActiveDeliveryClaimId(claim.id)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Track Live Delivery (Zomato-Style GPS)</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive OpenStreetMap */}
          <div className="bg-white dark:bg-[#13241d] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Regional Distribution Network</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Hostel mess locations & registered recipient shelters</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#182d24] text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-[#294c3d]">
                Ghaziabad District
              </span>
            </div>

            <div className="h-64 rounded-xl overflow-hidden">
              <LeafletMap height="256px" isDark={isDarkMode} />
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Hostel Kitchens</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Recipient NGO Shelters</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      {selectedSurplus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#152720] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#223d32] w-full max-w-md overflow-hidden transition-colors">
            <div className="p-5 border-b border-slate-100 dark:border-[#223d32] flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/40">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Claim Food Batch</h3>
              </div>
              <button
                onClick={() => setSelectedSurplus(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {claimSuccessData ? (
                <div className="text-center py-4 space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Reservation Confirmed!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {claimSuccessData.claimed_kg} kg of <b>{claimSuccessData.surplus_title}</b> has been locked for your shelter.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#182d24] border border-slate-200 dark:border-[#223d32] text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Your 6-Digit Delivery Handoff Code:</div>
                    <div className="font-mono text-3xl font-extrabold text-emerald-800 dark:text-emerald-300 tracking-wider">
                      {claimSuccessData.otp_code}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Present this code to the rapid transit driver upon arrival.
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedSurplus(null)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#182d24] border border-slate-200/70 dark:border-[#223d32]">
                    <div className="text-xs font-semibold text-slate-800 dark:text-white">{selectedSurplus.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Category: {selectedSurplus.category} · Available: {selectedSurplus.quantity_kg} kg
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-semibold">
                      Safe window: ~{selectedSurplus.remaining_hours} hours remaining
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Claim Quantity (kg)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedSurplus.quantity_kg}
                      value={claimKg}
                      onChange={(e) => setClaimKg(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#294c3d] bg-white dark:bg-[#182d24] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Provide how many kg your shelter can distribute within the safe window.
                    </p>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedSurplus(null)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#294c3d] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-[#182d24]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={claimingLoading || claimKg <= 0}
                      onClick={handleConfirmClaim}
                      className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {claimingLoading ? (
                        <span>Generating OTP...</span>
                      ) : (
                        <>
                          <span>Confirm Claim</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live GPS Delivery Tracker Modal */}
      {activeDeliveryClaimId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <LiveDeliveryTracker
              claimId={activeDeliveryClaimId}
              onClose={() => setActiveDeliveryClaimId(null)}
              isDark={isDarkMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
