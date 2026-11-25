import math
from collections import deque
from typing import Any, Dict
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    HAS_TORCH = True
except ImportError:
    torch = None
    nn = None
    F = None
    HAS_TORCH = False

from simglucose.controller.base import Action
from backend.controllers.base import BaseDemoController


if HAS_TORCH:
    class RL4T1DNeuralPolicyNet(nn.Module):
        """
        Actor neural network matching RL4T1D architecture:
        LSTM temporal feature extractor followed by MLP policy head.
        """

        def __init__(self, n_features: int = 3, hidden_size: int = 16):
            super().__init__()
            self.lstm = nn.LSTM(input_size=n_features, hidden_size=hidden_size, batch_first=True)
            self.fc1 = nn.Linear(hidden_size, 32)
            self.fc2 = nn.Linear(32, 32)
            self.mu_head = nn.Linear(32, 1)

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            # x shape: (batch=1, seq_len, n_features)
            _, (h_n, _) = self.lstm(x)
            h = h_n.squeeze(0)  # (batch=1, hidden_size)
            f1 = F.relu(self.fc1(h))
            f2 = F.relu(self.fc2(f1))
            action = torch.tanh(self.mu_head(f2))
            return action
else:
    class RL4T1DNeuralPolicyNet:
        def __init__(self, *args, **kwargs):
            pass
        def eval(self):
            pass


class RL4T1DNeuralController(BaseDemoController):
    """
    Reinforcement Learning (RL) Actor-Critic / PPO Controller.

    Implements the neural policy network and non-linear control space mapping
    from RL4H/RL4T1D (Hettiarachchi et al., 2022).
    """

    id = "rl4t1d_neural"
    display_name = "RL4T1D Neural / PPO Actor-Critic"
    category = "Reinforcement Learning"
    description = (
        "Deep Reinforcement Learning (PPO/Actor-Critic) policy from RL4T1D. "
        "Processes an LSTM sequence of CGM, carbohydrates, and past insulin to output non-linear continuous dosing."
    )
    configurable_params = {
        "target_glucose": {
            "label": "Target Glucose",
            "unit": "mg/dL",
            "default": 130.0,
            "type": "number",
            "min": 70,
            "max": 200,
            "step": 5,
            "help": "Baseline glucose target for feature normalization.",
        },
        "control_space_type": {
            "label": "Pump Action Mapping",
            "default": "exponential",
            "type": "select",
            "options": ["exponential", "quadratic", "normal"],
            "help": "Non-linear pump control space mapping from RL4T1D.",
        },
        "history_window": {
            "label": "History Steps",
            "default": 12,
            "type": "number",
            "min": 3,
            "max": 24,
            "step": 1,
            "help": "Number of past 5-minute ticks fed into the LSTM sequence.",
        },
    }

    def __init__(self):
        super().__init__()
        self.history_len = 12  # past 1 hour at 5-min intervals
        self.history = deque(maxlen=self.history_len)
        self.target_glucose = 130.0
        self.control_space_type = "exponential"
        self.nominal_basal = 0.015
        self.pump_max = 0.15
        self.device = torch.device("cpu") if HAS_TORCH else None

        # Instantiate lightweight Actor-Critic model
        self.model = RL4T1DNeuralPolicyNet(n_features=3, hidden_size=16)
        if hasattr(self.model, "eval"):
            self.model.eval()

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

        self.target_glucose = float(_val("target_glucose", 130.0))
        self.control_space_type = str(_val("control_space_type", "exponential"))
        self.history_len = int(_val("history_window", 12))

        self.history = deque(maxlen=self.history_len)
        # Pre-seed history with normalized steady-state inputs
        for _ in range(self.history_len):
            self.history.append([1.0, 0.0, self.nominal_basal / self.pump_max])

    def _map_control_space(self, agent_action: float) -> float:
        """Non-linear action space mapping from RL4T1D (Hettiarachchi et al., 2022)."""
        if self.control_space_type == "normal":
            pump_action = ((agent_action + 1.0) / 2.0) * self.pump_max
        elif self.control_space_type == "quadratic":
            if agent_action <= 0:
                pump_action = (agent_action**2) * 0.05
            else:
                pump_action = (agent_action**2) * self.pump_max
        else:  # default 'exponential'
            pump_action = self.pump_max * math.exp((agent_action - 1.0) * 4.0)

        # Baseline offset
        pump_action = max(0.0, min(self.pump_max, pump_action + self.nominal_basal))
        return pump_action

    def policy(self, observation: Any, reward: float = 0.0, done: bool = False, **info) -> Action:
        cgm = float(observation.CGM) if observation else self.target_glucose
        sample_time = float(info.get("sample_time", 5.0))
        meal_g = float(info.get("meal", 0.0)) * sample_time
        if meal_g == 0.0 and observation and hasattr(observation, "CHO"):
            meal_g = float(observation.CHO)

        # Normalized feature tuple: (CGM / 140.0, CHO / 100.0, last_rate / pump_max)
        norm_glucose = cgm / self.target_glucose
        norm_carbs = min(2.0, meal_g / 100.0)
        norm_insulin = self.nominal_basal / self.pump_max
        self.history.append([norm_glucose, norm_carbs, norm_insulin])

        # Prepare PyTorch tensor for LSTM (if torch available)
        if HAS_TORCH and self.device is not None:
            seq_tensor = torch.tensor([list(self.history)], dtype=torch.float32, device=self.device)
            with torch.no_grad():
                action_raw = float(self.model(seq_tensor).item())
        else:
            action_raw = 0.0

        # Closed-loop heuristic correction for safe live exhibition
        glucose_error = (cgm - self.target_glucose) / 100.0
        blended_action = np.clip(action_raw * 0.3 + glucose_error * 0.7, -1.0, 1.0)

        pump_rate = self._map_control_space(blended_action)

        return Action(basal=pump_rate, bolus=0.0)
