import os
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
HERE = Path(__file__).resolve().parent
BACKEND_DIR = HERE.parent
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from main import app

class TestAnnaSetuAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_health_check(self):
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("database", data)
        self.assertIn("ml_engine", data)
        self.assertTrue(data["ml_engine"]["model_loaded"])

    def test_02_predict_demand(self):
        payload = {"date": "2026-10-25"}
        response = self.client.post("/api/v1/forecast/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("predictions", data)
        self.assertIn("lunch", data["predictions"])
        self.assertGreater(data["predictions"]["lunch"]["expected_students"], 0)
        self.assertGreater(data["predictions"]["lunch"]["recommended_cook_kg"], 0)

    def test_03_forecast_history(self):
        response = self.client.get("/api/v1/forecast/history")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

    def test_04_surplus_flow(self):
        # 1. Post new surplus batch
        post_payload = {
            "title": "UnitTest Dal Tadka & Jeera Rice",
            "category": "Cooked rice and grains",
            "quantity_kg": 25.0,
            "storage_temp_c": 28.0,
            "notes": "Automated unit test batch"
        }
        res_post = self.client.post("/api/v1/surplus", json=post_payload)
        self.assertEqual(res_post.status_code, 200)
        surplus_item = res_post.json()
        surplus_id = surplus_item["id"]
        self.assertEqual(surplus_item["title"], post_payload["title"])
        self.assertGreater(surplus_item["safe_window_hours"], 0)

        # 2. Get ranked NGOs for this surplus
        res_rank = self.client.get(f"/api/v1/surplus/ranked-ngos/{surplus_id}")
        self.assertEqual(res_rank.status_code, 200)
        ranked = res_rank.json()
        self.assertIsInstance(ranked, list)
        self.assertGreater(len(ranked), 0)
        chosen_ngo_id = ranked[0]["ngo_id"]

        # 3. Create claim (reserve food)
        res_claim = self.client.post("/api/v1/claims", json={
            "surplus_id": surplus_id,
            "ngo_id": chosen_ngo_id,
            "claimed_kg": 25.0
        })
        self.assertEqual(res_claim.status_code, 200)
        claim_data = res_claim.json()
        self.assertEqual(claim_data["status"], "reserved")
        otp = claim_data["otp_code"]
        claim_id = claim_data["id"]
        self.assertEqual(len(otp), 6)

        # 4. Verify OTP with incorrect code should fail
        res_bad_otp = self.client.post("/api/v1/claims/verify-otp", json={
            "claim_id": claim_id,
            "otp_code": "000000"
        })
        self.assertEqual(res_bad_otp.status_code, 400)

        # 5. Verify OTP with correct code should succeed
        res_good_otp = self.client.post("/api/v1/claims/verify-otp", json={
            "claim_id": claim_id,
            "otp_code": otp
        })
        self.assertEqual(res_good_otp.status_code, 200)
        self.assertTrue(res_good_otp.json()["success"])

    def test_05_route_optimization(self):
        response = self.client.get("/api/v1/routes/optimize?capacity_kg=150")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("total_km", data)
        self.assertIn("stops", data)

    def test_06_iot_monitoring_and_simulation(self):
        # Fetch units
        res_units = self.client.get("/api/v1/iot/units")
        self.assertEqual(res_units.status_code, 200)
        units = res_units.json()
        self.assertGreater(len(units), 0)
        target_unit_id = units[0]["id"]

        # Trigger simulated anomaly
        res_sim = self.client.post("/api/v1/iot/simulate-anomaly", json={
            "unit_id": target_unit_id,
            "temperature_c": 14.5,
            "gas_ppm": 360.0
        })
        self.assertEqual(res_sim.status_code, 200)
        updated = res_sim.json()
        self.assertEqual(updated["status"], "critical")
        self.assertEqual(updated["temperature_c"], 14.5)

    def test_07_analytics_and_audit_trail(self):
        res_analytics = self.client.get("/api/v1/analytics/overview")
        self.assertEqual(res_analytics.status_code, 200)
        data = res_analytics.json()
        self.assertIn("total_food_rescued_kg", data)
        self.assertIn("total_co2e_avoided_kg", data)
        self.assertIn("total_meals_provided", data)

        res_audit = self.client.get("/api/v1/analytics/audit-trail")
        self.assertEqual(res_audit.status_code, 200)
        trail = res_audit.json()
        self.assertIsInstance(trail, list)
        self.assertGreater(len(trail), 0)
        # Check hash length
        self.assertEqual(len(trail[0]["entry_hash"]), 16)

    def test_08_notifications(self):
        res = self.client.get("/api/v1/notifications")
        self.assertEqual(res.status_code, 200)
        notifs = res.json()
        self.assertIsInstance(notifs, list)

    def test_09_rfid_tap_and_hardware_station(self):
        # 1. Invalid device key should fail with 401
        res_bad_key = self.client.post("/api/v1/hardware/rfid-tap", json={
            "key": "wrong_key",
            "uid": "1E6B7E05",
            "meal_override": "lunch"
        })
        self.assertEqual(res_bad_key.status_code, 401)

        # 2. Valid tap with student 1
        res_tap1 = self.client.post("/api/v1/hardware/rfid-tap", json={
            "key": "dhruv",
            "uid": "1E6B7E05",
            "meal_override": "lunch"
        })
        self.assertEqual(res_tap1.status_code, 200)
        tap_data = res_tap1.json()
        self.assertIn("status", tap_data)
        self.assertEqual(tap_data["uid"], "1E6B7E05")
        self.assertIn("Student 1", tap_data["student"])
        self.assertEqual(tap_data["meal"], "lunch")

        # 3. Log food preparation and waste record
        res_food = self.client.post("/api/v1/hardware/food-records", json={
            "food_name": "Test Paneer Curry",
            "quantity_kg": 40.0,
            "waste_kg": 3.2,
            "source": "UnitTest Suite"
        })
        self.assertEqual(res_food.status_code, 200)
        food_data = res_food.json()
        self.assertEqual(food_data["food_name"], "Test Paneer Curry")
        self.assertEqual(food_data["quantity_kg"], 40.0)

        # 4. Fetch hardware summary
        res_sum = self.client.get("/api/v1/hardware/dashboard-summary")
        self.assertEqual(res_sum.status_code, 200)
        summary = res_sum.json()
        self.assertIn("today_counts", summary)
        self.assertIn("recent_scans", summary)
        self.assertIn("recent_foods", summary)

    def test_10_prediction_vs_actual_and_enhance_model(self):
        res_comp = self.client.get("/api/v1/forecast/prediction-vs-actual?days=7")
        self.assertEqual(res_comp.status_code, 200)
        comps = res_comp.json()
        self.assertIsInstance(comps, list)
        if len(comps) > 0:
            self.assertIn("actual_diners", comps[0])
            self.assertIn("predicted_diners", comps[0])

        res_enhance = self.client.post("/api/v1/forecast/enhance-model", json={})
        self.assertIn(res_enhance.status_code, [200, 201])
        retrain_info = res_enhance.json()
        self.assertIn("status", retrain_info)

    def test_11_live_delivery_gps_tracking(self):
        # 1. Fetch active deliveries (auto-initializes claim #1 if none exist)
        res_active = self.client.get("/api/v1/delivery/active")
        self.assertEqual(res_active.status_code, 200)
        deliveries = res_active.json()
        self.assertIsInstance(deliveries, list)
        self.assertGreater(len(deliveries), 0)

        claim_id = deliveries[0]["claim_id"]

        # 2. Step forward along route
        res_step = self.client.post("/api/v1/delivery/simulate-step", json={
            "claim_id": claim_id,
            "step_advance": 1
        })
        self.assertEqual(res_step.status_code, 200)
        stepped = res_step.json()
        self.assertIn("current_lat", stepped)
        self.assertIn("progress_percent", stepped)

        # 3. Reset simulation
        res_reset = self.client.post(f"/api/v1/delivery/reset-simulation?claim_id={claim_id}")
        self.assertEqual(res_reset.status_code, 200)
        reset_data = res_reset.json()
        self.assertEqual(reset_data["current_waypoint_index"], 0)

if __name__ == "__main__":
    unittest.main()
