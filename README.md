# Diabetes Awareness Day: `simglucose` Interactive Web Wrapper

An offline-capable, interactive web application wrapping the UVA/Padova Type 1 Diabetes simulator (`simglucose`) for live education at Diabetes Awareness Day.

---

## Quickstart (Single-Command Launch)

### Windows
Double-click `start_booth.bat` or run:
```powershell
.\start_booth.bat
```

### macOS / Linux
```bash
chmod +x start_booth.sh
./start_booth.sh
```

This launches the local Uvicorn backend on `http://127.0.0.1:8000` (serving both the simulation REST API and the compiled React SPA) and automatically opens your browser.

---

## Core Capabilities & Views

Modeled after modern continuous glucose monitoring (CGM) consoles and interactive medical simulators, the interface features 4 specialized views:

### 1. Simulate (Main Booth View)
* **Virtual Patient Sidebar (`PatientCard`):** Displays avatar, cohort selection (`Adult`, `Adolescent`, `Child`), subject ID (`0`–`9`), and read-only physiological parameters:
  * **Age** (years)
  * **Body Weight** ($BW$, kg)
  * **Total Daily Insulin** ($TDI$, U)
  * **Insulin-to-Carb Ratio** ($ICR$, g/U)
  * **Insulin Sensitivity Factor** ($ISF$, mg/dL/U)
* **Active Controller Selector:** Selects registered controllers (defaults to zero-insulin baseline `placeholder_noop`).
* **Meal Protocol Table:** Add or remove breakfast, lunch, dinner, or snack events, customize eating times (`HH:MM`), and set carbohydrate amounts ($g$) with live total daily carb tracking.
* **Environment Parameters Drawer:** Collapsible controls for CGM Sensor (`GuardianRT`, `Dexcom`, `Navigator`), Pump (`Insulet`, `Cozmo`), Seed, Horizon Duration (12h, 24h, 48h, 72h), and Noise toggle.
* **Synchronized Dual-Panel Chart:**
  * **Upper Panel:** Interstitial Glucose (mg/dL) with shaded green Target Band ($70\text{–}180\text{ mg/dL}$), alert threshold lines ($54, 70, 180, 250$), and teal CGM trace.
  * **Lower Panel:** Synchronized Insulin Infusion rate ($U/\text{min}$) aligned on the exact same timeline.
  * **Animated Playback Controls:** Step back, Play/Pause animation, Step forward, Reset to 00:00, Speed toggles ($1x, 4x, 16x, \text{All}$), and live time/glucose status readout.
* **Clinical Metrics Grid:** 6 summary cards tracking TIR, TAR, TBR, Risk Index, LBGI, and HBGI.

### 2. Meal Analysis
* **Visual Food Picker:** 3 meal cards (Breakfast, Lunch, Dinner) featuring local food illustrations.
* **Food Library:** Dropdown populated from `frontend/src/config/foods.json` (oatmeal, pizza, burgers, salmon, etc.).
* **Portion Multiplier:** Quick $-$/$+$ buttons ($0.5x\text{–}3.0x$) dynamically calculating total carbohydrates and passing them directly into the UVA/Padova stomach two-compartment ODE model.

### 3. Compare Controllers
* **Side-by-Side Comparison:** Select `Controller A` (Teal line) and `Controller B` (Purple dashed line).
* **Identical Stochastic Seed:** Forces both runs to encounter the exact same sensor noise trajectory for fair head-to-head comparison.
* **Overlaid Visualizations & Deltas:** Overlays both glycemic trajectories on one chart and calculates clinical metric improvements (e.g. $+15.2\%$ TIR delta badge).

### 4. Parameters Sandbox
* Full developer and presenter sandbox exposing all `simglucose` environment settings upfront for live experimentation.

---

## Clinical Metrics Reference

| Metric | Target | Clinical Definition |
| :--- | :--- | :--- |
| **Time in Range (TIR)** | $> 70\%$ | $70 \le \text{BG} \le 180\text{ mg/dL}$. Core clinical benchmark for reducing microvascular risk. |
| **Time Above Range (TAR)** | $< 25\%$ | $\text{BG} > 180\text{ mg/dL}$. Level 1 ($180\text{–}250$) and Level 2 ($> 250$). Risk of ketoacidosis (DKA). |
| **Time Below Range (TBR)** | $< 4\%$ | $\text{BG} < 70\text{ mg/dL}$. Level 1 ($54\text{–}70$) and Level 2 ($< 54$). Acute hypoglycemia risk. |
| **Risk Index (RI)** | Composite | Total UVA/Padova risk index ($\text{LBGI} + \text{HBGI}$) quantifying glycemic instability. |
| **LBGI** | $< 2.5$ | Low Blood Glucose Index (Kovatchev et al.). Quantifies frequency and depth of hypoglycemia. |
| **HBGI** | $< 4.5$ | High Blood Glucose Index (Kovatchev et al.). Quantifies exposure to hyperglycemia. |

---

## Human-Editable Customization (Before the Event)

All booth text, food choices, and scenarios can be customized directly in JSON files without editing React code:

* **Edit Booth Titles & Copy:** [frontend/src/config/boothCopy.json](file:///C:/Users/reddy/OneDrive/Documents/School/Medical/School/MedTech/DiabetesDay/frontend/src/config/boothCopy.json)
* **Edit Scenario Presets:** [frontend/src/config/presets.json](file:///C:/Users/reddy/OneDrive/Documents/School/Medical/School/MedTech/DiabetesDay/frontend/src/config/presets.json)
* **Edit Food Library & Carbs:** [frontend/src/config/foods.json](file:///C:/Users/reddy/OneDrive/Documents/School/Medical/School/MedTech/DiabetesDay/frontend/src/config/foods.json)

To rebuild the frontend after editing configs:
```powershell
cd frontend
npm run build
```

---

## Available Control Algorithms (from RL4H/RL4T1D)

The booth includes 4 registered controllers adapted from [RL4H/RL4T1D](https://github.com/RL4H/RL4T1D) for live demonstration and comparison:

1. **`placeholder_noop` (Zero-Insulin Baseline):** Infuses 0.0 U insulin to visually demonstrate unmitigated hyperglycemia and the natural meal glucose excursion without insulin.
2. **`rl4t1d_basal_bolus` (Clinical Basal-Bolus):** Standard clinical intensive insulin therapy:
   * Continuous steady-state basal rate: $u_{2ss} \times BW / 6000$ (U/min).
   * Meal carbohydrate bolus: $\text{CHO} / \text{ICR}$ (U) with empirical meal carb estimation error model.
   * High blood glucose correction bolus: $(\text{CGM} - \text{Target}) / \text{ISF}$ with 3-hour cooldown window.
3. **`rl4t1d_pid` (PID Closed-Loop):** Continuous Proportional-Integral-Derivative feedback controller adjusting basal rate against sensor error, with anti-windup clamping and safe pump limits.
4. **`rl4t1d_neural` (PPO Deep Actor-Critic):** Neural network policy architecture featuring an LSTM temporal feature extractor over CGM, CHO, and insulin history, mapped through non-linear continuous control space functions (exponential, quadratic, or normal).

See [backend/controllers/README.md](file:///C:/Users/reddy/OneDrive/Documents/School/Medical/School/MedTech/DiabetesDay/backend/controllers/README.md) for full equations, benchmarks, and how to plug in further custom algorithms.

---

## Automated Verification Suite

Run all unit, integration, and offline compliance tests:

```powershell
# Core backend and simulation speed tests
python tests/test_backend.py

# Offline compliance, local assets, and multi-cohort tests
python tests/test_offline_audit.py
```
