import React from 'react';
import { Play, Sparkles, AlertCircle, Sliders } from 'lucide-react';
import PatientCard from '../components/PatientCard';
import MealProtocolTable from '../components/MealProtocolTable';
import SimParamsDrawer from '../components/SimParamsDrawer';
import SimulationChart from '../components/SimulationChart';
import ClinicalMetricsGrid from '../components/ClinicalMetricsGrid';
import ControllerParamsEditor from '../components/ControllerParamsEditor';

export default function SimulatePage({
  patients,
  selectedPatient,
  onSelectPatient,
  controllers,
  selectedController,
  onSelectController,
  controllerParams = {},
  onChangeControllerParams,
  meals,
  onChangeMeals,
  onSelectPreset,
  simParams,
  onChangeSimParams,
  simResult,
  isLoading,
  error,
  onRunSimulation,
}) {
  const [isParamsOpen, setIsParamsOpen] = React.useState(false);
  const activeCtrl = controllers.find((c) => c.id === selectedController);

  return (
    <div className="space-y-6">
      {/* Top Row: Responsive Row of Parameter Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {/* Box 1: Patient Profile */}
        <PatientCard
          patients={patients}
          selectedPatient={selectedPatient}
          onSelectPatient={onSelectPatient}
        />

        {/* Box 2: Controller Selector & Tuning Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Active Controller
            </label>
            <select
              value={selectedController}
              onChange={(e) => onSelectController(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-crimson/30 focus:border-brand-crimson"
            >
              {controllers.map((ctrl) => (
                <option key={ctrl.id} value={ctrl.id}>
                  {ctrl.display_name} ({ctrl.category})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">
              {activeCtrl?.description}
            </p>
          </div>

          {/* Algorithm-Specific Tuning Parameters (Scalable) */}
          {activeCtrl && (
            <ControllerParamsEditor
              controller={activeCtrl}
              values={controllerParams}
              onChange={onChangeControllerParams}
              compact={true}
            />
          )}

          <button
            type="button"
            onClick={onRunSimulation}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-brand-crimson hover:bg-brand-crimsonHover text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Simulating UVA/Padova ODEs...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Simulation</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Box 3: Meal Protocol Input Card with Embedded Presets */}
        <MealProtocolTable
          meals={meals}
          onChangeMeals={onChangeMeals}
          onSelectPreset={onSelectPreset}
        />
      </div>

      {/* Environment Parameters Collapsible Drawer */}
      <SimParamsDrawer
        params={simParams}
        onChangeParams={onChangeSimParams}
        isOpen={isParamsOpen}
        onToggle={() => setIsParamsOpen(!isParamsOpen)}
      />

      {/* Bottom Section: Full-Width Chart & Clinical Metrics Results */}
      <div className="space-y-5">
        {/* Dual Panel Synchronized Chart */}
        <SimulationChart
          simData={simResult}
          title={`${selectedPatient?.simglucose_name || 'Patient'} (${selectedPatient?.cohort} #${(selectedPatient?.subject_index ?? 0) + 1}) • Glycemic & Insulin Dynamics`}
        />

        {/* Clinical Metric Summary Cards */}
        <ClinicalMetricsGrid metrics={simResult?.metrics} />
      </div>
    </div>
  );
}
