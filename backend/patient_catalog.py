import os
import re
from typing import Any, Dict, List, Optional
import pandas as pd
import simglucose

PARAMS_DIR = os.path.join(os.path.dirname(simglucose.__file__), "params")
VPATIENT_FILE = os.path.join(PARAMS_DIR, "vpatient_params.csv")
QUEST_FILE = os.path.join(PARAMS_DIR, "Quest.csv")


class FastPatientParams:
    """
    Lightweight wrapper around patient pandas Series providing direct attribute
    access and iloc, avoiding pandas __getattr__ overhead inside ODE integrator.
    """
    def __init__(self, series: pd.Series):
        self._series = series
        self.__dict__.update(series.to_dict())
        self.iloc = series.iloc
        self.Name = series.Name

    def __getattr__(self, item: str) -> Any:
        return getattr(self._series, item)


class PatientCatalog:
    """Loads and provides access to all 30 UVA/Padova virtual patients in simglucose."""

    def __init__(self):
        self._df = self._load_data()
        self._catalog: Dict[str, Dict[str, Any]] = {}
        self._fast_params: Dict[str, FastPatientParams] = {}
        self._build_catalog()

    def _load_data(self) -> pd.DataFrame:
        vp = pd.read_csv(VPATIENT_FILE)
        quest = pd.read_csv(QUEST_FILE)
        merged = pd.merge(vp, quest[["Name", "Age", "TDI", "CR", "CF"]], on="Name")
        return merged

    def _build_catalog(self):
        for _, row in self._df.iterrows():
            name = str(row["Name"])
            cohort_match = re.match(r"^([a-zA-Z]+)#(\d+)$", name)
            if cohort_match:
                cohort_raw = cohort_match.group(1).capitalize()
                # 0-indexed subject index from 1-indexed simglucose name
                subject_idx = int(cohort_match.group(2)) - 1
            else:
                cohort_raw = "Adult"
                subject_idx = 0

            profile = {
                "cohort": cohort_raw,
                "subject_index": subject_idx,
                "simglucose_name": name,
                "age": float(row["Age"]),
                "body_weight_kg": round(float(row["BW"]), 2),
                "tdi": round(float(row["TDI"]), 2),
                "icr": round(float(row["CR"]), 2),
                "isf": round(float(row["CF"]), 2),
            }
            self._catalog[name] = profile
            self._fast_params[name] = FastPatientParams(row)

    def get_all_patients(self) -> List[Dict[str, Any]]:
        """Return all 30 patients sorted by cohort (Adult, Adolescent, Child) and subject index."""
        cohort_order = {"Adult": 0, "Adolescent": 1, "Child": 2}
        patients = list(self._catalog.values())
        patients.sort(key=lambda p: (cohort_order.get(p["cohort"], 9), p["subject_index"]))
        return patients

    def get_patient(self, name: str) -> Optional[Dict[str, Any]]:
        return self._catalog.get(name)

    def get_fast_params(self, name: str) -> FastPatientParams:
        if name not in self._fast_params:
            raise KeyError(f"Patient '{name}' not found in virtual patient catalog.")
        return self._fast_params[name]

    def get_raw_series(self, name: str) -> pd.Series:
        if name not in self._fast_params:
            raise KeyError(f"Patient '{name}' not found in virtual patient catalog.")
        return self._fast_params[name]._series


# Singleton instance for app-wide use
patient_catalog = PatientCatalog()
