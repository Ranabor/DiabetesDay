# Project Specification: Local `simglucose` Booth Demo Wrapper

## 1. Overview & Goals
Build a locally hosted, 100% offline-capable web wrapper around the Python `simglucose` (UVA/Padova 2008) Type 1 Diabetes simulator for a live Diabetes Awareness Day booth.

- **Human-Editable Frontend:** Flat, readable React components with all booth text, scenario presets, and meal options stored in standalone JSON config files so the presenter can easily edit copy and scenarios.
- **Pluggable Controller Architecture:** Support selecting and comparing controllers via a clean registry interface, with **no real control algorithms implemented yet** (only a `NoOpPlaceholderController` returning zero insulin so the full pipeline can be tested end-to-end).
- **CAPSML-Inspired Booth Interface:** Modeled after `capsml.com/simulate`, featuring a persistent patient profile sidebar, visual meal analysis cards, side-by-side controller comparison, synchronized Glucose/Insulin playback charts, and clinical metric summary cards.

---

## 2. Repository Structure

~~~text
simglucose-booth/
├── AGENTS.md
├── PROJECT_SPEC.md
├── .agents/
│   └── rules/
│       ├── backend.md
│       └── frontend.md
├── backend/
│   ├── main.py                  # FastAPI app, CORS, static asset serving
│   ├── schemas.py               # Pydantic request/response contracts
│   ├── sim_service.py           # Runs T1DSimEnv, extracts traces + clinical metrics
│   ├── patient_catalog.py       # Reads simglucose vpatient_params.csv + Quest.csv
│   ├── controllers/
│   │   ├── __init__.py
│   │   ├── README.md            # 3-step guide for adding future algorithms
│   │   ├── base.py              # BaseDemoController interface
│   │   ├── registry.py          # Registers available controllers
│   │   └── placeholder.py       # NoOpPlaceholderController ONLY (no real algorithms)
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   └── foods/               # Local food thumbnails for Meal Analysis cards
│   ├── src/
│   │   ├── config/
│   │   │   ├── boothCopy.json   # Editable titles, subtitles, booth instructions
│   │   │   ├── presets.json     # Quick-load booth scenario presets
│   │   │   └── foods.json       # Food library (name, carbs_g, serving_label, image)
│   │   ├── api/
│   │   │   └── client.js        # Thin fetch wrapper for /api/*
│   │   ├── components/
│   │   │   ├── PatientCard.jsx        # Cohort, Subject (0-9), Age, BW, TDI, ICR, ISF
│   │   │   ├── MealProtocolTable.jsx  # Breakfast/Lunch/Dinner carb + time inputs
│   │   │   ├── SimParamsDrawer.jsx    # Sensor, Pump, Seed, Duration, Start BG, Noise
│   │   │   ├── SimulationChart.jsx    # Synchronized Glucose + Insulin + playback bar
│   │   │   └── ClinicalMetricsGrid.jsx# TIR, TAR, TBR, Risk Index, LBGI, HBGI cards
│   │   ├── pages/
│   │   │   ├── SimulatePage.jsx       # Single-controller console + quick presets
│   │   │   ├── MealAnalysisPage.jsx   # Visual food picker + portion multiplier
│   │   │   ├── ComparePage.jsx        # Controller A vs. Controller B overlay
│   │   │   └── ParametersPage.jsx     # Full simglucose parameter sandbox
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── start_booth.sh
~~~

---

## 3. Backend Specification (`simglucose` Engine & API)

### 3.1 Virtual Patient Catalog (`patient_catalog.py`)
Load all 30 built-in `simglucose` virtual subjects directly from `simglucose`'s packaged CSV files (`vpatient_params.csv` and `Quest.csv`):

- **Cohorts:**
  - `adult`: `adult#001` through `adult#010`
  - `adolescent`: `adolescent#001` through `adolescent#010`
  - `child`: `child#001` through `child#010`
- **UI Mapping:** Expose `cohort` (`Adult` | `Adolescent` | `Child`), `subject_index` (`0`–`9`), `simglucose_name` (e.g., `adult#001`), and clinical profile attributes:
  - `age` (years)
  - `body_weight_kg` (`BW`)
  - `tdi` (Total Daily Insulin, U)
  - `icr` (`CR`, Insulin-to-Carb Ratio)
  - `isf` (`CF`, Insulin Sensitivity Factor)

### 3.2 Pluggable Controller Contract (`backend/controllers/`)
- Define `BaseDemoController` with:
  - Metadata fields: `id: str`, `display_name: str`, `category: str` (e.g., `"Placeholder"`, `"Clinical"`, `"AI"`), `description: str`, `configurable_params: dict`.
  - Lifecycle methods:
    - `reset(patient_meta: dict, params: dict) -> None`
    - `policy(observation, reward, done, **info) -> Action` (returns `simglucose.controller.base.Action(basal, bolus)`).
- Register **only** `NoOpPlaceholderController` (`id="placeholder_noop"`, returns `Action(0.0, 0.0)`) during this build.
- Document in `backend/controllers/README.md` the exact 3-step process for adding a new controller file and registering it in `registry.py`.

### 3.3 Configurable `simglucose` Parameters
Every simulation request must accept standard `simglucose` parameters with sensible defaults:

| Parameter | Type / Options | Default | Notes |
| :--- | :--- | :--- | :--- |
| `patient_name` | `str` (one of 30 subjects) | `"adult#001"` | Mapped from Cohort + Subject index |
| `controller_id` | `str` (from registry) | `"placeholder_noop"` | Selects registered controller |
| `controller_params` | `dict` | `{}` | Reserved for future controller tuning |
| `meals` | `list[{label, time_minutes, carbs_g}]` | Breakfast/Lunch/Dinner | Converted to `CustomScenario` |
| `sensor` | `"Dexcom"` \| `"GuardianRT"` \| `"Navigator"` | `"GuardianRT"` | Instantiated via `CGMSensor.withName` |
| `pump` | `"Insulet"` \| `"Cozmo"` | `"Insulet"` | Instantiated via `InsulinPump.withName` |
| `seed` | `int` | `42` | Ensures reproducible sensor noise |
| `duration_hours` | `int` (`6`–`72`) | `24` | Simulation horizon |
| `start_time_hour` | `int` (`0`–`23`) | `0` | Simulation clock start (`00:00`) |
| `initial_bg` | `float \| None` | `None` | Optional override for starting glucose (mg/dL) |
| `sensor_noise` | `bool` | `true` | Toggle off for clean, noiseless booth curves |

### 3.4 REST API Endpoints
- **`GET /api/metadata`**
  - Returns all 30 virtual patients (with Age, BW, TDI, ICR, ISF), registered controllers, available CGM sensors, and available insulin pumps.
- **`POST /api/simulate`**
  - Executes a single `T1DSimEnv` run and returns:
    - `timestamps`: array of `"HH:MM"` strings (plus `minutes_elapsed`)
    - `bg`: true blood glucose trace (mg/dL)
    - `cgm`: CGM sensor trace (mg/dL)
    - `insulin`: insulin delivery trace (U/min)
    - `cho`: carbohydrate intake events/trace (g)
    - `metrics`: `{ tir_pct, tar_pct, tar_l1_pct, tar_l2_pct, tbr_pct, tbr_l1_pct, tbr_l2_pct, risk_index, lbgi, hbgi, mean_bg }`
- **`POST /api/compare`**
  - Accepts `controller_a_id`, `controller_b_id`, and shared subject, meal protocol, hardware, and `seed` settings.
  - Executes both controllers under identical stochastic conditions and returns `{ run_a, run_b }`.

### 3.5 Clinical Metrics Definitions
- **TIR (Time In Range):** $70 \le \text{BG} \le 180\text{ mg/dL}$
- **TAR (Time Above Range):** $\text{BG} > 180\text{ mg/dL}$ (Level 1: $180\text{–}250$, Level 2: $> 250$)
- **TBR (Time Below Range):** $\text{BG} < 70\text{ mg/dL}$ (Level 1: $54\text{–}70$, Level 2: $< 54$)
- **Risk Indices:** Compute `LBGI`, `HBGI`, and total `Risk Index` using `simglucose.analysis.risk.risk_index`.

---

## 4. Frontend Specification (CAPSML-Inspired Booth UI)

### 4.1 Visual Design & Editability
- **Aesthetic:** Clean clinical layout with white cards on a light-gray canvas (`#f8fafc`), high-contrast slate text, crimson/terracotta primary action buttons (`#b93c32`), teal glucose line (`#0f766e`), indigo insulin bars (`#4f46e5`), and red carbohydrate markers.
- **Navigation & Presets:** Top navigation bar switching between the 4 views plus a **Quick Presets** selector loaded from `frontend/src/config/presets.json` (e.g., *Balanced Day*, *High-Carb Pizza Night*, *Skipped Breakfast*, *Child Subject*).
- **Offline Requirement:** All fonts, icons, charting libraries, and food images must be bundled locally with zero external network requests.

### 4.2 Shared Components
1. **`PatientCard` (Left Sidebar)**
   - Simple SVG avatar + label (e.g., `Adult 0`).
   - `Cohort` dropdown (`Adult`, `Adolescent`, `Child`) and `Subject` dropdown (`0`–`9`).
   - Read-only clinical profile rows: `Age`, `Body weight`, `TDI`, `ICR`, `ISF`.
2. **`SimulationChart` (Results Panel)**
   - **Playback Controls:** Step back (`<`), `Play / Pause` (animates trace progressively across the day for booth storytelling), Step forward (`>`), `Reset`, speed toggle (`1x / 4x / Instant`), and live time/glucose readout (e.g., `08:15 — 142 mg/dL`).
   - **Glucose Panel (`mg/dL`, 0–600):** Shaded green TIR band (`70–180`), dashed reference lines at `54`, `70` (red), `180` (green), and `250` (amber). Meal markers annotated on the timeline. Supports overlaying two trajectories in Compare mode.
   - **Insulin Panel (`U/min`):** Synchronized X-axis (`00:00` to `24:00`) displaying insulin delivery bars.
   - **Legend Pills:** Active Sensor, active Pump, Carb marker, and TIR/TBR/TAR zone badges.
3. **`ClinicalMetricsGrid`**
   - 6 metric cards below the chart: `Time In Range`, `Time Above Range`, `Time Below Range`, `Risk Index`, `LBGI`, and `HBGI`.
   - In Compare mode, display Controller A vs. Controller B values side by side with delta indicators.

### 4.3 Four Views
1. **Simulate (Default Booth View):** `PatientCard` + Controller dropdown + `MealProtocolTable` (Breakfast, Lunch, Dinner carb & time inputs plus add/remove snack rows) + collapsible `SimParamsDrawer` + `Run` button + `SimulationChart` & `ClinicalMetricsGrid`.
2. **Meal Analysis:** `PatientCard` + Controller dropdown + 3 visual meal cards (Breakfast, Lunch, Dinner). Each card includes a food dropdown populated from `foods.json`, a `Portion Size` multiplier, `Meal Time`, live calculated carbohydrates (`g`), and a local food thumbnail.
3. **Compare Controllers:** `PatientCard` + `Controller A`, `Controller B`, and `Seed` inputs + `MealProtocolTable` + `Compare controllers` button rendering overlaid trajectories and side-by-side clinical metrics.
4. **Parameters / Sandbox:** Exposes all `simglucose` environment controls upfront (Sensor, Pump, Seed, Duration, Start Time, Initial BG override, Noise toggle, and a generic JSON/form editor for future controller parameters).

---

## 5. Phased Implementation Plan & Verification

### Phase 1: Backend Core & `simglucose` Plumbing
- **Build:** `patient_catalog.py`, `controllers/base.py`, `controllers/registry.py`, `controllers/placeholder.py`, `sim_service.py`, `schemas.py`, and `main.py`.
- **Verify:**
  - `pytest` confirms all 30 virtual patients load with valid Age, BW, TDI, ICR, and ISF values.
  - `GET /api/metadata` returns 30 patients and `placeholder_noop`.
  - `POST /api/simulate` completes a 24-hour run in under 2 seconds and returns valid `bg`, `cgm`, `insulin`, `cho`, and `metrics`.

### Phase 2: Frontend Shell, Config Files & Single Simulation View
- **Build:** Vite + React + Tailwind + Recharts scaffold; `boothCopy.json`, `presets.json`, `foods.json` (with 10–15 starter foods and local thumbnails); `PatientCard`, `MealProtocolTable`, `SimulationChart`, `ClinicalMetricsGrid`, and `SimulatePage`.
- **Verify:**
  - Start backend and frontend dev servers, open in browser, select `Adult 0`, load a preset, click `Run`, and confirm animated chart playback and clinical metrics render with zero console errors.

### Phase 3: Meal Analysis, Compare Mode & Parameter Sandbox
- **Build:** `MealAnalysisPage`, `ComparePage`, `ParametersPage`, and `SimParamsDrawer`.
- **Verify:**
  - Changing portion size on `MealAnalysisPage` dynamically recalculates carbs and updates the simulation.
  - `ComparePage` overlays two runs using the same `seed` and shows side-by-side metrics.
  - Switching Sensor (`Dexcom` vs. `GuardianRT`) updates both the backend run and the chart legend.

### Phase 4: Booth Polish & Single-Command Startup
- **Build:** `start_booth.sh` (and `start_booth.bat` if needed) for one-command local launch, plus `backend/controllers/README.md`.
- **Verify:**
  - Enable Offline mode in browser DevTools and confirm the entire application loads and runs simulations with zero failed external requests.