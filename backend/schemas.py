from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MealItem(BaseModel):
    label: str = Field(default="Meal", description="Human-readable meal label (e.g. Breakfast)")
    time_minutes: int = Field(default=420, description="Time in minutes from midnight (0-1439)")
    carbs_g: float = Field(default=45.0, ge=0.0, le=300.0, description="Carbohydrates in grams")


def default_meals() -> List[MealItem]:
    return [
        MealItem(label="Breakfast", time_minutes=420, carbs_g=45.0),   # 07:00
        MealItem(label="Lunch", time_minutes=720, carbs_g=60.0),       # 12:00
        MealItem(label="Dinner", time_minutes=1080, carbs_g=75.0),     # 18:00
    ]


class SimulateRequest(BaseModel):
    patient_name: str = Field(default="adult#001", description="simglucose subject name (adult#001 to child#010)")
    controller_id: str = Field(default="placeholder_noop", description="Registered controller ID")
    controller_params: Dict[str, Any] = Field(default_factory=dict, description="Hyperparameters for controller")
    meals: List[MealItem] = Field(default_factory=default_meals, description="List of meals in the simulation protocol")
    sensor: str = Field(default="GuardianRT", description="CGM sensor model: GuardianRT, Dexcom, Navigator")
    pump: str = Field(default="Insulet", description="Insulin pump model: Insulet, Cozmo")
    seed: int = Field(default=42, description="Random seed for reproducible stochastic sensor noise")
    duration_hours: int = Field(default=24, ge=6, le=72, description="Simulation length in hours")
    start_time_hour: int = Field(default=0, ge=0, le=23, description="Start hour of simulation (0-23)")
    initial_bg: Optional[float] = Field(default=None, ge=30.0, le=600.0, description="Optional BG override in mg/dL")
    sensor_noise: bool = Field(default=True, description="Enable realistic sensor noise; set False for clean curves")


class CompareRequest(BaseModel):
    controller_a_id: str = Field(default="placeholder_noop", description="Controller A ID")
    controller_b_id: str = Field(default="placeholder_noop", description="Controller B ID")
    controller_a_params: Dict[str, Any] = Field(default_factory=dict)
    controller_b_params: Dict[str, Any] = Field(default_factory=dict)
    patient_name: str = Field(default="adult#001")
    meals: List[MealItem] = Field(default_factory=default_meals)
    sensor: str = Field(default="GuardianRT")
    pump: str = Field(default="Insulet")
    seed: int = Field(default=42, description="Shared seed for identical stochastic noise across both controllers")
    duration_hours: int = Field(default=24, ge=6, le=72)
    start_time_hour: int = Field(default=0, ge=0, le=23)
    initial_bg: Optional[float] = Field(default=None)
    sensor_noise: bool = Field(default=True)


class CompareDietsRequest(BaseModel):
    patient_name: str = Field(default="adult#001", description="Patient subject to compare diets on")
    controller_id: str = Field(default="rl4t1d_basal_bolus", description="Controller ID used for both diets")
    controller_params: Dict[str, Any] = Field(default_factory=dict)
    meals_a: List[MealItem] = Field(default_factory=default_meals, description="Meal protocol for Diet A")
    meals_b: List[MealItem] = Field(default_factory=default_meals, description="Meal protocol for Diet B")
    sensor: str = Field(default="GuardianRT")
    pump: str = Field(default="Insulet")
    seed: int = Field(default=42, description="Shared seed for identical stochastic noise")
    duration_hours: int = Field(default=24, ge=6, le=72)
    start_time_hour: int = Field(default=0, ge=0, le=23)
    initial_bg: Optional[float] = Field(default=None)
    sensor_noise: bool = Field(default=True)


class ComparePatientsRequest(BaseModel):
    patient_a_name: str = Field(default="adult#001", description="Patient A simglucose name")
    patient_b_name: str = Field(default="adult#002", description="Patient B simglucose name")
    controller_id: str = Field(default="rl4t1d_basal_bolus", description="Controller ID used for both patients")
    controller_params: Dict[str, Any] = Field(default_factory=dict)
    meals: List[MealItem] = Field(default_factory=default_meals, description="Shared meal protocol for both patients")
    sensor: str = Field(default="GuardianRT")
    pump: str = Field(default="Insulet")
    seed: int = Field(default=42, description="Shared seed for identical stochastic noise")
    duration_hours: int = Field(default=24, ge=6, le=72)
    start_time_hour: int = Field(default=0, ge=0, le=23)
    initial_bg: Optional[float] = Field(default=None)
    sensor_noise: bool = Field(default=True)


class ClinicalMetrics(BaseModel):
    tir_pct: float = Field(description="Time In Range (70-180 mg/dL) percentage")
    tar_pct: float = Field(description="Time Above Range (>180 mg/dL) percentage")
    tar_l1_pct: float = Field(description="TAR Level 1 (180-250 mg/dL) percentage")
    tar_l2_pct: float = Field(description="TAR Level 2 (>250 mg/dL) percentage")
    tbr_pct: float = Field(description="Time Below Range (<70 mg/dL) percentage")
    tbr_l1_pct: float = Field(description="TBR Level 1 (54-70 mg/dL) percentage")
    tbr_l2_pct: float = Field(description="TBR Level 2 (<54 mg/dL) percentage")
    risk_index: float = Field(description="Total UVA/Padova Risk Index")
    lbgi: float = Field(description="Low Blood Glucose Index")
    hbgi: float = Field(description="High Blood Glucose Index")
    mean_bg: float = Field(description="Mean Blood Glucose in mg/dL")


class PatientInfo(BaseModel):
    cohort: str
    subject_index: int
    simglucose_name: str
    age: float
    body_weight_kg: float
    tdi: float
    icr: float
    isf: float


class ControllerInfo(BaseModel):
    id: str
    display_name: str
    category: str
    description: str
    configurable_params: Dict[str, Any]


class MetadataResponse(BaseModel):
    patients: List[PatientInfo]
    controllers: List[ControllerInfo]
    sensors: List[str]
    pumps: List[str]


class SimulateResponse(BaseModel):
    timestamps: List[str] = Field(description="Time labels 'HH:MM'")
    minutes_elapsed: List[int] = Field(description="Minutes elapsed since start")
    bg: List[float] = Field(description="True blood glucose trace (mg/dL)")
    cgm: List[float] = Field(description="Sensor CGM trace (mg/dL)")
    insulin: List[float] = Field(description="Insulin delivery rate (U/min)")
    cho: List[float] = Field(description="Carbohydrate intake trace (g)")
    metrics: ClinicalMetrics
    patient_info: PatientInfo
    meta: Dict[str, Any]


class CompareResponse(BaseModel):
    run_a: SimulateResponse
    run_b: SimulateResponse
