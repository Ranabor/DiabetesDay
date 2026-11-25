import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, Users, User, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import SimulationChart from '../components/SimulationChart';
import ClinicalMetricsGrid from '../components/ClinicalMetricsGrid';
import MealProtocolTable from '../components/MealProtocolTable';
import ControllerParamsEditor from '../components/ControllerParamsEditor';
import { runPatientComparison } from '../api/client';

export default function ComparePatientsPage({
  patients = [],
  controllers = [],
  meals,
  onChangeMeals,
  onSelectPreset,
  simParams,
}) {
  const [patientAName, setPatientAName] = useState(patients[0]?.simglucose_name || 'adult#001');
  const [patientBName, setPatientBName] = useState(
    patients.find((p) => p.cohort === 'Child')?.simglucose_name || patients[1]?.simglucose_name || 'child#001'
  );

  const [controllerId, setControllerId] = useState('rl4t1d_basal_bolus');
  const [ctrlParams, setCtrlParams] = useState({});
  const [showTuning, setShowTuning] = useState(false);
  const [sharedSeed, setSharedSeed] = useState(simParams?.seed || 42);
  const [compareResult, setCompareResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const patientA = patients.find((p) => p.simglucose_name === patientAName) || patients[0];
  const patientB = patients.find((p) => p.simglucose_name === patientBName) || patients[1];
  const activeCtrl = controllers.find((c) => c.id === controllerId);

  const handleRandomizeSeed = () => {
    setSharedSeed(Math.floor(Math.random() * 10000));
  };

  const handleRunPatientComparison = async (overrideA = null, overrideB = null) => {
    const pA = overrideA || patientAName;
    const pB = overrideB || patientBName;
    if (!pA || !pB) return;

    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        patient_a_name: pA,
        patient_b_name: pB,
        controller_id: controllerId,
        controller_params: ctrlParams,
        meals: meals,
        sensor: simParams?.sensor || 'GuardianRT',
        pump: simParams?.pump || 'Insulet',
        seed: sharedSeed,
        duration_hours: simParams?.duration_hours || 24,
        start_time_hour: simParams?.start_time_hour || 0,
        sensor_noise: simParams?.sensor_noise ?? true,
      };

      const result = await runPatientComparison(payload);
      setCompareResult(result);
    } catch (err) {
      setError(err.message || 'Patient comparison simulation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial comparison when patients are loaded
  useEffect(() => {
    if (patients.length >= 2 && !compareResult) {
      handleRunPatientComparison();
    }
  }, [patients]);

  const cohorts = ['Adult', 'Adolescent', 'Child'];

  return (
    <div className="space-y-6">
      {/* Top Row: Responsive Row of Configuration Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Box 1: Dual Patient Selector Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Users className="w-4 h-4 text-brand-crimson" />
            <h3 className="font-semibold text-slate-900 text-sm">Select Two Virtual Patients</h3>
          </div>

          {/* Patient A Selector (Teal) */}
          <div className="p-3 bg-teal-50/40 border border-teal-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                Patient A (Teal Trace)
              </span>
              <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                {patientA?.cohort} #{patientA?.subject_index + 1}
              </span>
            </div>

            <select
              value={patientAName}
              onChange={(e) => {
                setPatientAName(e.target.value);
                handleRunPatientComparison(e.target.value, patientBName);
              }}
              className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
            >
              {cohorts.map((cohort) => (
                <optgroup key={cohort} label={`${cohort} Cohort`}>
                  {patients
                    .filter((p) => p.cohort.toLowerCase() === cohort.toLowerCase())
                    .map((p) => (
                      <option key={p.simglucose_name} value={p.simglucose_name}>
                        {p.simglucose_name} (#{p.subject_index + 1}) • {p.age}y, {p.body_weight_kg}kg
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>

            {patientA && (
              <div className="grid grid-cols-4 gap-1 text-[10px] pt-1 text-slate-600">
                <div className="bg-white p-1 rounded border border-teal-100 text-center">
                  <div className="text-slate-400">BW</div>
                  <div className="font-bold text-slate-800">{patientA.body_weight_kg}kg</div>
                </div>
                <div className="bg-white p-1 rounded border border-teal-100 text-center">
                  <div className="text-slate-400">TDI</div>
                  <div className="font-bold text-slate-800">{patientA.tdi}U</div>
                </div>
                <div className="bg-white p-1 rounded border border-teal-100 text-center">
                  <div className="text-slate-400">ICR</div>
                  <div className="font-bold text-brand-teal">1:{patientA.icr}</div>
                </div>
                <div className="bg-white p-1 rounded border border-teal-100 text-center">
                  <div className="text-slate-400">ISF</div>
                  <div className="font-bold text-brand-indigo">1:{patientA.isf}</div>
                </div>
              </div>
            )}
          </div>

          {/* Patient B Selector (Purple) */}
          <div className="p-3 bg-purple-50/40 border border-purple-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                Patient B (Purple Dashed Trace)
              </span>
              <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                {patientB?.cohort} #{patientB?.subject_index + 1}
              </span>
            </div>

            <select
              value={patientBName}
              onChange={(e) => {
                setPatientBName(e.target.value);
                handleRunPatientComparison(patientAName, e.target.value);
              }}
              className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {cohorts.map((cohort) => (
                <optgroup key={cohort} label={`${cohort} Cohort`}>
                  {patients
                    .filter((p) => p.cohort.toLowerCase() === cohort.toLowerCase())
                    .map((p) => (
                      <option key={p.simglucose_name} value={p.simglucose_name}>
                        {p.simglucose_name} (#{p.subject_index + 1}) • {p.age}y, {p.body_weight_kg}kg
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>

            {patientB && (
              <div className="grid grid-cols-4 gap-1 text-[10px] pt-1 text-slate-600">
                <div className="bg-white p-1 rounded border border-purple-100 text-center">
                  <div className="text-slate-400">BW</div>
                  <div className="font-bold text-slate-800">{patientB.body_weight_kg}kg</div>
                </div>
                <div className="bg-white p-1 rounded border border-purple-100 text-center">
                  <div className="text-slate-400">TDI</div>
                  <div className="font-bold text-slate-800">{patientB.tdi}U</div>
                </div>
                <div className="bg-white p-1 rounded border border-purple-100 text-center">
                  <div className="text-slate-400">ICR</div>
                  <div className="font-bold text-purple-700">1:{patientB.icr}</div>
                </div>
                <div className="bg-white p-1 rounded border border-purple-100 text-center">
                  <div className="text-slate-400">ISF</div>
                  <div className="font-bold text-purple-900">1:{patientB.isf}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Box 2: Shared Controller & Algorithm Setup Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="w-4 h-4 text-brand-indigo" />
            <h3 className="font-semibold text-slate-900 text-sm">Shared Algorithm & Environment</h3>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Active Controller
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
            onClick={() => handleRunPatientComparison()}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-brand-crimson hover:bg-brand-crimsonHover text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span>Simulating Both Patients...</span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Compare Patients on Same Diet</span>
              </>
            )}
          </button>

          {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
        </div>

        {/* Box 3: Shared Meal Protocol Table */}
        <MealProtocolTable
          meals={meals}
          onChangeMeals={onChangeMeals}
          onSelectPreset={onSelectPreset}
        />
      </div>

      {/* Bottom Section: Comparative Charts & Metrics */}
      <div className="space-y-5">
        <SimulationChart
          simData={compareResult?.run_a}
          compareData={compareResult?.run_b}
          title={`Patient A: ${patientA?.cohort} #${patientA?.subject_index + 1} (${patientA?.simglucose_name}) vs Patient B: ${patientB?.cohort} #${patientB?.subject_index + 1} (${patientB?.simglucose_name})`}
        />

        <ClinicalMetricsGrid
          metrics={compareResult?.run_a?.metrics}
          metricsB={compareResult?.run_b?.metrics}
        />
      </div>
    </div>
  );
}
