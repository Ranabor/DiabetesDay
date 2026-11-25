from typing import Any, Dict
from simglucose.controller.base import Action
from backend.controllers.base import BaseDemoController


class NoOpPlaceholderController(BaseDemoController):
    """
    No-Op Baseline Controller.

    Always delivers 0.0 U/min basal and 0.0 U bolus.
    Used strictly for end-to-end UI, API, and pipeline verification without
    any active control logic.
    """

    id: str = "placeholder_noop"
    display_name: str = "No-Op Baseline (Zero Action)"
    category: str = "Placeholder"
    description: str = (
        "Zero-insulin baseline delivering 0.0 basal and 0.0 bolus. "
        "Demonstrates unmitigated physiological glucose response to meals."
    )
    configurable_params: Dict[str, Any] = {}

    def reset(self, patient_meta: Dict[str, Any], params: Dict[str, Any]) -> None:
        self.patient_meta = patient_meta
        self.params = params

    def policy(self, observation: Any, reward: float, done: bool, **info) -> Action:
        # Zero insulin action
        return Action(basal=0.0, bolus=0.0)
