import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Utensils,
  GitCompare,
  Sliders,
  Sparkles,
  WifiOff,
  ChevronDown,
  UtensilsCrossed,
  Users,
} from 'lucide-react';
import { fetchMetadata, runSimulation } from './api/client';
import presetsData from './config/presets.json';
import boothCopy from './config/boothCopy.json';

import SimulatePage from './pages/SimulatePage';
import MealAnalysisPage from './pages/MealAnalysisPage';
import ComparePage from './pages/ComparePage';
import CompareDietsPage from './pages/CompareDietsPage';
import ComparePatientsPage from './pages/ComparePatientsPage';
import ParametersPage from './pages/ParametersPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('simulate');

  // Metadata state
  const [patients, setPatients] = useState([]);
  const [controllers, setControllers] = useState([]);
  const [sensors, setSensors] = useState(['GuardianRT', 'Dexcom', 'Navigator']);
  const [pumps, setPumps] = useState(['Insulet', 'Cozmo']);

  // Active selections
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedController, setSelectedController] = useState('placeholder_noop');
  const [controllerParams, setControllerParams] = useState({});

  // Meal protocol state (default to Balanced Day 3 meals)
  const [meals, setMeals] = useState([
    { label: 'Breakfast', time_minutes: 420, carbs_g: 45 },
    { label: 'Lunch', time_minutes: 720, carbs_g: 60 },
    { label: 'Dinner', time_minutes: 1080, carbs_g: 75 },
  ]);

  // Simulation environment parameters
  const [simParams, setSimParams] = useState({
    sensor: 'GuardianRT',
    pump: 'Insulet',
    seed: 42,
    duration_hours: 24,
    start_time_hour: 0,
    initial_bg: null,
    sensor_noise: true,
  });

  // Simulation results and loading state
  const [simResult, setSimResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load metadata on mount
  useEffect(() => {
    async function init() {
      try {
        const data = await fetchMetadata();
        setPatients(data.patients || []);
        setControllers(data.controllers || []);
        if (data.sensors) setSensors(data.sensors);
        if (data.pumps) setPumps(data.pumps);

        if (data.patients && data.patients.length > 0) {
          setSelectedPatient(data.patients[0]);
        }
        if (data.controllers && data.controllers.length > 0) {
          setSelectedController(data.controllers[0].id);
        }
      } catch (err) {
        console.error('Error loading metadata:', err);
        setError('Failed to connect to simulation backend. Make sure the backend server is running on port 8000.');
      }
    }
    init();
  }, []);

  // Simulation runner function
  const executeSimulation = useCallback(
    async (overrideMeals = null, overridePatient = null, overrideParams = null, overrideControllerParams = null) => {
      const patient = overridePatient || selectedPatient;
      if (!patient) return;

      setIsLoading(true);
      setError(null);

      const activeMeals = overrideMeals || meals;
      const activeParams = overrideParams || simParams;
      const activeControllerParams = overrideControllerParams || controllerParams;

      try {
        const payload = {
          patient_name: patient.simglucose_name,
          controller_id: selectedController,
          controller_params: activeControllerParams,
          meals: activeMeals,
          sensor: activeParams.sensor,
          pump: activeParams.pump,
          seed: activeParams.seed,
          duration_hours: activeParams.duration_hours,
          start_time_hour: activeParams.start_time_hour,
          initial_bg: activeParams.initial_bg,
          sensor_noise: activeParams.sensor_noise,
        };

        const result = await runSimulation(payload);
        setSimResult(result);
      } catch (err) {
        console.error('Simulation error:', err);
        setError(err.message || 'Simulation execution failed.');
      } finally {
        setIsLoading(false);
      }
    },
    [selectedPatient, selectedController, controllerParams, meals, simParams]
  );

  // Auto-run first simulation once selectedPatient is loaded
  useEffect(() => {
    if (selectedPatient && !simResult) {
      executeSimulation();
    }
  }, [selectedPatient, simResult, executeSimulation]);

  // Handle patient selection: updates state AND immediately re-runs simulation for the new patient!
  const handleSelectPatient = useCallback(
    (newPatient) => {
      if (!newPatient) return;
      setSelectedPatient(newPatient);
      executeSimulation(null, newPatient);
    },
    [executeSimulation]
  );

  // Handle Quick Presets selection from MealProtocolTable
  const handleLoadPreset = (preset) => {
    if (!preset) return;

    // 1. Find matching patient if preset defines cohort & subject index
    const targetPatient =
      patients.find(
        (p) => p.cohort === preset.cohort && p.subject_index === preset.subject_index
      ) || selectedPatient;

    if (targetPatient && targetPatient !== selectedPatient) {
      setSelectedPatient(targetPatient);
    }

    // 2. Set preset meals
    setMeals(preset.meals);

    // 3. Trigger simulation with preset settings
    executeSimulation(preset.meals, targetPatient);
  };

  const navItems = [
    { id: 'simulate', label: boothCopy.views.simulate, icon: Activity },
    { id: 'mealAnalysis', label: boothCopy.views.mealAnalysis, icon: Utensils },
    { id: 'compare', label: boothCopy.views.compare, icon: GitCompare },
    { id: 'compareDiets', label: boothCopy.views.compareDiets, icon: UtensilsCrossed },
    { id: 'comparePatients', label: boothCopy.views.comparePatients, icon: Users },
    { id: 'parameters', label: boothCopy.views.parameters, icon: Sliders },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Title & Badge */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-crimson text-white flex items-center justify-center shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-slate-900 text-base leading-none">
                    {boothCopy.header.title}
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-red-50 text-brand-crimson border border-red-200">
                    {boothCopy.header.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                  {boothCopy.header.subtitle}
                </p>
              </div>
            </div>

            {/* View Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand-crimson' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* 100% Offline Badge */}
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg"
                title="100% Local UVA/Padova engine. Zero external network dependencies."
              >
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline Ready</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'simulate' && (
          <SimulatePage
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={handleSelectPatient}
            controllers={controllers}
            selectedController={selectedController}
            onSelectController={(cId) => {
              setSelectedController(cId);
              setControllerParams({});
            }}
            controllerParams={controllerParams}
            onChangeControllerParams={setControllerParams}
            meals={meals}
            onChangeMeals={setMeals}
            onSelectPreset={handleLoadPreset}
            simParams={simParams}
            onChangeSimParams={setSimParams}
            simResult={simResult}
            isLoading={isLoading}
            error={error}
            onRunSimulation={() => executeSimulation()}
          />
        )}

        {activeTab === 'mealAnalysis' && (
          <MealAnalysisPage
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={handleSelectPatient}
            selectedController={selectedController}
            controllerParams={controllerParams}
            onRunSimulationWithMeals={(newMeals) => {
              setMeals(newMeals);
              executeSimulation(newMeals);
            }}
            simResult={simResult}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'compare' && (
          <ComparePage
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={handleSelectPatient}
            controllers={controllers}
            meals={meals}
            onChangeMeals={setMeals}
            onSelectPreset={handleLoadPreset}
            simParams={simParams}
          />
        )}

        {activeTab === 'compareDiets' && (
          <CompareDietsPage
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={handleSelectPatient}
            controllers={controllers}
            simParams={simParams}
          />
        )}

        {activeTab === 'comparePatients' && (
          <ComparePatientsPage
            patients={patients}
            controllers={controllers}
            meals={meals}
            onChangeMeals={setMeals}
            onSelectPreset={handleLoadPreset}
            simParams={simParams}
          />
        )}

        {activeTab === 'parameters' && (
          <ParametersPage
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={handleSelectPatient}
            controllers={controllers}
            selectedController={selectedController}
            onSelectController={(cId) => {
              setSelectedController(cId);
              setControllerParams({});
            }}
            controllerParams={controllerParams}
            onChangeControllerParams={setControllerParams}
            meals={meals}
            onChangeMeals={setMeals}
            onSelectPreset={handleLoadPreset}
            simParams={simParams}
            onChangeSimParams={setSimParams}
            simResult={simResult}
            isLoading={isLoading}
            onRunSimulation={() => executeSimulation()}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        Diabetes Awareness Day Booth Demonstration • UVA/Padova Type 1 Diabetes Metabolic Simulator
      </footer>
    </div>
  );
}
