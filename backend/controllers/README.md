# Pluggable Controller Architecture & Loaded Algorithms

This directory defines the modular controller interface for the Diabetes Awareness Booth wrapper and houses the algorithms adapted from [RL4H/RL4T1D](https://github.com/RL4H/RL4T1D).

---

## Active Registered Controllers

| Controller ID | Name | Category | Description |
| :--- | :--- | :--- | :--- |
| `placeholder_noop` | Zero-Insulin Baseline | Placeholder | Delivers 0.0 U insulin. Essential for educational booth demos showing what uncontrolled T1D looks like. |
| `rl4t1d_basal_bolus` | RL4T1D Clinical Basal-Bolus | Clinical | Standard clinical regimen adapted from RL4T1D: steady-state basal rate, meal bolusing with patient ICR, correction bolusing with ISF, 3-hour cooldown, and carb estimation noise. |
| `rl4t1d_pid` | RL4T1D PID Closed-Loop | Closed-Loop | Continuous feedback Proportional-Integral-Derivative controller with anti-windup clamping and safe pump limit bounding. |
| `rl4t1d_neural` | RL4T1D Neural / PPO Actor-Critic | Reinforcement Learning | Deep RL policy architecture from RL4T1D: LSTM sequence encoder over CGM, CHO, and insulin history + non-linear control space pump mapping (exponential, quadratic, normal). |

---

## Performance Comparison (24-Hour Benchmark on Adult#001)

| Controller | TIR ($70\text{--}180$) | TAR ($> 180$) | TBR ($< 70$) | Mean BG | Max BG | Total Insulin | Runtime |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Zero-Insulin No-Op** | 23.5% | 76.5% | 0.0% | 338.9 mg/dL | 533.1 mg/dL | 0.00 U | 0.63s |
| **Clinical Basal-Bolus** | **81.0%** | 19.0% | 0.0% | 155.3 mg/dL | 209.5 mg/dL | 9.05 U | 0.71s |
| **PID Closed-Loop** | 79.2% | 20.8% | 0.0% | 146.4 mg/dL | 199.1 mg/dL | 9.99 U | 0.56s |
| **Neural / PPO RL** | 62.3% | 37.7% | 0.0% | 167.6 mg/dL | 224.3 mg/dL | 8.39 U | 0.98s |

---

## Adding Additional Controllers

When you are ready to test another custom dosing algorithm, follow these 3 steps:

### Step 1: Create a Controller File
Create a new file in `backend/controllers/` (e.g., `my_algorithm.py`) and inherit from `BaseDemoController`:

```python
from simglucose.controller.base import Action
from backend.controllers.base import BaseDemoController

class MyCustomController(BaseDemoController):
    id = "my_custom_algo"
    display_name = "My Custom Controller"
    category = "Experimental"
    description = "Description of dosing methodology."
    configurable_params = {
        "target_bg": 110.0,
        "tuning_factor": 1.0,
    }

    def reset(self, patient_meta: dict, params: dict) -> None:
        self.patient_meta = patient_meta
        self.params = params
        self.target_bg = params.get("target_bg", 110.0)

    def policy(self, observation, reward: float = 0.0, done: bool = False, **info) -> Action:
        cgm_val = observation.CGM
        # Calculate your basal (U/min) and bolus (U/min)
        basal = 0.02
        bolus = 0.0
        return Action(basal=basal, bolus=bolus)
```

### Step 2: Register in `registry.py`
Import your class in `backend/controllers/registry.py` and register it:

```python
from backend.controllers.my_algorithm import MyCustomController

# Inside ControllerRegistry.__init__:
self.register(MyCustomController)
```

### Step 3: Verify in API and Frontend
Restart the booth backend:
- `GET /api/metadata` will immediately list your new controller under `controllers`.
- `POST /api/simulate` and `POST /api/compare` accept `controller_id: "my_custom_algo"`.
- The frontend controller dropdown in Simulate, Compare, and Parameters views will automatically populate with your algorithm.
