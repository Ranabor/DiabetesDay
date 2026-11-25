from abc import ABC, abstractmethod
from typing import Any, Dict
from simglucose.controller.base import Action


class BaseDemoController(ABC):
    """
    Abstract Base Class for all pluggable simglucose controllers in the booth demo.

    Subclasses must define metadata attributes and implement reset() and policy().
    """

    id: str = "base"
    display_name: str = "Base Controller"
    category: str = "General"
    description: str = "Base controller interface"
    configurable_params: Dict[str, Any] = {}

    def __init__(self):
        self.patient_meta: Dict[str, Any] = {}
        self.params: Dict[str, Any] = {}

    @abstractmethod
    def reset(self, patient_meta: Dict[str, Any], params: Dict[str, Any]) -> None:
        """
        Called before each simulation episode starts.

        Parameters
        ----------
        patient_meta: Dict[str, Any]
            Clinical metadata for the virtual subject (age, body_weight_kg, tdi, icr, isf).
        params: Dict[str, Any]
            User-configured controller hyper-parameters passed from UI or API.
        """
        pass

    @abstractmethod
    def policy(self, observation: Any, reward: float = 0.0, done: bool = False, **info) -> Action:
        """
        Calculate insulin action given current CGM observation and state info.

        Returns
        -------
        Action: simglucose.controller.base.Action
            Action(basal=basal_u_min, bolus=bolus_u)
        """
        pass

    def get_info(self) -> Dict[str, Any]:
        """Return metadata dict suitable for API serialization."""
        return {
            "id": self.id,
            "display_name": self.display_name,
            "category": self.category,
            "description": self.description,
            "configurable_params": self.configurable_params,
        }
