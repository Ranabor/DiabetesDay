import React, { useState } from 'react';
import { Play, RefreshCw, GitCompare, ChevronDown, ChevronUp } from 'lucide-react';
import PatientCard from '../components/PatientCard';
import SimulationChart from '../components/SimulationChart';
import ClinicalMetricsGrid from '../components/ClinicalMetricsGrid';
import MealProtocolTable from '../components/MealProtocolTable';
import ControllerParamsEditor from '../components/ControllerParamsEditor';
import { runComparison } from '../api/client';

export default function ComparePage({
  patients,
  selectedPatient,
  onSelectPatient,
  controllers,
  meals,
  onChangeMeals,
  onSelectPreset,
  simParams,
}) {
  const [controllerA, setControllerA] = useState(controllers[0]?.id || 'placeholder_noop');
  const [controllerB, setControllerB] = useState(controllers[1]?.id || controllers[0]?.id || 'placeholder_noop');
  const [paramsA, setParamsA] = useState({});
  const [paramsB, setParamsB] = useState({});
  const [showTuningA, setShowTuningA] = useState(false);
  const [showTuningB, setShowTuningB] = useState(false);
  const [sharedSeed, setSharedSeed] = useState(simParams.seed || 42);
  const [compareResult, setCompareResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const ctrlObjA = controllers.find((c) => c.id === controllerA);
  const ctrlObjB = controllers.find((c) => c.id === controllerB);

  const handleRandomizeSeed = () => {
    setSharedSeed(Math.floor(Math.random() * 10000));
  };

  const handleRunComparison = async () => {
    if (!selectedPatient) return;
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        controller_a_id: controllerA,
        controller_b_id: controllerB,
        controller_a_params: paramsA,
        controller_b_params: paramsB,
        patient_name: selectedPatient.simglucose_name,
        meals: meals,
        sensor: simParams.sensor,
        pump: simParams.pump,
        seed: sharedSeed,
        duration_hours: simParams.duration_hours,
        start_time_hour: simParams.start_time_hour,
        sensor_noise: simParams.sensor_noise,
      };

      const result = await runComparison(payload);
      setCompareResult(result);
    } catch (err) {
      setError(err.message || 'Comparison failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Row: Responsive Row of Configuration Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {/* Box 1: Patient Selection */}
        <PatientCard
          patients={patients}
          selectedPatient={selectedPatient}
          onSelectPatient={onSelectPatient}
        />

        {/* Box 2: Controller Selection & Tuning Comparison Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <GitCompare className="w-4 h-4 text-brand-indigo" />
            <h3 className="font-semibold text-slate-900 text-sm">Compare Controllers</h3>
          </div>

          {/* Controller A Section */}
          <div className="space-y-2 p-3 bg-teal-50/30 border border-teal-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-teal-800">
                Controller A (Teal Trace)
              </label>
              {ctrlObjA && Object.keys(ctrlObjA.configurable_params || {}).length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTuningA(!showTuningA)}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-0.5"
                >
                  <span>Tuning</span>
                  {showTuningA ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
            <select
              value={controllerA}
              onChange={(e) => {
                setControllerA(e.target.value);
                setParamsA({});
              }}
              className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
            >
              {controllers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name} ({c.category})
                </option>
              ))}
            </select>

            {showTuningA && ctrlObjA && (
              <ControllerParamsEditor
                controller={ctrlObjA}
                values={paramsA}
                onChange={setParamsA}
                compact={true}
                title="Controller A Parameters"
              />
            )}
          </div>

          {/* Controller B Section */}
          <div className="space-y-2 p-3 bg-purple-50/30 border border-purple-200 rounded-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-800">
                Controller B (Purple Dashed Trace)
              </label>
              {ctrlObjB && Object.keys(ctrlObjB.configurable_params || {}).length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTuningB(!showTuningB)}
                  className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-0.5"
                >
                  <span>Tuning</span>
                  {showTuningB ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
            <select
              value={controllerB}
              onChange={(e) => {
                setControllerB(e.target.value);
                setParamsB({});
              }}
              className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {controllers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name} ({c.category})
                </option>
              ))}
            </select>

            {showTuningB && ctrlObjB && (
              <ControllerParamsEditor
                controller={ctrlObjB}
                values={paramsB}
                onChange={setParamsB}
                compact={true}
                title="Controller B Parameters"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Shared Random Seed (Identical Noise)
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
            onClick={handleRunComparison}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-brand-crimson hover:bg-brand-crimsonHover text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span>Running Side-by-Side Simulation...</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Compare Controllers</span>
              </>
            )}
          </button>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>

        {/* Box 3: Shared Meal Protocol with Embedded Presets */}
        <MealProtocolTable
          meals={meals}
          onChangeMeals={onChangeMeals}
          onSelectPreset={onSelectPreset}
        />
      </div>

      {/* Bottom Section: Side-by-Side Charts & Metrics */}
      <div className="space-y-5">
        <SimulationChart
          simData={compareResult?.run_a}
          compareData={compareResult?.run_b}
          title={`Controller A: ${ctrlObjA?.display_name || 'A'} (Teal) vs Controller B: ${ctrlObjB?.display_name || 'B'} (Purple Overlay)`}
        />

        <ClinicalMetricsGrid
          metrics={compareResult?.run_a?.metrics}
          metricsB={compareResult?.run_b?.metrics}
        />
      </div>
    </div>
  );
}
