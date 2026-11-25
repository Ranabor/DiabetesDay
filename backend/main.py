import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.controllers.registry import controller_registry
from backend.patient_catalog import patient_catalog
from backend.schemas import (
    CompareRequest,
    CompareResponse,
    CompareDietsRequest,
    ComparePatientsRequest,
    ControllerInfo,
    MetadataResponse,
    PatientInfo,
    SimulateRequest,
    SimulateResponse,
)
from backend.sim_service import SimulationService, sim_service

app = FastAPI(
    title="Diabetes Awareness Booth — simglucose API",
    description="Offline-capable simulation wrapper around UVA/Padova simglucose Type 1 Diabetes model.",
    version="1.0.0",
)

# CORS setup for local booth operation
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "simglucose-booth", "version": "1.0.0"}


@app.get("/api/metadata", response_model=MetadataResponse)
def get_metadata():
    """Return all 30 virtual patients, registered controllers, available sensors, and pumps."""
    raw_patients = patient_catalog.get_all_patients()
    patients = [PatientInfo(**p) for p in raw_patients]

    raw_controllers = controller_registry.list_all()
    controllers = [ControllerInfo(**c) for c in raw_controllers]

    return MetadataResponse(
        patients=patients,
        controllers=controllers,
        sensors=SimulationService.AVAILABLE_SENSORS,
        pumps=SimulationService.AVAILABLE_PUMPS,
    )


@app.post("/api/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    """Execute a single deterministic simulation and return traces + clinical metrics."""
    try:
        return sim_service.run_simulation(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/compare", response_model=CompareResponse)
def compare(req: CompareRequest):
    """Execute two controllers side-by-side under identical stochastic conditions."""
    try:
        return sim_service.run_comparison(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/compare-diets", response_model=CompareResponse)
def compare_diets(req: CompareDietsRequest):
    """Execute two different diet protocols side-by-side on the same patient and controller."""
    try:
        return sim_service.run_diet_comparison(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/compare-patients", response_model=CompareResponse)
def compare_patients(req: ComparePatientsRequest):
    """Execute two different patients side-by-side under the exact same diet and algorithm."""
    try:
        return sim_service.run_patient_comparison(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Static frontend hosting (when frontend is built)
FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
)

if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend build index not found"}
