from collections import deque
import random
from typing import Any, Dict
from simglucose.controller.base import Action
from backend.controllers.base import BaseDemoController


class RL4T1DBasalBolusController(BaseDemoController):
    """
    RL4T1D Clinical Basal-Bolus Treatment Controller.

    Directly adapted from RL4H/RL4T1D clinical benchmark (clinical/basal_bolus_treatment.py
    and clinical/carb_counting.py).

    Calculates:
      1. Calibrated steady-state basal rate (U/min)
      2. Meal bolus: CHO / ICR (using patient's CR)
      3. Correction bolus: (CGM - target) / ISF when CGM > cf_target with a 3-hour cooldown
      4. Optional UVA/Padova carbohydrate estimation error models (real, linear, quadratic, rand)
    """

    id = "rl4t1d_basal_bolus"
    display_name = "RL4T1D Clinical Basal-Bolus (HCL)"
    category = "Clinical"
    description = (
        "Standard-of-care clinical basal-bolus regimen from RL4T1D. "
        "Calculates steady-state basal infusion, meal carb bolusing, and correction bolusing with cooldown."
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
            "help": "Baseline glycemic target for basal and bolus calculations.",
        },
        "glucose_cf_target": {
            "label": "Correction Threshold",
            "unit": "mg/dL",
            "default": 150.0,
            "type": "number",
            "min": 100,
            "max": 250,
            "step": 5,
            "help": "CGM threshold triggering a high blood glucose correction bolus.",
        },
        "use_bolus": {
            "label": "Meal Bolusing (CHO/ICR)",
            "default": True,
            "type": "boolean",
            "help": "Enable automatic meal bolusing based on estimated carbs and ICR.",
        },
        "use_cf": {
            "label": "Correction Bolusing (ISF)",
            "default": True,
            "type": "boolean",
            "help": "Enable high BG correction boluses based on ISF.",
        },
        "carb_estimation_method": {
            "label": "Carb Estimation Model",
            "default": "quadratic",
            "type": "select",
            "options": ["real", "linear", "quadratic", "rand"],
            "help": "Model for patient carb estimation error (from RL4T1D).",
        },
    }

    def __init__(self):
        super().__init__()
        self.past_meal_memory = deque(maxlen=36)  # 3 hours at 5-min steps (36 * 5 = 180 min)
        self.basal_rate = 0.0
        self.CR = 10.0
        self.CF = 30.0
        self.target_glucose = 120.0
        self.glucose_cf_target = 150.0
        self.use_bolus = True
        self.use_cf = True
        self.carb_estimation_method = "quadratic"
        self.sample_time = 5.0
        self.BW = 70.0

    def reset(self, patient_meta: Dict[str, Any], params: Dict[str, Any]) -> None:
        self.patient_meta = patient_meta
        self.params = params

        # Patient clinical parameters
        tdi = float(patient_meta.get("tdi", 40.0))
        self.BW = float(patient_meta.get("body_weight_kg", 70.0))
        self.CR = float(patient_meta.get("icr", 10.0))
        self.CF = float(patient_meta.get("isf", 30.0))

        # Basal infusion rate (U/min): 48% of TDI spread over 1440 minutes
        self.basal_rate = (tdi * 0.48) / (24.0 * 60.0)

        def _val(k, default):
            v = params.get(k, default) if params else default
            if isinstance(v, dict):
                return v.get("default", default)
            return v if v is not None else default

        # Configurable hyper-parameters
        self.target_glucose = float(_val("target_glucose", 120.0))
        self.glucose_cf_target = float(_val("glucose_cf_target", 150.0))
        self.use_bolus = bool(_val("use_bolus", True))
        self.use_cf = bool(_val("use_cf", True))
        self.carb_estimation_method = str(_val("carb_estimation_method", "quadratic"))

        # Clear 3-hour meal cooldown memory (36 samples of 5-min ticks)
        self.past_meal_memory = deque(36 * [0.0], maxlen=36)

    def _estimate_carbs(self, cho_real: float, hour: int) -> float:
        """UVA/Padova meal carb estimation error model from RL4T1D."""
        if self.carb_estimation_method == "real" or cho_real <= 0:
            return cho_real

        # Meal classification by hour of day
        snack, lunch, dinner, breakfast = 0, 0, 0, 0
        if 6 <= hour <= 9:
            breakfast = 1
        elif 12 <= hour <= 15:
            lunch = 1
        elif 18 <= hour <= 21:
            dinner = 1
        else:
            snack = 1

        error = 0.0
        if self.carb_estimation_method == "linear":
            error = (
                9.22
                - 0.34 * cho_real
                + (0.09 * self.BW)
                + (3.11 * lunch)
                + (0.68 * dinner)
                - (7.05 * snack)
            )
        elif self.carb_estimation_method == "quadratic":
            error = (
                3.56
                - 0.07 * cho_real
                - 0.0008 * cho_real * cho_real
                + (6.77 * lunch)
                + (18.01 * dinner)
                - (0.49 * snack)
                - (0.08 * cho_real * lunch)
                - (0.25 * cho_real * dinner)
                - (0.06 * cho_real * snack)
            )
        elif self.carb_estimation_method == "rand":
            r = random.uniform(-0.20, 0.20)
            error = cho_real * r

        return max(0.0, cho_real + error)

    def policy(self, observation: Any, reward: float = 0.0, done: bool = False, **info) -> Action:
        cgm = float(observation.CGM) if observation else 140.0
        sample_time = float(info.get("sample_time", 5.0))
        self.sample_time = sample_time

        # Total carbs consumed in this step (g)
        meal_rate = float(info.get("meal", 0.0))
        meal_g = meal_rate * sample_time
        if meal_g == 0.0 and observation and hasattr(observation, "CHO"):
            meal_g = float(observation.CHO)

        hour = 12
        if "time" in info and hasattr(info["time"], "hour"):
            hour = info["time"].hour

        bolus_units = 0.0
        cooldown_active = sum(self.past_meal_memory) > 0.0

        if self.use_bolus and meal_g > 0.0:
            estimated_carbs = self._estimate_carbs(meal_g, hour)
            # Meal carb bolus (U)
            bolus_units += estimated_carbs / self.CR

            # High blood sugar correction bolus (if above target and outside cooldown)
            if self.use_cf and cgm > self.glucose_cf_target and not cooldown_active:
                correction = (cgm - self.target_glucose) / self.CF
                bolus_units += max(0.0, correction)

        self.past_meal_memory.append(meal_g)

        # Convert bolus units to delivery rate over sample_time window (U/min)
        bolus_rate = bolus_units / sample_time

        return Action(basal=self.basal_rate, bolus=bolus_rate)
