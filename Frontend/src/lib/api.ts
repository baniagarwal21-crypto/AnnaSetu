import {
  ForecastResponse,
  SurplusListing,
  RankedNGO,
  Claim,
  IoTUnit,
  AuditLog,
  AnalyticsOverview,
  NotificationItem,
  OptimizedRoute,
  SystemHealth,
  RFIDTapResponse,
  RFIDScanLog,
  FoodRecord,
  HardwareDashboardSummary,
  LiveDeliveryTracking,
  PredictionVsActualItem,
  ModelEnhancementResponse
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const V1 = `${API_BASE_URL}/api/v1`;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const err = await res.json();
      errorDetail = err.detail || err.message || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // System Health
  async getHealth(): Promise<SystemHealth> {
    const res = await fetch(`${V1}/health`, { cache: 'no-store' });
    return handleResponse<SystemHealth>(res);
  },

  // Demand Forecasting
  async predictDemand(date: string): Promise<ForecastResponse> {
    const res = await fetch(`${V1}/forecast/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    return handleResponse<ForecastResponse>(res);
  },

  async getForecastHistory(): Promise<any[]> {
    const res = await fetch(`${V1}/forecast/history`, { cache: 'no-store' });
    return handleResponse<any[]>(res);
  },

  // Surplus Listings
  async getSurplus(status?: string): Promise<SurplusListing[]> {
    const url = status ? `${V1}/surplus?status=${status}` : `${V1}/surplus`;
    const res = await fetch(url, { cache: 'no-store' });
    return handleResponse<SurplusListing[]>(res);
  },

  async postSurplus(data: {
    title: string;
    category: string;
    quantity_kg: number;
    storage_temp_c: number;
    location_id?: number;
    notes?: string;
  }): Promise<SurplusListing> {
    const res = await fetch(`${V1}/surplus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<SurplusListing>(res);
  },

  async getRankedNGOs(surplusId: number): Promise<RankedNGO[]> {
    const res = await fetch(`${V1}/surplus/ranked-ngos/${surplusId}`, { cache: 'no-store' });
    return handleResponse<RankedNGO[]>(res);
  },

  // Claims & OTP Handoff
  async createClaim(surplusId: number, ngoId: number, claimedKg?: number): Promise<Claim> {
    const res = await fetch(`${V1}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surplus_id: surplusId,
        ngo_id: ngoId,
        claimed_kg: claimedKg,
      }),
    });
    return handleResponse<Claim>(res);
  },

  async verifyOTP(claimId: number, otpCode: string): Promise<{ success: boolean; message: string; claim_id?: number }> {
    const res = await fetch(`${V1}/claims/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_id: claimId, otp_code: otpCode }),
    });
    return handleResponse(res);
  },

  async getActiveClaims(): Promise<Claim[]> {
    const res = await fetch(`${V1}/claims/active`, { cache: 'no-store' });
    return handleResponse<Claim[]>(res);
  },

  // Route Optimization
  async getOptimizedRoute(capacityKg: number = 150): Promise<OptimizedRoute> {
    const res = await fetch(`${V1}/routes/optimize?capacity_kg=${capacityKg}`, { cache: 'no-store' });
    return handleResponse<OptimizedRoute>(res);
  },

  // IoT Sensor Telemetry
  async getIoTUnits(): Promise<IoTUnit[]> {
    const res = await fetch(`${V1}/iot/units`, { cache: 'no-store' });
    return handleResponse<IoTUnit[]>(res);
  },

  async simulateIoTAnomaly(unitId: number, temp?: number, gas?: number): Promise<IoTUnit> {
    const res = await fetch(`${V1}/iot/simulate-anomaly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unit_id: unitId, temperature_c: temp, gas_ppm: gas }),
    });
    return handleResponse<IoTUnit>(res);
  },

  // Analytics & Audit Trail
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    const res = await fetch(`${V1}/analytics/overview`, { cache: 'no-store' });
    return handleResponse<AnalyticsOverview>(res);
  },

  async getAuditTrail(): Promise<AuditLog[]> {
    const res = await fetch(`${V1}/analytics/audit-trail`, { cache: 'no-store' });
    return handleResponse<AuditLog[]>(res);
  },

  // Notifications
  async getNotifications(role?: string): Promise<NotificationItem[]> {
    const url = role ? `${V1}/notifications?role=${role}` : `${V1}/notifications`;
    const res = await fetch(url, { cache: 'no-store' });
    return handleResponse<NotificationItem[]>(res);
  },

  async markAllNotificationsRead(role?: string): Promise<{ status: string; marked_count: number }> {
    const url = role ? `${V1}/notifications/mark-all-read?role=${role}` : `${V1}/notifications/mark-all-read`;
    const res = await fetch(url, { method: 'POST' });
    return handleResponse(res);
  },

  // Hardware Station & RFID Attendance (ESP32 Integration)
  async tapRFID(uid: string, key: string = "dhruv", mealOverride?: string): Promise<RFIDTapResponse> {
    const res = await fetch(`${V1}/hardware/rfid-tap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, key, meal_override: mealOverride }),
    });
    return handleResponse<RFIDTapResponse>(res);
  },

  async getRFIDLogs(): Promise<RFIDScanLog[]> {
    const res = await fetch(`${V1}/hardware/attendance-logs`, { cache: 'no-store' });
    return handleResponse<RFIDScanLog[]>(res);
  },

  async saveFoodRecord(foodName: string, quantityKg: number, wasteKg: number, source?: string): Promise<FoodRecord> {
    const res = await fetch(`${V1}/hardware/food-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        food_name: foodName,
        quantity_kg: quantityKg,
        waste_kg: wasteKg,
        source: source || 'Dashboard UI'
      }),
    });
    return handleResponse<FoodRecord>(res);
  },

  async getFoodRecords(): Promise<FoodRecord[]> {
    const res = await fetch(`${V1}/hardware/food-records`, { cache: 'no-store' });
    return handleResponse<FoodRecord[]>(res);
  },

  async getHardwareSummary(): Promise<HardwareDashboardSummary> {
    const res = await fetch(`${V1}/hardware/dashboard-summary`, { cache: 'no-store' });
    return handleResponse<HardwareDashboardSummary>(res);
  },

  // AI Turnout Feedback Loop & Model Enhancement
  async getPredictionVsActual(days: number = 7): Promise<PredictionVsActualItem[]> {
    const res = await fetch(`${V1}/forecast/prediction-vs-actual?days=${days}`, { cache: 'no-store' });
    return handleResponse<PredictionVsActualItem[]>(res);
  },

  async enhanceModel(): Promise<ModelEnhancementResponse> {
    const res = await fetch(`${V1}/forecast/enhance-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return handleResponse<ModelEnhancementResponse>(res);
  },

  // Live GPS Delivery Tracking (Zomato/Blinkit Style)
  async getActiveDeliveries(): Promise<LiveDeliveryTracking[]> {
    const res = await fetch(`${V1}/delivery/active`, { cache: 'no-store' });
    return handleResponse<LiveDeliveryTracking[]>(res);
  },

  async getLiveDelivery(claimId: number): Promise<LiveDeliveryTracking> {
    const res = await fetch(`${V1}/delivery/live/${claimId}`, { cache: 'no-store' });
    return handleResponse<LiveDeliveryTracking>(res);
  },

  async simulateDeliveryStep(claimId: number, stepAdvance: number = 1): Promise<LiveDeliveryTracking> {
    const res = await fetch(`${V1}/delivery/simulate-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim_id: claimId, step_advance: stepAdvance }),
    });
    return handleResponse<LiveDeliveryTracking>(res);
  },

  async resetDeliverySimulation(claimId: number): Promise<LiveDeliveryTracking> {
    const res = await fetch(`${V1}/delivery/reset-simulation?claim_id=${claimId}`, {
      method: 'POST',
    });
    return handleResponse<LiveDeliveryTracking>(res);
  },
};
