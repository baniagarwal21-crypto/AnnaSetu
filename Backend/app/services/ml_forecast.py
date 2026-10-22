import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path
from app.config import settings

# Load model and calendar once at module level
HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parents[2]

ML_MODEL_FILE = PROJECT_ROOT / "ML" / "mess_model.joblib"
CALENDAR_FILE = PROJECT_ROOT / "ML" / "Holidays_final_fixed.csv"
BACKUP_MODEL_FILE = PROJECT_ROOT / "Backend" / "mess_rfr_model.joblib"

loaded_bundle = None
calendar_df = None
model_version = "None"

def load_ml_assets():
    global loaded_bundle, calendar_df, model_version
    
    # 1. Try loading primary trained Random Forest model
    if ML_MODEL_FILE.exists():
        try:
            loaded_bundle = joblib.load(ML_MODEL_FILE)
            model_version = "RandomForest-v2 (Look-ahead Academic Calendar)"
            print(f" Loaded ML Model from {ML_MODEL_FILE}")
        except Exception as e:
            print(f"[WARNING] Error loading {ML_MODEL_FILE}: {e}")

    # 2. Try loading backup model if primary not available
    if not loaded_bundle and BACKUP_MODEL_FILE.exists():
        try:
            loaded_bundle = joblib.load(BACKUP_MODEL_FILE)
            model_version = "RandomForest-v1 (Day/Month Baseline)"
            print(f" Loaded Backup ML Model from {BACKUP_MODEL_FILE}")
        except Exception as e:
            print(f"[WARNING] Error loading backup model: {e}")

    # 3. Load Calendar if present
    if CALENDAR_FILE.exists():
        try:
            df = pd.read_csv(CALENDAR_FILE)
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            df = df.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)
            calendar_df = df
            print(f" Loaded {len(calendar_df)} calendar dates for feature generation")
        except Exception as e:
            print(f"[WARNING] Could not load calendar: {e}")

load_ml_assets()

def _runs(flags):
    out = np.zeros(len(flags), dtype=int)
    i = 0
    while i < len(flags):
        if flags[i]:
            j = i
            while j < len(flags) and flags[j]:
                j += 1
            out[i:j] = j - i
            i = j
        else:
            i += 1
    return out

def get_prediction(target_date_str: str) -> dict:
    global loaded_bundle, calendar_df, model_version
    
    if loaded_bundle is None:
        load_ml_assets()

    target_dt = pd.to_datetime(target_date_str)
    day_name = target_dt.strftime("%A")
    dow = target_dt.dayofweek
    is_weekend = dow in (5, 6)

    holiday_label = None
    mess_status = "Open"
    is_closed = False

    # Check calendar if available
    if calendar_df is not None:
        matched = calendar_df[calendar_df["date"].dt.date == target_dt.date()]
        if not matched.empty:
            row = matched.iloc[0]
            holiday_label = str(row.get("holiday", "")).strip() or None
            mess_status = str(row.get("mess_status", "Open")).strip().title()
            if mess_status == "Closed":
                is_closed = True

    if is_closed:
        return {
            "date": target_date_str,
            "day_name": day_name,
            "holiday_info": holiday_label,
            "mess_status": "Closed",
            "is_closed": True,
            "predictions": {
                "breakfast": {"expected_students": 0, "recommended_cook_kg": 0.0, "lower_range": 0, "upper_range": 0},
                "lunch": {"expected_students": 0, "recommended_cook_kg": 0.0, "lower_range": 0, "upper_range": 0},
                "dinner": {"expected_students": 0, "recommended_cook_kg": 0.0, "lower_range": 0, "upper_range": 0}
            },
            "model_version": model_version
        }

    # If we have the v2 model bundle with rich features
    if loaded_bundle and isinstance(loaded_bundle, dict) and "features" in loaded_bundle:
        features = loaded_bundle["features"]
        model = loaded_bundle["model"]
        upper_margins = loaded_bundle.get("upper", {"breakfast": 12, "lunch": 15, "dinner": 14})
        lower_margins = loaded_bundle.get("lower", {"breakfast": -10, "lunch": -12, "dinner": -11})

        # Check if v2 features
        if "dow" in features:
            # Build feature vector
            is_sunday = int(dow == 6)
            is_first_sat = int(dow == 5 and target_dt.day <= 7)
            is_third_sat = int(dow == 5 and 15 <= target_dt.day <= 21)
            is_pub_hol = int(holiday_label is not None and "Saturday" not in str(holiday_label) and "Sunday" not in str(holiday_label))
            
            feat_dict = {
                "dow": dow,
                "is_sunday": is_sunday,
                "is_first_sat": is_first_sat,
                "is_third_sat": is_third_sat,
                "is_public_holiday": is_pub_hol,
                "holiday_run_len": 1 if is_pub_hol else 0,
                "holiday_run_pos": 1 if is_pub_hol else 0,
                "days_since_closed": 30,
                "days_to_next_closed": 30,
            }
            input_df = pd.DataFrame([feat_dict])[features]
            preds = model.predict(input_df)[0]
            breakfast_diners = max(0, int(round(preds[0])))
            lunch_diners = max(0, int(round(preds[1])))
            dinner_diners = max(0, int(round(preds[2])))
        else:
            # v1 feature set: day_of_week, day_of_month, month
            input_df = pd.DataFrame([{
                "day_of_week": dow,
                "day_of_month": target_dt.day,
                "month": target_dt.month
            }])[features]
            preds = model.predict(input_df)[0]
            breakfast_diners = max(0, int(round(preds[0])))
            lunch_diners = max(0, int(round(preds[1])))
            dinner_diners = max(0, int(round(preds[2])))
    else:
        # Heuristic fallback if no model file loaded
        base = 240 if is_weekend else 440
        breakfast_diners = int(base * 0.75)
        lunch_diners = int(base)
        dinner_diners = int(base * 0.95)
        upper_margins = {"breakfast": 15, "lunch": 20, "dinner": 18}
        lower_margins = {"breakfast": -12, "lunch": -15, "dinner": -14}

    # Cook quantity with 8% safety margin
    b_cook = round(breakfast_diners * settings.PORTION_SIZES["breakfast"] * 1.08, 2)
    l_cook = round(lunch_diners * settings.PORTION_SIZES["lunch"] * 1.08, 2)
    d_cook = round(dinner_diners * settings.PORTION_SIZES["dinner"] * 1.08, 2)

    return {
        "date": target_date_str,
        "day_name": day_name,
        "holiday_info": holiday_label,
        "mess_status": mess_status,
        "is_closed": False,
        "predictions": {
            "breakfast": {
                "expected_students": breakfast_diners,
                "recommended_cook_kg": b_cook,
                "lower_range": max(0, int(breakfast_diners + lower_margins.get("breakfast", -10))),
                "upper_range": int(breakfast_diners + upper_margins.get("breakfast", 12))
            },
            "lunch": {
                "expected_students": lunch_diners,
                "recommended_cook_kg": l_cook,
                "lower_range": max(0, int(lunch_diners + lower_margins.get("lunch", -12))),
                "upper_range": int(lunch_diners + upper_margins.get("lunch", 15))
            },
            "dinner": {
                "expected_students": dinner_diners,
                "recommended_cook_kg": d_cook,
                "lower_range": max(0, int(dinner_diners + lower_margins.get("dinner", -11))),
                "upper_range": int(dinner_diners + upper_margins.get("dinner", 14))
            }
        },
        "model_version": model_version
    }
