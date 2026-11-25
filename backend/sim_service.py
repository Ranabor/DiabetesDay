import datetime
import itertools
import math
import time
from typing import Any, Dict, List, Tuple
import numpy as np
from simglucose.actuator.pump import InsulinPump
from simglucose.analysis.risk import risk_index
from simglucose.patient.t1dpatient import T1DPatient
from simglucose.sensor.cgm import CGMSensor
from simglucose.simulation.env import Observation, Step, T1DSimEnv
from simglucose.simulation.scenario import CustomScenario

from backend.controllers.registry import controller_registry
from backend.patient_catalog import patient_catalog
from backend.schemas import (
    ClinicalMetrics,
    CompareRequest,
    CompareResponse,
    CompareDietsRequest,
    ComparePatientsRequest,
    PatientInfo,
    SimulateRequest,
    SimulateResponse,
)


class NoiselessCGMSensor(CGMSensor):
    """Subclass of CGMSensor that produces 0.0 noise for clean, noiseless exhibition curves."""

    def reset(self):
        super().reset()
        self._noise_generator = itertools.repeat(0.0)
        self._last_CGM = 0


class SimulationService:
    """Core simulation engine wrapping UVA/Padova simglucose environment."""

    AVAILABLE_SENSORS = ["GuardianRT", "Dexcom", "Navigator"]
    AVAILABLE_PUMPS = ["Insulet", "Cozmo"]

    def _build_sensor(self, req: SimulateRequest) -> CGMSensor:
        sensor_cls = CGMSensor if req.sensor_noise else NoiselessCGMSensor
        return sensor_cls.withName(req.sensor, seed=req.seed)

    def _build_scenario(
        self, req: SimulateRequest, start_dt: datetime.datetime
    ) -> CustomScenario:
        scenario_events: List[Tuple[datetime.datetime, float]] = []
        days = math.ceil(req.duration_hours / 24.0)

        for day in range(days):
            day_offset_minutes = day * 1440
            for meal in req.meals:
                # time_minutes is relative to midnight (0-1439)
                # simulation starts at start_time_hour * 60 relative to midnight
                delta_from_sim_start = (
                    meal.time_minutes - (req.start_time_hour * 60) + day_offset_minutes
                )
                if delta_from_sim_start >= 0 and delta_from_sim_start < (req.duration_hours * 60):
                    meal_dt = start_dt + datetime.timedelta(minutes=delta_from_sim_start)
                    scenario_events.append((meal_dt, float(meal.carbs_g)))

        # Sort chronologically
        scenario_events.sort(key=lambda x: x[0])
        return CustomScenario(start_time=start_dt, scenario=scenario_events)

    def _build_patient(self, req: SimulateRequest) -> T1DPatient:
        fast_params = patient_catalog.get_fast_params(req.patient_name)

        if req.initial_bg is not None:
            # Scale steady-state glucose states x4 (plasma), x5 (tissue), x13 (subcutaneous)
            default_bg = fast_params.x0_13 / fast_params.Vg
            ratio = req.initial_bg / default_bg
            init_state = np.copy(fast_params._series.iloc[2:15].values)
            init_state[3] *= ratio
            init_state[4] *= ratio
            init_state[12] *= ratio
            return T1DPatient(fast_params, init_state=init_state)
        else:
            return T1DPatient(fast_params)

    def run_simulation(self, req: SimulateRequest) -> SimulateResponse:
        t_start = time.time()
        start_dt = datetime.datetime(2026, 1, 1, req.start_time_hour, 0)

        # 1. Instantiate patient, sensor, pump, scenario
        patient = self._build_patient(req)
        sensor = self._build_sensor(req)
        pump = InsulinPump.withName(req.pump)
        scenario = self._build_scenario(req, start_dt)

        # 2. Setup environment
        env = T1DSimEnv(patient, sensor, pump, scenario)
        current_step = env.reset()

        # 3. Setup controller
        controller_cls = controller_registry.get(req.controller_id)
        controller = controller_cls()
        patient_data = patient_catalog.get_patient(req.patient_name)
        if patient_data is None:
            raise ValueError(f"Patient {req.patient_name} not found.")

        controller.reset(patient_meta=patient_data, params=req.controller_params)

        # 4. Simulation loop
        sample_time = env.sample_time
        total_steps = int((req.duration_hours * 60) / sample_time)

        for _ in range(total_steps):
            action = controller.policy(
                observation=current_step.observation,
                reward=current_step.reward,
                done=current_step.done,
                **current_step.info,
            )
            current_step = env.step(action)
            if current_step.done:
                break

        # 5. Extract traces (aligned lengths)
        timestamps = [t.strftime("%H:%M") for t in env.time_hist]
        minutes_elapsed = [int((t - start_dt).total_seconds() / 60) for t in env.time_hist]
        bg = [round(float(v), 2) for v in env.BG_hist]
        cgm = [round(float(v), 2) for v in env.CGM_hist]
        # Pad t=0 for insulin and cho to match timestamps length
        insulin = [0.0] + [round(float(v), 4) for v in env.insulin_hist]
        cho = [0.0] + [round(float(v), 2) for v in env.CHO_hist]

        # 6. Calculate clinical metrics
        bg_arr = np.array(env.BG_hist)
        n = len(bg_arr)
        tir = float(np.sum((bg_arr >= 70.0) & (bg_arr <= 180.0)) / n * 100.0)
        tar = float(np.sum(bg_arr > 180.0) / n * 100.0)
        tar_l1 = float(np.sum((bg_arr > 180.0) & (bg_arr <= 250.0)) / n * 100.0)
        tar_l2 = float(np.sum(bg_arr > 250.0) / n * 100.0)
        tbr = float(np.sum(bg_arr < 70.0) / n * 100.0)
        tbr_l1 = float(np.sum((bg_arr >= 54.0) & (bg_arr < 70.0)) / n * 100.0)
        tbr_l2 = float(np.sum(bg_arr < 54.0) / n * 100.0)
        lbgi, hbgi, ri = risk_index(bg_arr, n)
        mean_bg = float(np.mean(bg_arr))

        metrics = ClinicalMetrics(
            tir_pct=round(tir, 1),
            tar_pct=round(tar, 1),
            tar_l1_pct=round(tar_l1, 1),
            tar_l2_pct=round(tar_l2, 1),
            tbr_pct=round(tbr, 1),
            tbr_l1_pct=round(tbr_l1, 1),
            tbr_l2_pct=round(tbr_l2, 1),
            risk_index=round(float(ri), 1),
            lbgi=round(float(lbgi), 1),
            hbgi=round(float(hbgi), 1),
            mean_bg=round(mean_bg, 1),
        )

        patient_info = PatientInfo(**patient_data)
        elapsed_sec = round(time.time() - t_start, 3)

        return SimulateResponse(
            timestamps=timestamps,
            minutes_elapsed=minutes_elapsed,
            bg=bg,
            cgm=cgm,
            insulin=insulin,
            cho=cho,
            metrics=metrics,
            patient_info=patient_info,
            meta={
                "simulation_time_seconds": elapsed_sec,
                "sensor": req.sensor,
                "pump": req.pump,
                "seed": req.seed,
                "steps_completed": len(env.time_hist),
                "controller_id": req.controller_id,
            },
        )

    def run_comparison(self, req: CompareRequest) -> CompareResponse:
        """Run two controllers under identical subject, meals, and stochastic noise conditions."""
        req_a = SimulateRequest(
            patient_name=req.patient_name,
            controller_id=req.controller_a_id,
            controller_params=req.controller_a_params,
            meals=req.meals,
            sensor=req.sensor,
            pump=req.pump,
            seed=req.seed,
            duration_hours=req.duration_hours,
            start_time_hour=req.start_time_hour,
            initial_bg=req.initial_bg,
            sensor_noise=req.sensor_noise,
        )
        req_b = SimulateRequest(
            patient_name=req.patient_name,
            controller_id=req.controller_b_id,
            controller_params=req.controller_b_params,
            meals=req.meals,
            sensor=req.sensor,
            pump=req.pump,
            seed=req.seed,
            duration_hours=req.duration_hours,
            start_time_hour=req.start_time_hour,
            initial_bg=req.initial_bg,
            sensor_noise=req.sensor_noise,
        )

        run_a = self.run_simulation(req_a)
        run_b = self.run_simulation(req_b)

        return CompareResponse(run_a=run_a, run_b=run_b)

    def run_diet_comparison(self, req: CompareDietsRequest) -> CompareResponse:
        """Run two different diets on the exact same patient and controller."""
        req_a = SimulateRequest(
            patient_name=req.patient_name,
            controller_id=req.controller_id,
            controller_params=req.controller_params,
            meals=req.meals_a,
            sensor=req.sensor,
            pump=req.pump,
            seed=req.seed,
            duration_hours=req.duration_hours,
            start_time_hour=req.start_time_hour,
            initial_bg=req.initial_bg,
            sensor_noise=req.sensor_noise,
        )
        req_b = SimulateRequest(
            patient_name=req.patient_name,
            controller_id=req.controller_id,
            controller_params=req.controller_params,
            meals=req.meals_b,
            sensor=req.sensor,
            pump=req.pump,
            seed=req.seed,
            duration_hours=req.duration_hours,
            start_time_hour=req.start_time_hour,
            initial_bg=req.initial_bg,
            sensor_noise=req.sensor_noise,
        )
        run_a = self.run_simulation(req_a)
        run_b = self.run_simulation(req_b)
        return CompareResponse(run_a=run_a, run_b=run_b)

    def run_patient_comparison(self, req: ComparePatientsRequest) -> CompareResponse:
        """Run two different patients under the exact same diet, controller, and environment."""
        req_a = SimulateRequest(
            patient_name=req.patient_a_name,
            controller_id=req.controller_id,
            controller_params=req.controller_params,
            meals=req.meals,
            sensor=req.sensor,
            pump=req.pump,
            seed=req.seed,
            duration_hours=req.duration_hours,
            start_time_hour=req.start_time_hour,
            initial_bg=req.initial_bg,
            sensor_noise=req.sensor_noise,
        )
        req_b = SimulateRequest(
            patient_name=req.patient_b_name,
            controller_id=req.controller_id,
            controller_params=req.controller_params,
            meals=req.meals,
            sensor=req.sensor,
            pump=req.pump,
            seed=req.seed,
            duration_hours=req.duration_hours,
            start_time_hour=req.start_time_hour,
            initial_bg=req.initial_bg,
            sensor_noise=req.sensor_noise,
        )
        run_a = self.run_simulation(req_a)
        run_b = self.run_simulation(req_b)
        return CompareResponse(run_a=run_a, run_b=run_b)


sim_service = SimulationService()
