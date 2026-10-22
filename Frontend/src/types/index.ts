export interface MealPrediction {
  expected_students: number;
  recommended_cook_kg: number;
  lower_range?: number;
  upper_range?: number;
}

export interface ForecastResponse {
  date: string;
  day_name?: string;
  holiday_info?: string;
  mess_status?: string;
  is_closed: boolean;
  predictions: {
    breakfast: MealPrediction;
    lunch: MealPrediction;
    dinner: MealPrediction;
  };
  model_version: string;
}

export interface SurplusListing {
  id: number;
  title: string;
  category: string;
  quantity_kg: number;
  storage_temp_c: number;
  safe_window_hours: number;
  remaining_hours: number;
  urgency: 'critical' | 'moderate' | 'comfortable';
  expires_at: string;
  location_id: number;
  location_name?: string;
  status: 'available' | 'claimed' | 'picked_up' | 'delivered' | 'expired';
  notes?: string;
  created_at: string;
}

export interface RankedNGO {
  ngo_id: number;
  name: string;
  address: string;
  distance_km: number;
  drive_minutes: number;
  capacity_kg: number;
  is_eligible: boolean;
  suitability_score: number;
  phone?: string;
}

export interface Claim {
  id: number;
  surplus_id: number;
  surplus_title: string;
  ngo_id: number;
  ngo_name: string;
  claimed_kg: number;
  otp_code: string;
  status: 'reserved' | 'in_transit' | 'completed' | 'cancelled';
  claimed_at: string;
  completed_at?: string;
}

export interface IoTUnit {
  id: number;
  unit_name: string;
  unit_type: 'cold_room' | 'hot_hold' | 'dry_store';
  temperature_c: number;
  gas_ppm: number;
  status: 'normal' | 'warning' | 'critical';
  updated_at: string;
}

export interface AuditLog {
  id: number;
  action: string;
  details: string;
  previous_hash: string;
  entry_hash: string;
  actor_name: string;
  created_at: string;
}

export interface AnalyticsOverview {
  total_food_rescued_kg: number;
  total_meals_provided: number;
  total_co2e_avoided_kg: number;
  total_value_recovered_inr: number;
  percent_surplus_redistributed: number;
  active_surplus_count: number;
  active_claims_count: number;
  category_breakdown: Record<string, number>;
  recent_14_day_waste_trend: Array<{ date: string; wasted_kg: number }>;
}

export interface NotificationItem {
  id: number;
  target_role: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface RouteStop {
  stop_number: number;
  type: 'pickup' | 'delivery';
  location_name: string;
  address: string;
  latitude: number;
  longitude: number;
  kg: number;
  category: string;
  eta_minutes: number;
  otp_code?: string;
  claim_id?: number;
  is_late: boolean;
}

export interface OptimizedRoute {
  total_km: number;
  total_minutes: number;
  distance_savings_percent: number;
  vehicle_capacity_kg: number;
  stops: RouteStop[];
}

export interface SystemHealth {
  status: string;
  service: string;
  database: {
    status: string;
    engine: string;
    is_demonstration_fallback: boolean;
    url_display: string;
    note: string;
  };
  ml_engine: {
    status: string;
    model_loaded: boolean;
    model_version: string;
  };
}

export interface RFIDTapResponse {
  status: string;
  message: string;
  uid: string;
  student: string;
  date: string;
  time: string;
  meal: string;
  today_counts: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
}

export interface RFIDScanLog {
  id: number;
  uid: string;
  student_name: string;
  date: string;
  meal: string;
  status: string;
  timestamp: string;
}

export interface FoodRecord {
  id: number;
  food_name: string;
  quantity_kg: number;
  waste_kg: number;
  source: string;
  timestamp: string;
}

export interface HardwareDashboardSummary {
  status: string;
  date: string;
  mess_status: string;
  today_counts: {
    breakfast: number;
    lunch: number;
    dinner: number;
  };
  recent_scans: Array<{
    id: number;
    uid: string;
    student: string;
    meal: string;
    status: string;
    timestamp: string;
  }>;
  recent_foods: Array<{
    id: number;
    food: string;
    quantity: number;
    waste: number;
    source: string;
    timestamp: string;
  }>;
}

export interface LiveDeliveryTracking {
  id: number;
  claim_id: number;
  driver_name: string;
  driver_phone: string;
  vehicle_type: string;
  current_lat: float_number;
  current_lng: float_number;
  pickup_lat: float_number;
  pickup_lng: float_number;
  target_lat: float_number;
  target_lng: float_number;
  pickup_name: string;
  destination_name: string;
  food_title: string;
  claimed_kg: number;
  status: string;
  speed_kmh: number;
  remaining_distance_km: number;
  eta_minutes: number;
  progress_percent: number;
  waypoints: [number, number][];
  current_waypoint_index: number;
  otp_code: string;
  updated_at: string;
}

type float_number = number;

export interface PredictionVsActualItem {
  date: string;
  meal: string;
  actual_diners: number;
  predicted_diners: number;
  error_count: number;
  error_percentage: number;
  cooked_kg: number;
  wasted_kg: number;
}

export interface ModelEnhancementResponse {
  status: string;
  message: string;
  retrained_at: string;
  dataset_rows?: number;
  updated_metrics?: any;
}

export type UserRole = 'hostel_admin' | 'ngo_coordinator' | 'driver' | 'auditor';
