import os
import sys
import time
import pytest
from fastapi.testclient import TestClient

# Ensure workspace root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from backend.patient_catalog import patient_catalog
from backend.controllers.registry import controller_registry
from backend.controllers.placeholder import NoOpPlaceholderController
from backend.schemas import SimulateRequest, CompareRequest
from backend.sim_service import sim_service

client = TestClient(app)


class TestPatientCatalog:
    def test_all_30_patients_loaded(self):
        patients = patient_catalog.get_all_patients()
        assert len(patients) == 30, f"Expected 30 patients, got {len(patients)}"

    def test_cohort_distribution(self):
        patients = patient_catalog.get_all_patients()
        cohorts = [p["cohort"] for p in patients]
        assert cohorts.count("Adult") == 10
        assert cohorts.count("Adolescent") == 10
        assert cohorts.count("Child") == 10

    def test_patient_clinical_fields(self):
        patients = patient_catalog.get_all_patients()
        for p in patients:
            assert p["age"] > 0, f"Invalid age for {p['simglucose_name']}"
            assert p["body_weight_kg"] > 0, f"Invalid BW for {p['simglucose_name']}"
            assert p["tdi"] > 0, f"Invalid TDI for {p['simglucose_name']}"
            assert p["icr"] > 0, f"Invalid ICR for {p['simglucose_name']}"
            assert p["isf"] > 0, f"Invalid ISF for {p['simglucose_name']}"
            assert 0 <= p["subject_index"] <= 9


class TestControllerRegistry:
    def test_placeholder_controller_registered(self):
        ctrl_cls = controller_registry.get("placeholder_noop")
        assert ctrl_cls == NoOpPlaceholderController
        ctrl = ctrl_cls()
        info = ctrl.get_info()
        assert info["id"] == "placeholder_noop"
        assert info["category"] == "Placeholder"

    def test_all_rl4t1d_controllers_registered(self):
        registered = controller_registry.list_all()
        ids = [c["id"] for c in registered]
        assert "placeholder_noop" in ids
        assert "rl4t1d_basal_bolus" in ids
        assert "rl4t1d_pid" in ids
        assert "rl4t1d_neural" in ids

    def test_placeholder_controller_policy_zero_action(self):
        ctrl = NoOpPlaceholderController()
        ctrl.reset(patient_meta={}, params={})
        action = ctrl.policy(observation=None, reward=0.0, done=False)
        assert action.basal == 0.0
        assert action.bolus == 0.0

    def test_rl4t1d_basal_bolus_policy(self):
        ctrl_cls = controller_registry.get("rl4t1d_basal_bolus")
        ctrl = ctrl_cls()
        meta = {"body_weight_kg": 75.0, "icr": 15.0, "isf": 45.0, "u2ss": 1.43}
        ctrl.reset(patient_meta=meta, params={"target_bg": 120.0})

        # Step with normal BG and no meal
        from collections import namedtuple
        Obs = namedtuple("Obs", ["CGM", "CHO", "minute"])
        action1 = ctrl.policy(observation=Obs(CGM=120.0, CHO=0.0, minute=0))
        assert action1.basal > 0.0
        assert action1.bolus == 0.0

        # Step with meal announcement: should deliver meal bolus rate (U/min across 5-min step)
        action2 = ctrl.policy(observation=Obs(CGM=120.0, CHO=60.0, minute=1))
        assert action2.bolus > 0.0
        # 60g / 15 ICR = 4.0 U total; delivered over 5 min interval = 0.8 U/min
        assert abs(action2.bolus * 5.0 - (60.0 / 15.0)) < 0.5

    def test_rl4t1d_pid_policy(self):
        ctrl_cls = controller_registry.get("rl4t1d_pid")
        ctrl = ctrl_cls()
        meta = {"body_weight_kg": 75.0, "u2ss": 1.43}
        ctrl.reset(patient_meta=meta, params={"target_bg": 120.0, "kp": 0.005, "ki": 0.0001, "kd": 0.05})

        from collections import namedtuple
        Obs = namedtuple("Obs", ["CGM", "CHO", "minute"])
        # High BG should increase basal insulin above baseline
        action_high = ctrl.policy(observation=Obs(CGM=250.0, CHO=0.0, minute=0))
        assert action_high.basal > 0.0

    def test_rl4t1d_neural_policy(self):
        ctrl_cls = controller_registry.get("rl4t1d_neural")
        ctrl = ctrl_cls()
        meta = {"body_weight_kg": 75.0, "u2ss": 1.43, "icr": 15.0, "isf": 45.0}
        ctrl.reset(patient_meta=meta, params={})

        from collections import namedtuple
        Obs = namedtuple("Obs", ["CGM", "CHO", "minute"])
        action = ctrl.policy(observation=Obs(CGM=150.0, CHO=0.0, minute=0))
        assert action.basal >= 0.0
        assert action.bolus >= 0.0


class TestAPIEndpoints:
    def test_health_check(self):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"

    def test_metadata_endpoint(self):
        res = client.get("/api/metadata")
        assert res.status_code == 200
        data = res.json()
        assert len(data["patients"]) == 30
        assert any(c["id"] == "placeholder_noop" for c in data["controllers"])
        assert "GuardianRT" in data["sensors"]
        assert "Insulet" in data["pumps"]

    def test_simulate_endpoint_runtime_and_traces(self):
        req_payload = {
            "patient_name": "adult#001",
            "controller_id": "placeholder_noop",
            "sensor": "GuardianRT",
            "pump": "Insulet",
            "seed": 42,
            "duration_hours": 24,
            "start_time_hour": 0,
            "meals": [
                {"label": "Breakfast", "time_minutes": 420, "carbs_g": 45.0},
                {"label": "Lunch", "time_minutes": 720, "carbs_g": 60.0},
                {"label": "Dinner", "time_minutes": 1080, "carbs_g": 75.0},
            ],
            "sensor_noise": True,
        }

        t0 = time.time()
        res = client.post("/api/simulate", json=req_payload)
        elapsed = time.time() - t0

        assert res.status_code == 200
        data = res.json()

        # Performance requirement: under 2 seconds
        assert elapsed < 2.0, f"Simulation took {elapsed:.2f}s, exceeding 2.0s limit"

        # Verify trace lengths are aligned
        n_points = len(data["timestamps"])
        assert n_points > 100
        assert len(data["minutes_elapsed"]) == n_points
        assert len(data["bg"]) == n_points
        assert len(data["cgm"]) == n_points
        assert len(data["insulin"]) == n_points
        assert len(data["cho"]) == n_points

        # Verify metrics
        metrics = data["metrics"]
        assert 0.0 <= metrics["tir_pct"] <= 100.0
        assert 0.0 <= metrics["tar_pct"] <= 100.0
        assert 0.0 <= metrics["tbr_pct"] <= 100.0
        assert metrics["risk_index"] >= 0.0
        assert metrics["lbgi"] >= 0.0
        assert metrics["hbgi"] >= 0.0
        assert 30.0 <= metrics["mean_bg"] <= 600.0

    def test_compare_endpoint(self):
        req_payload = {
            "controller_a_id": "placeholder_noop",
            "controller_b_id": "placeholder_noop",
            "patient_name": "adult#001",
            "seed": 123,
            "duration_hours": 12,
            "meals": [
                {"label": "Lunch", "time_minutes": 720, "carbs_g": 50.0},
            ],
        }

        res = client.post("/api/compare", json=req_payload)
        assert res.status_code == 200
        data = res.json()
        assert "run_a" in data and "run_b" in data
        assert len(data["run_a"]["bg"]) == len(data["run_b"]["bg"])
        # Because both runs share identical settings, seed, and controller, traces must match exactly
        assert data["run_a"]["cgm"] == data["run_b"]["cgm"]

    def test_compare_noop_vs_rl4t1d_basal_bolus(self):
        req_payload = {
            "controller_a_id": "placeholder_noop",
            "controller_b_id": "rl4t1d_basal_bolus",
            "patient_name": "adult#001",
            "seed": 42,
            "duration_hours": 24,
            "meals": [
                {"label": "Breakfast", "time_minutes": 420, "carbs_g": 50.0},
                {"label": "Lunch", "time_minutes": 720, "carbs_g": 60.0},
            ],
        }

        res = client.post("/api/compare", json=req_payload)
        assert res.status_code == 200
        data = res.json()
        run_a = data["run_a"]
        run_b = data["run_b"]

        # RL4T1D Basal-Bolus delivers insulin, whereas NoOp delivers 0
        assert sum(run_a["insulin"]) == 0.0
        assert sum(run_b["insulin"]) > 0.0

        # RL4T1D Basal-Bolus achieves much higher TIR and lower max BG
        assert run_b["metrics"]["tir_pct"] > run_a["metrics"]["tir_pct"]
        assert max(run_b["bg"]) < max(run_a["bg"])

    def test_simulate_rl4t1d_controllers(self):
        for ctrl_id in ["rl4t1d_basal_bolus", "rl4t1d_pid", "rl4t1d_neural"]:
            req = SimulateRequest(
                patient_name="adult#002",
                controller_id=ctrl_id,
                duration_hours=12,
                seed=42,
                meals=[{"label": "Meal", "time_minutes": 360, "carbs_g": 45.0}],
            )
            res = sim_service.run_simulation(req)
            assert len(res.bg) > 50
            assert sum(res.insulin) > 0.0
            assert res.metrics.mean_bg < 300.0

    def test_determinism_with_seed(self):
        req1 = SimulateRequest(patient_name="adolescent#002", seed=99, duration_hours=6)
        req2 = SimulateRequest(patient_name="adolescent#002", seed=99, duration_hours=6)
        req3 = SimulateRequest(patient_name="adolescent#002", seed=999, duration_hours=6)

        res1 = sim_service.run_simulation(req1)
        res2 = sim_service.run_simulation(req2)
        res3 = sim_service.run_simulation(req3)

        assert res1.cgm == res2.cgm, "Identical seeds must yield identical CGM traces"
        assert res1.cgm != res3.cgm, "Different seeds should yield different sensor noise"

    def test_noiseless_sensor_option(self):
        req1 = SimulateRequest(
            patient_name="child#001",
            duration_hours=6,
            sensor_noise=False,
            seed=1,
            meals=[],
        )
        req2 = SimulateRequest(
            patient_name="child#001",
            duration_hours=6,
            sensor_noise=False,
            seed=999,
            meals=[],
        )
        res1 = sim_service.run_simulation(req1)
        res2 = sim_service.run_simulation(req2)

        # 1. Without noise, varying random seed yields identical deterministic curves
        assert res1.cgm == res2.cgm

        # 2. CGM tracks true BG closely within discrete sampling hold lag (< 10 mg/dL)
        diffs = [abs(c - b) for c, b in zip(res1.cgm, res1.bg)]
        assert max(diffs) < 10.0, f"Max diff between CGM and BG without noise was {max(diffs)}"

    def test_compare_diets_endpoint(self):
        req_payload = {
            "patient_name": "adult#001",
            "controller_id": "rl4t1d_basal_bolus",
            "meals_a": [
                {"label": "Light Meal", "time_minutes": 360, "carbs_g": 30.0},
            ],
            "meals_b": [
                {"label": "Heavy Meal", "time_minutes": 360, "carbs_g": 120.0},
            ],
            "seed": 42,
            "duration_hours": 12,
        }
        res = client.post("/api/compare-diets", json=req_payload)
        assert res.status_code == 200
        data = res.json()
        assert "run_a" in data and "run_b" in data
        # Diet B has 4x carbs so max BG and total insulin in run_b must be higher
        assert max(data["run_b"]["bg"]) > max(data["run_a"]["bg"])
        assert sum(data["run_b"]["insulin"]) > sum(data["run_a"]["insulin"])

    def test_compare_patients_endpoint(self):
        req_payload = {
            "patient_a_name": "adult#001",
            "patient_b_name": "child#001",
            "controller_id": "rl4t1d_basal_bolus",
            "meals": [
                {"label": "Standard Lunch", "time_minutes": 360, "carbs_g": 50.0},
            ],
            "seed": 42,
            "duration_hours": 12,
        }
        res = client.post("/api/compare-patients", json=req_payload)
        assert res.status_code == 200
        data = res.json()
        assert "run_a" in data and "run_b" in data
        assert data["run_a"]["patient_info"]["simglucose_name"] == "adult#001"
        assert data["run_b"]["patient_info"]["simglucose_name"] == "child#001"
        assert len(data["run_a"]["bg"]) == len(data["run_b"]["bg"])


if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main(["-v", __file__]))

