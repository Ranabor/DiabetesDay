from typing import Any, Dict, List, Type
from backend.controllers.base import BaseDemoController
from backend.controllers.placeholder import NoOpPlaceholderController
from backend.controllers.rl4t1d_basal_bolus import RL4T1DBasalBolusController
from backend.controllers.rl4t1d_pid import RL4T1DPIDController
from backend.controllers.rl4t1d_neural import RL4T1DNeuralController


class ControllerRegistry:
    """Registry maintaining available controllers for the booth demo wrapper."""

    def __init__(self):
        self._controllers: Dict[str, Type[BaseDemoController]] = {}
        # Pre-register available controllers
        self.register(NoOpPlaceholderController)
        self.register(RL4T1DBasalBolusController)
        self.register(RL4T1DPIDController)
        self.register(RL4T1DNeuralController)

    def register(self, controller_cls: Type[BaseDemoController]) -> None:
        """Register a controller class."""
        if not issubclass(controller_cls, BaseDemoController):
            raise TypeError(f"Class {controller_cls} must subclass BaseDemoController.")
        self._controllers[controller_cls.id] = controller_cls

    def get(self, controller_id: str) -> Type[BaseDemoController]:
        """Retrieve a registered controller class by ID."""
        if controller_id not in self._controllers:
            raise KeyError(
                f"Controller '{controller_id}' not found in registry. "
                f"Available controllers: {list(self._controllers.keys())}"
            )
        return self._controllers[controller_id]

    def list_all(self) -> List[Dict[str, Any]]:
        """Return metadata for all registered controllers."""
        result = []
        for controller_cls in self._controllers.values():
            instance = controller_cls()
            result.append(instance.get_info())
        return result


# Global singleton registry
controller_registry = ControllerRegistry()
