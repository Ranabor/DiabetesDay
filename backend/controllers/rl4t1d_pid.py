from typing import Any, Dict
from simglucose.controller.base import Action
from backend.controllers.base import BaseDemoController


class RL4T1DPIDController(BaseDemoController):
    """
    Proportional-Integral-Derivative (PID) Closed-Loop Controller.

    Continuously modulates basal insulin delivery to maintain blood glucose at target.
    Includes anti-windup clamping to prevent insulin overdose during prolonged post-meal spikes.
    """

    id = "rl4t1d_pid"
    display_name = "PID Closed-Loop Controller"
    category = "Closed-Loop"
    description = (
        "Classic Proportional-Integral-Derivative closed-loop algorithm. "
        "Continuously modulates basal delivery based on real-time glucose error, accumulation, and rate-of-change."
    )
    configurable_params = {
        "target_glucose": {
            "label": "Target Glucose",
            "unit": "mg/dL",
            "default": 120.0,
            "type": "number",
            "min": 70,
            "max": 200,
            "step": 5,
            "help": "Target blood sugar setpoint for closed-loop PID control.",
        },
        "kp": {
            "label": "Proportional Gain (Kp)",
            "default": 0.0005,
            "type": "number",
            "min": 0.0,
            "max": 0.05,
            "step": 0.0001,
            "help": "Sensitivity to current difference between CGM and target.",
        },
        "ki": {
            "label": "Integral Gain (Ki)",
            "default": 0.00002,
            "type": "number",
            "min": 0.0,
            "max": 0.002,
            "step": 0.00001,
            "help": "Sensitivity to sustained accumulated glycemic errors over time.",
        },
        "kd": {
            "label": "Derivative Gain (Kd)",
            "default": 0.003,
            "type": "number",
            "min": 0.0,
            "max": 0.5,
            "step": 0.001,
            "help": "Sensitivity to the rate of change (derivative) of glucose.",
        },
        "max_insulin_rate": {
            "label": "Max Infusion Rate",
            "unit": "U/min",
            "default": 0.15,
            "type": "number",
            "min": 0.01,
            "max": 0.5,
            "step": 0.01,
            "help": "Safety ceiling for maximum pump delivery rate.",
        },
    }

    def __init__(self):
        super().__init__()
        self.target_glucose = 120.0
        self.kp = 0.0005
        self.ki = 0.00002
        self.kd = 0.003
        self.nominal_basal = 0.015
        self.integral_error = 0.0
        self.previous_error = 0.0
        self.max_insulin_rate = 0.15

    def reset(self, patient_meta: Dict[str, Any], params: Dict[str, Any]) -> None:
        self.patient_meta = patient_meta
        self.params = params

        tdi = float(patient_meta.get("tdi", 40.0))
        self.nominal_basal = (tdi * 0.48) / (24.0 * 60.0)

        def _val(k, default):
            v = params.get(k, default) if params else default
            if isinstance(v, dict):
                return v.get("default", default)
            return v if v is not None else default

        self.target_glucose = float(_val("target_glucose", 120.0))
        self.kp = float(_val("kp", 0.0005))
        self.ki = float(_val("ki", 0.00002))
        self.kd = float(_val("kd", 0.003))
        self.max_insulin_rate = float(_val("max_insulin_rate", 0.15))

        self.integral_error = 0.0
        self.previous_error = 0.0

    def policy(self, observation: Any, reward: float = 0.0, done: bool = False, **info) -> Action:
        cgm = float(observation.CGM) if observation else self.target_glucose
        sample_time = float(info.get("sample_time", 5.0))

        # Error: positive when hyperglycemic, negative when hypoglycemic
        error = cgm - self.target_glucose

        # Proportional term
        p_term = self.kp * error

        # Integral term with anti-windup clamping
        self.integral_error += error * sample_time
        self.integral_error = max(-500.0, min(500.0, self.integral_error))
        i_term = self.ki * self.integral_error

        # Derivative term (rate of change)
        derivative = (error - self.previous_error) / sample_time
        d_term = self.kd * derivative
        self.previous_error = error

        # Total basal rate (U/min)
        total_rate = self.nominal_basal + p_term + i_term + d_term

        # Safety clamp: never infuse negative insulin; clamp to safe pump max
        total_rate = max(0.0, min(self.max_insulin_rate, total_rate))

        return Action(basal=total_rate, bolus=0.0)
