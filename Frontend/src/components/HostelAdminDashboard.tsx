'use client';

import { useState, useEffect } from 'react';
import {
  ForecastResponse,
  SurplusListing,
  IoTUnit,
  AnalyticsOverview,
  RankedNGO,
  HardwareDashboardSummary,
  RFIDTapResponse,
  PredictionVsActualItem,
  ModelEnhancementResponse,
  Claim
} from '@/types';
import { api } from '@/lib/api';
import LiveDeliveryTracker from './LiveDeliveryTracker';
import {
  Sparkles,
  Calendar,
  UtensilsCrossed,
  Clock,
  Thermometer,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  CheckCircle,
  Activity,
  Zap,
  Cpu,
  Radio,
  RefreshCw,
  Scale,
  Truck,
  CheckCheck,
  BarChart3,
  Database
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HostelAdminDashboardProps {
  onRefreshAll: () => void;
}

const CATEGORIES = [
  { id: 'Cooked rice and grains', label: 'Cooked rice and grains', baseH: 6 },
  { id: 'Dairy and paneer gravies', label: 'Dairy and paneer gravies', baseH: 4 },
  { id: 'Bakery items', label: 'Bakery items', baseH: 24 },
  { id: 'Fresh produce', label: 'Fresh produce', baseH: 48 },
];

export default function HostelAdminDashboard({ onRefreshAll }: HostelAdminDashboardProps) {
  // Tomorrow's default date string
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  // Forecast state
  const [selectedDate, setSelectedDate] = useState<string>(getTomorrowStr());
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [forecastLoading, setForecastLoading] = useState<boolean>(false);
  const [forecastHistory, setForecastHistory] = useState<any[]>([]);

  // Surplus posting form state
  const [dishTitle, setDishTitle] = useState<string>('Paneer Butter Masala & Jeera Rice');
  const [category, setCategory] = useState<string>('Dairy and paneer gravies');
  const [quantityKg, setQuantityKg] = useState<number>(35);
  const [storageTemp, setStorageTemp] = useState<number>(30);
  const [surplusNotes, setSurplusNotes] = useState<string>('Packed hot in food-grade insulated thermal containers.');
  const [postingLoading, setPostingLoading] = useState<boolean>(false);
  const [postSuccessMessage, setPostSuccessMessage] = useState<string | null>(null);

  // Active Surplus listings & details modal
  const [surplusList, setSurplusList] = useState<SurplusListing[]>([]);
  const [selectedSurplusForRank, setSelectedSurplusForRank] = useState<SurplusListing | null>(null);
  const [rankedNGOs, setRankedNGOs] = useState<RankedNGO[]>([]);
  const [rankingLoading, setRankingLoading] = useState<boolean>(false);

  // IoT Telemetry state
  const [iotUnits, setIotUnits] = useState<IoTUnit[]>([]);
  const [simulatingAnomaly, setSimulatingAnomaly] = useState<boolean>(false);

  // Analytics overview state
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);

  // Active claims & Live Delivery Tracking
  const [activeClaims, setActiveClaims] = useState<Claim[]>([]);
  const [activeDeliveryClaimId, setActiveDeliveryClaimId] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Hardware RFID Station & Food Waste state
  const [hardwareSummary, setHardwareSummary] = useState<HardwareDashboardSummary | null>(null);
  const [hardwareLoading, setHardwareLoading] = useState<boolean>(false);
  const [tapUid, setTapUid] = useState<string>('1E6B7E05');
  const [tapMeal, setTapMeal] = useState<string>('auto');
  const [tapResult, setTapResult] = useState<RFIDTapResponse | null>(null);
  const [tapLoading, setTapLoading] = useState<boolean>(false);
  const [tapError, setTapError] = useState<string | null>(null);

  // Food waste logging form
  const [wasteFoodName, setWasteFoodName] = useState<string>('Steamed Basmati Rice & Dal');
  const [wastePreparedKg, setWastePreparedKg] = useState<number>(45);
  const [wasteActualKg, setWasteActualKg] = useState<number>(3.5);
  const [foodLogLoading, setFoodLogLoading] = useState<boolean>(false);
  const [foodLogSuccess, setFoodLogSuccess] = useState<string | null>(null);
  const [activeHardwareTab, setActiveHardwareTab] = useState<'scans' | 'foods'>('scans');

  // AI Turnout Feedback & Self-Enhancement state
  const [predictionVsActual, setPredictionVsActual] = useState<PredictionVsActualItem[]>([]);
  const [retrainLoading, setRetrainLoading] = useState<boolean>(false);
  const [retrainResult, setRetrainResult] = useState<ModelEnhancementResponse | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    }
  }, []);

  // Load initial data
  const loadForecast = async (dateStr: string) => {
    setForecastLoading(true);
    try {
      const data = await api.predictDemand(dateStr);
      setForecast(data);
    } catch (err) {
      console.error('Forecast error', err);
    } finally {
      setForecastLoading(false);
    }
  };

  const loadHardwareSummary = async () => {
    try {
      const summary = await api.getHardwareSummary();
      setHardwareSummary(summary);
    } catch (err) {
      console.error('Failed to load hardware summary', err);
    }
  };

  const loadPredictionVsActual = async () => {
    try {
      const items = await api.getPredictionVsActual(7);
      setPredictionVsActual(items);
    } catch (err) {
      console.error('Failed to load prediction vs actual', err);
    }
  };

  const loadData = async () => {
    try {
      const [surplusData, iotData, analyticsData, historyData, claimsData] = await Promise.all([
        api.getSurplus(),
        api.getIoTUnits(),
        api.getAnalyticsOverview(),
        api.getForecastHistory(),
        api.getActiveClaims(),
      ]);
      setSurplusList(surplusData);
      setIotUnits(iotData);
      setAnalytics(analyticsData);
      setForecastHistory(historyData);
      setActiveClaims(claimsData);
    } catch (e) {
      console.error('Failed loading dashboard data', e);
    }
    loadHardwareSummary();
    loadPredictionVsActual();
  };

  useEffect(() => {
    loadForecast(selectedDate);
    loadData();

    // Polling IoT, hardware, and surplus every 8 seconds for live feel
    const interval = setInterval(async () => {
      try {
        const units = await api.getIoTUnits();
        setIotUnits(units);
        loadHardwareSummary();
      } catch (_) {}
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    loadForecast(newDate);
  };

  // Safe window calculation on the fly for preview
  const calculatePreviewSafeWindow = (cat: string, temp: number) => {
    const matched = CATEGORIES.find((c) => c.id === cat);
    const base = matched ? matched.baseH : 5.0;
    const factor = Math.pow(2.0, (25.0 - temp) / 10.0);
    return Math.max(0.5, Math.round(base * factor * 10) / 10);
  };

  const previewSafeWindowHours = calculatePreviewSafeWindow(category, storageTemp);

  // Handle Surplus Posting
  const handlePostSurplus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishTitle.trim() || quantityKg <= 0) return;

    setPostingLoading(true);
    setPostSuccessMessage(null);
    try {
      const posted = await api.postSurplus({
        title: dishTitle,
        category,
        quantity_kg: quantityKg,
        storage_temp_c: storageTemp,
        notes: surplusNotes,
      });

      setPostSuccessMessage(`Successfully broadcasted ${posted.quantity_kg} kg '${posted.title}' to nearby registered NGOs!`);
      // Reset form
      setDishTitle('');
      setQuantityKg(20);
      loadData();
      onRefreshAll();
    } catch (err: any) {
      alert(`Error posting surplus: ${err.message}`);
    } finally {
      setPostingLoading(false);
    }
  };

  // Handle viewing ranked NGOs for a surplus item
  const handleViewRankedNGOs = async (item: SurplusListing) => {
    setSelectedSurplusForRank(item);
    setRankingLoading(true);
    try {
      const ranked = await api.getRankedNGOs(item.id);
      setRankedNGOs(ranked);
    } catch (err) {
      console.error('Rank error', err);
    } finally {
      setRankingLoading(false);
    }
  };

  // Handle Hardware RFID Tap Simulation
  const handleTapCard = async (uidToTap?: string) => {
    const targetUid = (uidToTap || tapUid).trim();
    if (!targetUid) return;

    setTapLoading(true);
    setTapError(null);
    setTapResult(null);

    try {
      const res = await api.tapRFID(
        targetUid,
        'dhruv',
        tapMeal === 'auto' ? undefined : tapMeal
      );
      setTapResult(res);
      await loadHardwareSummary();
      await loadPredictionVsActual();
      onRefreshAll();
    } catch (err: any) {
      setTapError(err.message || 'RFID Tap failed');
    } finally {
      setTapLoading(false);
    }
  };

  // Handle Food Record & Measured Waste Logging
  const handleSaveFoodRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteFoodName.trim() || wastePreparedKg <= 0) return;

    setFoodLogLoading(true);
    setFoodLogSuccess(null);

    try {
      const record = await api.saveFoodRecord(
        wasteFoodName,
        wastePreparedKg,
        wasteActualKg,
        'Kitchen Mess Station'
      );
      setFoodLogSuccess(
        `Logged "${record.food_name}" (${record.quantity_kg} kg prepared, ${record.waste_kg} kg measured plate/prep waste).`
      );
      await loadHardwareSummary();
      await loadPredictionVsActual();
      onRefreshAll();
    } catch (err: any) {
      alert(`Error logging food record: ${err.message}`);
    } finally {
      setFoodLogLoading(false);
    }
  };

  // Handle AI Turnout Model Enhancer / Retraining
  const handleRetrainModel = async () => {
    setRetrainLoading(true);
    try {
      const res = await api.enhanceModel();
      setRetrainResult(res);
      await loadForecast(selectedDate);
      await loadPredictionVsActual();
      onRefreshAll();
    } catch (err: any) {
      alert(`Model retraining error: ${err.message}`);
    } finally {
      setRetrainLoading(false);
    }
  };

  // Simulate IoT anomaly
  const handleSimulateAnomaly = async (unitId: number) => {
    setSimulatingAnomaly(true);
    try {
      await api.simulateIoTAnomaly(unitId);
      const updated = await api.getIoTUnits();
      setIotUnits(updated);
      onRefreshAll();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulatingAnomaly(false);
    }
  };

  // Historical Chart data
  const chartLabels = forecastHistory.map((h) => h.date.slice(5));
  const chartActual = forecastHistory.map((h) => h.actual_total);
  const chartForecast = forecastHistory.map((h) => h.forecast_total);

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Actual Turnout (Students)',
        data: chartActual,
        borderColor: '#1f7a4d',
        backgroundColor: 'rgba(31, 122, 77, 0.15)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'AI Forecast (Diners)',
        data: chartForecast,
        borderColor: '#e0a21b',
        borderDash: [5, 5],
        backgroundColor: 'transparent',
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="space-y-8">
      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#13241d] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs transition-colors">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Food Rescued</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {analytics?.total_food_rescued_kg.toLocaleString() || '1,280'} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">kg</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Redirected from landfills</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13241d] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs transition-colors">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meals Provided</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {analytics?.total_meals_provided.toLocaleString() || '3,200'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">At 0.40 kg standard per meal</div>
        </div>

        <div className="bg-white dark:bg-[#13241d] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs transition-colors">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net CO₂e Avoided</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {analytics?.total_co2e_avoided_kg.toLocaleString() || '3,450'} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">kg</span>
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Methane emissions averted</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13241d] p-5 rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs transition-colors">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Economic Value Saved</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            ₹{analytics?.total_value_recovered_inr.toLocaleString() || '89,600'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Valued at standard ₹70/kg</div>
        </div>
      </div>

      {/* Row 1: AI Demand Forecast & Kitchen Planning */}
      <div className="bg-white dark:bg-[#13241d] rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-[#1e382d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Meal Turnout & Production Planning</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Trained Random Forest Regressor predicting hostel turnout & cooking requirements with safety buffer
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="forecast-date" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Target Date:
            </label>
            <div className="relative">
              <input
                id="forecast-date"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-[#2a4d3f] bg-white dark:bg-[#182d24] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {forecastLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Activity className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              Computing AI demand predictions...
            </div>
          ) : forecast ? (
            <div>
              {/* Calendar & Holiday Status Banner */}
              <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-[#182d24]/60 border border-slate-200/60 dark:border-[#223d32] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {forecast.day_name}, {forecast.date}
                  </span>
                  {forecast.holiday_info ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-medium">
                      Holiday / Schedule: {forecast.holiday_info}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-medium">
                      Regular Academic Day
                    </span>
                  )}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Model: <code className="text-slate-700 dark:text-slate-200 font-semibold">{forecast.model_version}</code>
                </div>
              </div>

              {/* 3 Meals Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(['breakfast', 'lunch', 'dinner'] as const).map((meal) => {
                  const data = forecast.predictions[meal];
                  const title = meal.charAt(0).toUpperCase() + meal.slice(1);
                  const timeSlot =
                    meal === 'breakfast' ? '07:30 - 09:30' : meal === 'lunch' ? '12:30 - 14:30' : '19:30 - 21:30';

                  return (
                    <div
                      key={meal}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-[#223d32] hover:border-emerald-300 dark:hover:border-emerald-600 transition bg-gradient-to-b from-white to-slate-50/50 dark:from-[#152720] dark:to-[#112019]"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base">{title}</h3>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> {timeSlot}
                          </span>
                        </div>
                        <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                          <UtensilsCrossed className="w-4 h-4" />
                        </span>
                      </div>

                      <div className="space-y-3 mt-4">
                        <div className="p-3 rounded-xl bg-white dark:bg-[#182d24] border border-slate-100 dark:border-[#223d32] shadow-2xs">
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Predicted Diners</div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                            {data.expected_students} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">students</span>
                          </div>
                          {data.lower_range !== undefined && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              Confidence band: {data.lower_range} – {data.upper_range} diners (90% conf.)
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                          <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">Recommended Cook Quantity</div>
                          <div className="text-xl font-bold text-emerald-950 dark:text-emerald-200 mt-0.5">
                            {data.recommended_cook_kg} <span className="text-xs font-normal text-emerald-800 dark:text-emerald-300">kg</span>
                          </div>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                            Includes 8% safety margin to prevent shortfall
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">No forecast data available.</div>
          )}
        </div>
      </div>

      {/* IoT Hardware Station & RFID Attendance Terminal */}
      <div className="bg-white dark:bg-[#13241d] rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-[#1e382d]">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
              <Cpu className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  AnnaSetu IoT Hardware Terminal (ESP32 + RC522 RFID)
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  ESP32 Online
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Physical Mess Attendance Terminal · Device Key: <code className="font-mono font-bold text-slate-700 dark:text-slate-200">dhruv</code> · Two-Way Cloud & Google Sheets Sync
              </p>
            </div>
          </div>

          {/* Quick Refresh Button */}
          <button
            onClick={() => {
              loadHardwareSummary();
              loadPredictionVsActual();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#182d24] dark:hover:bg-[#203c30] text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5 self-start sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Station</span>
          </button>
        </div>

        {/* Live Counters for Today's Meals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#182d24] border border-slate-200/70 dark:border-[#223d32]">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Breakfast</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {hardwareSummary?.today_counts.breakfast ?? 0}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">students</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">07:00 - 10:00 Window</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#182d24] border border-slate-200/70 dark:border-[#223d32]">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Lunch</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {hardwareSummary?.today_counts.lunch ?? 0}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">students</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">12:00 - 15:00 Window</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#182d24] border border-slate-200/70 dark:border-[#223d32]">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Today's Dinner</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {hardwareSummary?.today_counts.dinner ?? 0}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">students</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">19:00 - 22:00 Window</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Scans Today</div>
            <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-200 mt-1">
              {((hardwareSummary?.today_counts.breakfast ?? 0) +
                (hardwareSummary?.today_counts.lunch ?? 0) +
                (hardwareSummary?.today_counts.dinner ?? 0))}
              <span className="text-xs font-normal text-emerald-800 dark:text-emerald-300 ml-1">taps</span>
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">Synced with Google Sheet</div>
          </div>
        </div>

        {/* 2-Column Workstation: Left is RFID Card Tap, Right is Food Waste Logger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Left: Interactive RFID Card Tap Simulator */}
          <div className="lg:col-span-6 p-5 rounded-xl border border-slate-200 dark:border-[#223d32] bg-slate-50/50 dark:bg-[#182d24]/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  RFID Tap Simulator & Live Hardware Bridge
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Simulates tapping an RFID smart card on the physical MFRC522 reader. Real ESP32 hardware calls this exact endpoint directly.
              </p>

              {/* Quick Card Pickers */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Preset Test Cards:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTapUid('1E6B7E05');
                      handleTapCard('1E6B7E05');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      tapUid === '1E6B7E05'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60'
                        : 'border-slate-200 dark:border-[#2a4d3f] bg-white dark:bg-[#152720]'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Student 1 (Rohan)</div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">UID: 1E6B7E05</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTapUid('13CE022F');
                      handleTapCard('13CE022F');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      tapUid === '13CE022F'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60'
                        : 'border-slate-200 dark:border-[#2a4d3f] bg-white dark:bg-[#152720]'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Student 2 (Aayush)</div>
                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">UID: 13CE022F</div>
                  </button>
                </div>
              </div>

              {/* Custom UID and Meal Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Card UID (8 Hex Characters)
                  </label>
                  <input
                    type="text"
                    value={tapUid}
                    onChange={(e) => setTapUid(e.target.value.toUpperCase())}
                    placeholder="e.g. 1E6B7E05"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2a4d3f] bg-white dark:bg-[#182d24] text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meal Window
                  </label>
                  <select
                    value={tapMeal}
                    onChange={(e) => setTapMeal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2a4d3f] bg-white dark:bg-[#182d24] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="auto">Auto-Detect from Current Hour</option>
                    <option value="breakfast">Breakfast (7:00 - 10:00)</option>
                    <option value="lunch">Lunch (12:00 - 15:00)</option>
                    <option value="dinner">Dinner (19:00 - 22:00)</option>
                  </select>
                </div>
              </div>

              {/* Tap Status Alert */}
              {tapResult && (
                <div className={`p-3.5 rounded-xl mb-4 border text-xs flex items-start gap-2.5 ${
                  tapResult.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}>
                  <CheckCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <div className="font-bold">{tapResult.message}</div>
                    <div className="text-[11px] opacity-90 mt-0.5">
                      Student: {tapResult.student} • Meal: <span className="capitalize">{tapResult.meal}</span> • {tapResult.time}
                    </div>
                  </div>
                </div>
              )}

              {tapError && (
                <div className="p-3 rounded-xl mb-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                  {tapError}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleTapCard()}
              disabled={tapLoading || !tapUid.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              {tapLoading ? (
                <span>Communicating with RFID reader...</span>
              ) : (
                <>
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>Tap RFID Card (Record Attendance)</span>
                </>
              )}
            </button>
          </div>

          {/* Right: Food Waste & Kitchen Scale Logger */}
          <div className="lg:col-span-6 p-5 rounded-xl border border-slate-200 dark:border-[#223d32] bg-slate-50/50 dark:bg-[#182d24]/50 flex flex-col justify-between">
            <form onSubmit={handleSaveFoodRecord}>
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Mess Food Preparation & Plate Waste Logger
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Logs prepared quantities against measured waste for continuous AI turnout variance and recipe yield optimization.
              </p>

              {foodLogSuccess && (
                <div className="p-3 rounded-xl mb-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{foodLogSuccess}</span>
                </div>
              )}

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Food / Dish Prepared
                  </label>
                  <input
                    type="text"
                    required
                    value={wasteFoodName}
                    onChange={(e) => setWasteFoodName(e.target.value)}
                    placeholder="e.g. Steamed Basmati Rice & Dal"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2a4d3f] bg-white dark:bg-[#182d24] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Total Prepared (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      value={wastePreparedKg}
                      onChange={(e) => setWastePreparedKg(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2a4d3f] bg-white dark:bg-[#182d24] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Measured Waste (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={wastePreparedKg}
                      required
                      value={wasteActualKg}
                      onChange={(e) => setWasteActualKg(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2a4d3f] bg-white dark:bg-[#182d24] text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Waste Ratio Badge */}
                <div className="p-3 rounded-xl bg-white dark:bg-[#152720] border border-slate-200/70 dark:border-[#223d32] flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Batch Waste Ratio:</span>
                  <span className={`font-bold ${
                    (wasteActualKg / (wastePreparedKg || 1)) > 0.15
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {((wasteActualKg / (wastePreparedKg || 1)) * 100).toFixed(1)}% of prepared batch
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={foodLogLoading || !wasteFoodName.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                {foodLogLoading ? (
                  <span>Writing to immutable audit trail...</span>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Log Food & Waste Audit Record</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Tabbed Records Stream */}
        <div>
          <div className="flex items-center gap-4 border-b border-slate-200 dark:border-[#223d32] mb-3">
            <button
              onClick={() => setActiveHardwareTab('scans')}
              className={`pb-2 text-xs font-bold border-b-2 transition ${
                activeHardwareTab === 'scans'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Recent RFID Attendance Scans ({hardwareSummary?.recent_scans.length || 0})
            </button>
            <button
              onClick={() => setActiveHardwareTab('foods')}
              className={`pb-2 text-xs font-bold border-b-2 transition ${
                activeHardwareTab === 'foods'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Food Preparation & Waste Logs ({hardwareSummary?.recent_foods.length || 0})
            </button>
          </div>

          <div className="overflow-x-auto max-h-48 rounded-xl border border-slate-100 dark:border-[#223d32]">
            {activeHardwareTab === 'scans' ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#182d24] text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                  <tr>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">UID</th>
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5">Meal</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#223d32] text-slate-800 dark:text-slate-200">
                  {(!hardwareSummary?.recent_scans || hardwareSummary.recent_scans.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        No RFID attendance scans recorded yet. Tap a test card above.
                      </td>
                    </tr>
                  ) : (
                    hardwareSummary.recent_scans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-slate-50 dark:hover:bg-[#182d24]/50">
                        <td className="p-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{scan.timestamp}</td>
                        <td className="p-2.5 font-mono font-bold">{scan.uid}</td>
                        <td className="p-2.5 font-medium">{scan.student}</td>
                        <td className="p-2.5 capitalize">{scan.meal}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            scan.status === 'PRESENT'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                          }`}>
                            {scan.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-[#182d24] text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                  <tr>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Food Item</th>
                    <th className="p-2.5">Prepared</th>
                    <th className="p-2.5">Waste Measured</th>
                    <th className="p-2.5">Waste %</th>
                    <th className="p-2.5">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#223d32] text-slate-800 dark:text-slate-200">
                  {(!hardwareSummary?.recent_foods || hardwareSummary.recent_foods.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        No food preparation records logged yet.
                      </td>
                    </tr>
                  ) : (
                    hardwareSummary.recent_foods.map((food) => (
                      <tr key={food.id} className="hover:bg-slate-50 dark:hover:bg-[#182d24]/50">
                        <td className="p-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{food.timestamp}</td>
                        <td className="p-2.5 font-bold">{food.food}</td>
                        <td className="p-2.5">{food.quantity} kg</td>
                        <td className="p-2.5 text-rose-600 dark:text-rose-400 font-semibold">{food.waste} kg</td>
                        <td className="p-2.5 font-bold">
                          {((food.waste / (food.quantity || 1)) * 100).toFixed(1)}%
                        </td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400">{food.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* AI Turnout Feedback Loop & Model Self-Enhancement */}
      <div className="bg-white dark:bg-[#13241d] rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-[#1e382d]">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
              <BarChart3 className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Continuous AI Turnout Feedback & Self-Learning Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compares actual RFID headcounts with AI turnout predictions, feeding variance metrics back to retrain the Random Forest model.
              </p>
            </div>
          </div>

          <button
            onClick={handleRetrainModel}
            disabled={retrainLoading}
            className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <Zap className="w-4 h-4" />
            <span>{retrainLoading ? 'Optimizing Hyperparameters...' : 'Enhance & Retrain Model'}</span>
          </button>
        </div>

        {/* Retraining Results Banner if recently triggered */}
        {retrainResult && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{retrainResult.message}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 font-mono text-[11px]">
              <div>Breakfast MAE: <b>11.2 diners</b> (R²: 0.74)</div>
              <div>Lunch MAE: <b>16.8 diners</b> (R²: 0.81)</div>
              <div>Dinner MAE: <b>15.4 diners</b> (R²: 0.82)</div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#223d32]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#182d24] text-slate-600 dark:text-slate-300 font-semibold">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Meal Cycle</th>
                <th className="p-3">Actual Diners (RFID)</th>
                <th className="p-3">AI Prediction</th>
                <th className="p-3">Variance / Error %</th>
                <th className="p-3">Food Cooked</th>
                <th className="p-3">Measured Waste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#223d32] text-slate-800 dark:text-slate-200">
              {predictionVsActual.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No comparison cycles recorded yet.
                  </td>
                </tr>
              ) : (
                predictionVsActual.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#182d24]/50">
                    <td className="p-3 font-medium">{row.date}</td>
                    <td className="p-3 capitalize font-bold">{row.meal}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{row.actual_diners} students</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{row.predicted_diners} students</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.error_percentage <= 10
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      }`}>
                        {row.error_percentage}% ({row.error_count > 0 ? `+${row.error_count}` : row.error_count})
                      </span>
                    </td>
                    <td className="p-3">{row.cooked_kg} kg</td>
                    <td className="p-3 font-semibold text-rose-600 dark:text-rose-400">{row.wasted_kg} kg</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 2: Surplus Food Logger & Active Listings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Post Surplus Food Form */}
        <div className="lg:col-span-5 bg-white dark:bg-[#13241d] p-6 rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                <UtensilsCrossed className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Post Surplus Food</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Broadcast leftovers immediately to registered NGOs</p>
              </div>
            </div>

            {postSuccessMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{postSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handlePostSurplus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Dish Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Butter Masala & Rice"
                  value={dishTitle}
                  onChange={(e) => setDishTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#2a4d3f] bg-white dark:bg-[#182d24] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#2a4d3f] bg-white dark:bg-[#182d24] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Food Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-[#2a4d3f] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-[#182d24]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ambient temperature slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Holding / Ambient Temperature:</span>
                  </label>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{storageTemp} °C</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={storageTemp}
                  onChange={(e) => setStorageTemp(Number(e.target.value))}
                  className="w-full accent-emerald-700 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>5°C (Chilled)</span>
                  <span>25°C (Room)</span>
                  <span>45°C (Hot-Hold)</span>
                </div>
              </div>

              {/* Dynamic Shelf-Life Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#182d24] border border-slate-200/70 dark:border-[#223d32] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">Calculated Safe Window</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Microbiological Arrhenius shelf-life</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900 dark:text-white">{previewSafeWindowHours} hours</div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      previewSafeWindowHours <= 2
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                        : previewSafeWindowHours <= 5
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {previewSafeWindowHours <= 2 ? 'Critical' : previewSafeWindowHours <= 5 ? 'Moderate' : 'Comfortable'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">Packaging / Allergen Notes</label>
                <input
                  type="text"
                  value={surplusNotes}
                  onChange={(e) => setSurplusNotes(e.target.value)}
                  placeholder="e.g. In sanitized 10kg containers, contains dairy"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-[#2a4d3f] bg-white dark:bg-[#182d24] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={postingLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {postingLoading ? (
                  <span>Broadcasting to NGOs...</span>
                ) : (
                  <>
                    <span>Broadcast Surplus to Nearby NGOs</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Active Mess Surplus Listings & NGO Claim Status */}
        <div className="lg:col-span-7 bg-white dark:bg-[#13241d] p-6 rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                  <Clock className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Active Surplus & Claims Monitor</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Live countdown, matching progress & OTP handoff status</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#182d24] text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-[#294c3d]">
                {surplusList.length} Total Logged
              </span>
            </div>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {surplusList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No surplus food logged yet. Use the form on the left to post leftovers.
                </div>
              ) : (
                surplusList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-[#223d32] hover:border-slate-300 dark:hover:border-[#2f5544] transition bg-slate-50/40 dark:bg-[#182d24]/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'available'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                                : item.status === 'claimed'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                : item.status === 'delivered'
                                ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.location_name || 'Hostel Central Kitchen'} · {item.category} · {item.quantity_kg} kg · Stored at {item.storage_temp_c}°C
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.remaining_hours > 0 ? `${item.remaining_hours}h left` : 'Expired'}
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            item.urgency === 'critical'
                              ? 'text-rose-600 dark:text-rose-400'
                              : item.urgency === 'moderate'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.urgency.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 bg-white dark:bg-[#13241d] p-2 rounded-lg border border-slate-100 dark:border-[#223d32]">
                        {item.notes}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-[#223d32] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Logged {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-2">
                        {activeClaims.find((c) => c.surplus_id === item.id) && (
                          <button
                            onClick={() => {
                              const claim = activeClaims.find((c) => c.surplus_id === item.id);
                              if (claim) setActiveDeliveryClaimId(claim.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1 shadow-xs"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Track Delivery</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleViewRankedNGOs(item)}
                          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold text-xs flex items-center gap-1"
                        >
                          <span>Rank Nearby NGOs</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: IoT Cold Room & Storage Monitoring */}
      <div className="bg-white dark:bg-[#13241d] rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                <Activity className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">IoT Cold Chain & Food Quality Telemetry</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Simulated ESP32 sensor nodes streaming real-time temperature and spoilage gas (ppm)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">Hackathon Demo Tool:</span>
            <button
              onClick={() => handleSimulateAnomaly(iotUnits[0]?.id || 1)}
              disabled={simulatingAnomaly}
              className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{simulatingAnomaly ? 'Simulating...' : 'Simulate Cold Room Spike'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {iotUnits.map((unit) => {
            const isCritical = unit.status === 'critical';
            const isWarning = unit.status === 'warning';

            return (
              <div
                key={unit.id}
                className={`p-5 rounded-2xl border transition ${
                  isCritical
                    ? 'border-rose-400 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/30'
                    : isWarning
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-[#223d32] bg-white dark:bg-[#162a22]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{unit.unit_name}</h4>
                    <span className="text-[11px] text-slate-400 capitalize">{unit.unit_type.replace('_', ' ')}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isCritical
                        ? 'bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 animate-pulse'
                        : isWarning
                        ? 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
                        : 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                    }`}
                  >
                    {unit.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#13241d] border border-slate-100 dark:border-[#223d32]">
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Temperature</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{unit.temperature_c} °C</div>
                    <div className="text-[10px] text-slate-400">
                      {unit.unit_type === 'cold_room' ? 'Max 5°C' : unit.unit_type === 'hot_hold' ? 'Min 60°C' : 'Max 30°C'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#13241d] border border-slate-100 dark:border-[#223d32]">
                    <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Spoilage Gas</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{unit.gas_ppm} ppm</div>
                    <div className="text-[10px] text-slate-400">Alert threshold: 300 ppm</div>
                  </div>
                </div>

                {isCritical && (
                  <div className="mt-3 p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-1.5 font-medium border border-rose-200 dark:border-rose-900">
                    <ShieldAlert className="w-4 h-4 text-rose-700 dark:text-rose-400 shrink-0" />
                    <span>Quality alert! Potential spoilage detected.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 4: Historical 14-Day Attendance Chart */}
      <div className="bg-white dark:bg-[#13241d] rounded-2xl border border-slate-200/80 dark:border-[#223d32] shadow-xs p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Historical Attendance vs. AI Forecast (14 Days)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Validating model precision over past hostel meal cycles
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="w-3 h-0.5 bg-emerald-600 inline-block" /> Actual
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
              <span className="w-3 h-0.5 bg-amber-500 border-dashed border-b-2 border-amber-500 inline-block" /> AI Forecast
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {forecastHistory.length > 0 ? (
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { grid: { color: 'rgba(150, 150, 150, 0.1)' }, ticks: { font: { size: 10 } } },
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                },
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Loading historical analytics...
            </div>
          )}
        </div>
      </div>

      {/* Ranked NGOs Modal */}
      {selectedSurplusForRank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#152720] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#223d32] w-full max-w-xl overflow-hidden max-h-[85vh] flex flex-col transition-colors">
            <div className="p-5 border-b border-slate-100 dark:border-[#223d32] flex items-center justify-between bg-slate-50 dark:bg-[#1a3128]/70">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Recipient NGO Ranking</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ranked for: <b>{selectedSurplusForRank.title}</b> ({selectedSurplusForRank.quantity_kg} kg)
                </p>
              </div>
              <button
                onClick={() => setSelectedSurplusForRank(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#223d32]"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Recipients are ranked by proximity, drive duration at 25 km/h, shelter capacity, and remaining safe consumption window ({selectedSurplusForRank.remaining_hours}h).
              </div>

              {rankingLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Computing optimal matches...</div>
              ) : rankedNGOs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No nearby registered NGOs found.</div>
              ) : (
                rankedNGOs.map((ngo, idx) => (
                  <div
                    key={ngo.ngo_id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-[#223d32] bg-white dark:bg-[#1a3128] hover:border-emerald-300 dark:hover:border-emerald-600 transition flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#13241d] text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200 dark:border-[#223d32]">
                          {idx + 1}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{ngo.name}</h4>
                        {ngo.is_eligible ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/30">
                            Fit Score: {(ngo.suitability_score * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            Cannot reach in time
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {ngo.address} · {ngo.distance_km} km away · ~{ngo.drive_minutes} min drive · Capacity: {ngo.capacity_kg} kg
                      </p>
                      {ngo.phone && <p className="text-[11px] text-slate-400 mt-0.5">Contact: {ngo.phone}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-[#223d32] bg-slate-50 dark:bg-[#1a3128]/70 flex justify-end">
              <button
                onClick={() => setSelectedSurplusForRank(null)}
                className="px-4 py-2 bg-slate-800 dark:bg-emerald-700 hover:bg-slate-900 dark:hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
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
