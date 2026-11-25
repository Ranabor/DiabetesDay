import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Utensils, UtensilsCrossed, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import PatientCard from '../components/PatientCard';
import SimulationChart from '../components/SimulationChart';
import ClinicalMetricsGrid from '../components/ClinicalMetricsGrid';
import MealProtocolTable from '../components/MealProtocolTable';
import ControllerParamsEditor from '../components/ControllerParamsEditor';
import { runDietComparison } from '../api/client';
import defaultPresets from '../config/presets.json';

export default function CompareDietsPage({
  patients,
  selectedPatient,
  onSelectPatient,
  controllers,
  simParams,
}) {
  // Diet A: default to Balanced Day
  const [mealsA, setMealsA] = useState([
    { label: 'Breakfast', time_minutes: 420, carbs_g: 45 },
    { label: 'Lunch', time_minutes: 720, carbs_g: 60 },
    { label: 'Dinner', time_minutes: 1080, carbs_g: 75 },
  ]);

  // Diet B: default to High-Carb Pizza Night
  const [mealsB, setMealsB] = useState([
    { label: 'Breakfast', time_minutes: 450, carbs_g: 35 },
    { label: 'Lunch', time_minutes: 750, carbs_g: 50 },
    { label: 'Pizza Dinner', time_minutes: 1140, carbs_g: 125 },
  ]);

  const [controllerId, setControllerId] = useState('rl4t1d_basal_bolus');
  const [ctrlParams, setCtrlParams] = useState({});
  const [showTuning, setShowTuning] = useState(false);
  const [sharedSeed, setSharedSeed] = useState(simParams?.seed || 42);
  const [compareResult, setCompareResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeCtrl = controllers.find((c) => c.id === controllerId);

  const handleRandomizeSeed = () => {
    setSharedSeed(Math.floor(Math.random() * 10000));
  };

  const handleRunDietComparison = async (patientOverride = null) => {
    const patient = patientOverride || selectedPatient;
    if (!patient) return;

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        patient_name: patient.simglucose_name,
        controller_id: controllerId,
        controller_params: ctrlParams,
        meals_a: mealsA,
        meals_b: mealsB,
        sensor: simParams?.sensor || 'GuardianRT',
        pump: simParams?.pump || 'Insulet',
        seed: sharedSeed,
        duration_hours: simParams?.duration_hours || 24,
        start_time_hour: simParams?.start_time_hour || 0,
        sensor_noise: simParams?.sensor_noise ?? true,
      };

      const result = await runDietComparison(payload);
      setCompareResult(result);
    } catch (err) {
      setError(err.message || 'Diet comparison simulation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Run on mount when selectedPatient is available
  useEffect(() => {
    if (selectedPatient && !compareResult) {
      handleRunDietComparison();
    }
  }, [selectedPatient]);

  return (
    <div className="space-y-6">
      {/* Top Section: Patient Selection and Shared Control Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Patient Selection Card */}
        <PatientCard
          patients={patients}
          selectedPatient={selectedPatient}
          onSelectPatient={(p) => {
            onSelectPatient(p);
            handleRunDietComparison(p);
          }}
        />

        {/* Algorithm & Environment Setup Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <UtensilsCrossed className="w-4 h-4 text-brand-crimson" />
            <h3 className="font-semibold text-slate-900 text-sm">Diet Comparison Settings</h3>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Shared Control Algorithm
              </label>
              {activeCtrl && Object.keys(activeCtrl.configurable_params || {}).length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTuning(!showTuning)}
                  className="text-[11px] font-semibold text-brand-crimson hover:underline flex items-center gap-0.5"
                >
                  <span>Tuning</span>
                  {showTuning ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
            <select
              value={controllerId}
              onChange={(e) => {
                setControllerId(e.target.value);
                setCtrlParams({});
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-crimson"
            >
              {controllers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name} ({c.category})
                </option>
              ))}
            </select>
          </div>

          {showTuning && activeCtrl && (
            <ControllerParamsEditor
              controller={activeCtrl}
              values={ctrlParams}
              onChange={setCtrlParams}
              compact={true}
              title={`${activeCtrl.display_name} Parameters`}
            />
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shared Stochastic Noise Seed
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={sharedSeed}
                onChange={(e) => setSharedSeed(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800"
              />
              <button
                type="button"
                onClick={handleRandomizeSeed}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 transition-colors"
                title="Randomize shared seed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRunDietComparison()}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-brand-crimson hover:bg-brand-crimsonHover text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span>Simulating Both Diets...</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Compare Diets on This Patient</span>
              </>
            )}
          </button>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>
      </div>

      {/* Middle Section: Diet A & Diet B Protocols Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Diet A Meal Table */}
        <div className="border-2 border-teal-300 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-teal-50 px-4 py-2 border-b border-teal-200 flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
              Diet A Protocol (Teal Line)
            </span>
          </div>
          <MealProtocolTable
            meals={mealsA}
            onChangeMeals={setMealsA}
            className="border-none rounded-none shadow-none"
          />
        </div>

        {/* Diet B Meal Table */}
        <div className="border-2 border-purple-300 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-purple-50 px-4 py-2 border-b border-purple-200 flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              Diet B Protocol (Purple Dashed Line)
            </span>
          </div>
          <MealProtocolTable
            meals={mealsB}
            onChangeMeals={setMealsB}
            className="border-none rounded-none shadow-none"
          />
        </div>
      </div>

      {/* Bottom Section: Comparative Charts & Metrics */}
      <div className="space-y-5">
        <SimulationChart
          simData={compareResult?.run_a}
          compareData={compareResult?.run_b}
          title={`Diet A (Teal) vs Diet B (Purple Overlay) • ${selectedPatient?.cohort} #${(selectedPatient?.subject_index ?? 0) + 1} (${selectedPatient?.simglucose_name})`}
        />

        <ClinicalMetricsGrid
          metrics={compareResult?.run_a?.metrics}
          metricsB={compareResult?.run_b?.metrics}
        />
      </div>
    </div>
  );
}
