# Workspace Rules: Diabetes Awareness Booth — simglucose Wrapper

## Core Mission
Build a locally hosted, offline-capable web wrapper around the Python `simglucose` (UVA/Padova 2008) Type 1 Diabetes simulator for a live Diabetes Awareness Day booth.

## Non-Negotiable Guardrails
1. **NO CONTROL ALGORITHMS:** Do NOT implement, tune, or write any insulin control algorithms (no PID, MPC, RL, custom basal-bolus, or heuristic dosing logic). Only implement the pluggable `ControllerRegistry` interface and a trivial `NoOpPlaceholderController` returning `Action(basal=0.0, bolus=0.0)` so the UI, API, and charts can be verified end-to-end.
2. **100% Offline Booth Operation:** Never depend on external CDNs for fonts, icons, charting libraries, or food images. Bundle all assets locally inside `frontend/public/` or npm packages.
3. **Human-Editable Frontend First:** Keep UI code flat, readable, and easy for a human to customize before the event. Store booth copy, scenario presets, and the meal/food library in standalone JSON files under `frontend/src/config/`—never hardcode preset lists deep inside React components.
4. **Deterministic Simulations:** Always pass the user-provided `seed` into `simglucose` sensor/environment initialization so Controller A vs. Controller B comparisons run on identical stochastic noise.
5. **No Simulation Math in the Browser:** All physiological stepping, risk index calculations (`LBGI`, `HBGI`, `RI`), and clinical metrics (TIR/TAR/TBR) must execute in Python on the backend using `simglucose`.

## Tech Stack
- **Backend:** Python 3.10+, FastAPI, Uvicorn, `simglucose`, `pandas`, `numpy`.
- **Frontend:** Vite + React (JSX/TSX), Tailwind CSS, Recharts (for synchronized Glucose + Insulin charts).
- **Execution:** Single local startup script (`start_booth.sh` / `start_booth.bat`) launching backend on `http://127.0.0.1:8000` and frontend on `http://127.0.0.1:5173` (or serving the built frontend directly from FastAPI in booth mode).

## Execution Protocol
- Follow the phased milestones in `PROJECT_SPEC.md` one phase at a time.
- Stop and run the phase's verification commands before starting the next phase.
- Never modify `simglucose` library source files in site-packages.